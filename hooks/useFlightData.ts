import { useEffect, useRef, useState } from "react";
import {
  appendFlightPosition,
  FlightTrail,
} from "../components/map/flightsGeoJson";
import { flightCacheKey, readFlightCache } from "../lib/flightCache";
import { getMockFlightPath, getMockFlightsInArea, isMockFlightsActive } from "../lib/mockFlights";
import {
  getBoundingBox,
  getFlightPath,
  getFlightsInArea,
  OpenSkyFlight,
} from "../lib/opensky";

// Poll the map every 10s; the /api/opensky route caches responses for 25s so
// OpenSky typically sees one request per ~30s, not every poll.
const FLIGHT_REFRESH_INTERVAL_MS = 10_000;
const STATES_BACKOFF_MS = 60_000;
const TRACK_FETCH_INTERVAL_MS = 45_000;
const TRACK_REFRESH_MS = 300_000;
const TRACK_BACKOFF_MS = 300_000;
const TRACK_RETRY_MS = 30_000;
const TRACK_SESSION_TTL_MS = 1_800_000;
const TRACK_SESSION_PREFIX = "notaplane-track:";
const TRACK_FETCH_CONCURRENCY = 2;

type TrailSource = "opensky" | "mock" | "accumulated";

type HistoricalPathEntry = {
  coordinates: [number, number][];
  source: TrailSource;
  fetchedAt: number;
};

function normalizeIcao(icao24: string): string {
  return icao24.toLowerCase();
}

function readSessionTrack(icao24: string): HistoricalPathEntry | null {
  if (typeof sessionStorage === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(`${TRACK_SESSION_PREFIX}${icao24}`);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as {
      coordinates: [number, number][];
      fetchedAt: number;
      source?: TrailSource;
    };

    if (Date.now() - parsed.fetchedAt > TRACK_SESSION_TTL_MS) {
      sessionStorage.removeItem(`${TRACK_SESSION_PREFIX}${icao24}`);
      return null;
    }

    if (!parsed.coordinates || parsed.coordinates.length < 2) return null;

    return {
      coordinates: parsed.coordinates,
      source: parsed.source ?? "accumulated",
      fetchedAt: parsed.fetchedAt,
    };
  } catch {
    return null;
  }
}

function writeSessionTrack(entry: HistoricalPathEntry, icao24: string) {
  if (typeof sessionStorage === "undefined") return;
  if (entry.source === "accumulated") return;

  try {
    sessionStorage.setItem(
      `${TRACK_SESSION_PREFIX}${icao24}`,
      JSON.stringify({
        coordinates: entry.coordinates,
        source: entry.source,
        fetchedAt: entry.fetchedAt,
      }),
    );
  } catch {
    // Ignore quota errors.
  }
}

function buildFlightTrails(
  flights: OpenSkyFlight[],
  historicalPaths: Map<string, HistoricalPathEntry>,
): FlightTrail[] {
  return flights
    .map((flight) => {
      const id = normalizeIcao(flight.icao24);
      const historical = historicalPaths.get(id);
      if (!historical || historical.coordinates.length < 2) return null;

      return {
        icao24: flight.icao24,
        coordinates: historical.coordinates,
      };
    })
    .filter((trail): trail is FlightTrail => trail !== null);
}

function appendCurrentPosition(
  flights: OpenSkyFlight[],
  historicalPaths: Map<string, HistoricalPathEntry>,
) {
  for (const flight of flights) {
    const id = normalizeIcao(flight.icao24);
    const existing = historicalPaths.get(id);

    if (!existing) {
      historicalPaths.set(id, {
        coordinates: [[flight.longitude, flight.latitude]],
        source: "accumulated",
        fetchedAt: Date.now(),
      });
      continue;
    }

    historicalPaths.set(id, {
      ...existing,
      coordinates: appendFlightPosition(existing.coordinates, flight),
    });
  }
}

function pickPendingTrackFlights(
  flights: OpenSkyFlight[],
  historicalPaths: Map<string, HistoricalPathEntry>,
  trackAttemptedAt: Map<string, number>,
  now: number,
): OpenSkyFlight[] {
  return flights.filter((flight) => {
    const id = normalizeIcao(flight.icao24);
    const lastAttempt = trackAttemptedAt.get(id) ?? 0;
    const entry = historicalPaths.get(id);

    if (entry?.source === "opensky") {
      if (now - entry.fetchedAt < TRACK_REFRESH_MS) return false;
      if (now - lastAttempt < TRACK_REFRESH_MS) return false;
      return true;
    }

    const retryInterval = TRACK_RETRY_MS;
    if (now - lastAttempt < retryInterval) return false;
    return true;
  });
}

function hydrateHistoricalPaths(
  flights: OpenSkyFlight[],
  historicalPaths: Map<string, HistoricalPathEntry>,
) {
  for (const flight of flights) {
    const id = normalizeIcao(flight.icao24);
    if (historicalPaths.has(id)) continue;

    const cached = readSessionTrack(id);
    if (cached) {
      historicalPaths.set(id, cached);
      continue;
    }

    if (isMockFlightsActive()) {
      const mockPath = getMockFlightPath(id);
      if (mockPath && mockPath.length >= 2) {
        historicalPaths.set(id, {
          coordinates: mockPath,
          source: "mock",
          fetchedAt: Date.now(),
        });
      }
    }
  }
}

function refreshMockPaths(
  flights: OpenSkyFlight[],
  historicalPaths: Map<string, HistoricalPathEntry>,
) {
  if (!isMockFlightsActive()) return;

  for (const flight of flights) {
    const id = normalizeIcao(flight.icao24);
    const mockPath = getMockFlightPath(id);
    if (mockPath && mockPath.length >= 2) {
      historicalPaths.set(id, {
        coordinates: mockPath,
        source: "mock",
        fetchedAt: Date.now(),
      });
    }
  }
}

export function useNearbyFlights(
  latitude: number,
  longitude: number,
  radiusKm: number = 50,
  enabled: boolean = true,
) {
  const [flights, setFlights] = useState<OpenSkyFlight[]>([]);
  const [flightTrails, setFlightTrails] = useState<FlightTrail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingMock, setUsingMock] = useState(false);
  const [usingCached, setUsingCached] = useState(false);
  const historicalPathsRef = useRef<Map<string, HistoricalPathEntry>>(new Map());
  const trackAttemptedAtRef = useRef<Map<string, number>>(new Map());
  const statesBackoffUntilRef = useRef(0);
  const trackBackoffUntilRef = useRef(0);
  const trackFetchInFlightRef = useRef(false);
  const flightsRef = useRef<OpenSkyFlight[]>([]);
  const usingMockRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      historicalPathsRef.current = new Map();
      trackAttemptedAtRef.current = new Map();
      statesBackoffUntilRef.current = 0;
      trackBackoffUntilRef.current = 0;
      trackFetchInFlightRef.current = false;
      flightsRef.current = [];
      setFlights([]);
      setFlightTrails([]);
      setLoading(false);
      setError(null);
      setUsingMock(false);
      setUsingCached(false);
      usingMockRef.current = false;
      return;
    }

    if (!latitude || !longitude) return;

    let cancelled = false;
    const isCancelled = () => cancelled;

    function syncTrails(nextFlights: OpenSkyFlight[]) {
      flightsRef.current = nextFlights;
      refreshMockPaths(nextFlights, historicalPathsRef.current);
      appendCurrentPosition(nextFlights, historicalPathsRef.current);
      setFlightTrails(
        buildFlightTrails(nextFlights, historicalPathsRef.current),
      );
    }

    function storeHistoricalPath(
      id: string,
      coordinates: [number, number][],
      source: TrailSource,
    ) {
      const flight = flightsRef.current.find(
        (candidate) => normalizeIcao(candidate.icao24) === id,
      );
      const merged = flight
        ? appendFlightPosition(coordinates, flight)
        : coordinates;
      const entry: HistoricalPathEntry = {
        coordinates: merged,
        source,
        fetchedAt: Date.now(),
      };
      historicalPathsRef.current.set(id, entry);
      writeSessionTrack(entry, id);
      syncTrails(flightsRef.current);
    }

    async function fetchAllHistoricalPaths() {
      if (trackFetchInFlightRef.current || isMockFlightsActive()) return;

      const now = Date.now();
      if (now < trackBackoffUntilRef.current) return;

      const pending = pickPendingTrackFlights(
        flightsRef.current,
        historicalPathsRef.current,
        trackAttemptedAtRef.current,
        now,
      );
      if (pending.length === 0) return;

      trackFetchInFlightRef.current = true;

      try {
        for (let i = 0; i < pending.length; i += TRACK_FETCH_CONCURRENCY) {
          if (isCancelled()) return;

          const batch = pending.slice(i, i + TRACK_FETCH_CONCURRENCY);
          const results = await Promise.all(
            batch.map(async (flight) => {
              const id = normalizeIcao(flight.icao24);
              const trackTime =
                flight.last_contact > 0 ? flight.last_contact : 0;
              const result = await getFlightPath(id, trackTime);
              return { id, result };
            }),
          );

          for (const { id, result } of results) {
            trackAttemptedAtRef.current.set(id, Date.now());

            if (result.status === 429) {
              trackBackoffUntilRef.current = Date.now() + TRACK_BACKOFF_MS;
              return;
            }

            if (result.coordinates.length >= 2) {
              storeHistoricalPath(
                id,
                result.coordinates,
                result.mock ? "mock" : "opensky",
              );
            }
          }
        }
      } finally {
        trackFetchInFlightRef.current = false;
      }
    }

    async function fetchPositions() {
      const now = Date.now();
      const box = getBoundingBox(latitude, longitude, radiusKm);

      if (now < statesBackoffUntilRef.current) {
        if (usingMockRef.current) {
          const data = getMockFlightsInArea(
            box.minLat,
            box.maxLat,
            box.minLng,
            box.maxLng,
          );
          if (isCancelled()) return;
          hydrateHistoricalPaths(data, historicalPathsRef.current);
          setFlights(data);
          syncTrails(data);
        }
        return;
      }

      setLoading(true);
      try {
        const { flights: data, status, mock, cached, rateLimited } =
          await getFlightsInArea(
            box.minLat,
            box.maxLat,
            box.minLng,
            box.maxLng,
          );
        if (isCancelled()) return;

        if (mock) {
          usingMockRef.current = true;
          setUsingMock(true);
          setUsingCached(false);
          setError(null);
          if (rateLimited) {
            statesBackoffUntilRef.current = now + STATES_BACKOFF_MS;
          }
          hydrateHistoricalPaths(data, historicalPathsRef.current);
          setFlights(data);
          syncTrails(data);
          return;
        }

        usingMockRef.current = false;
        setUsingMock(false);
        setUsingCached(Boolean(cached));

        if (data.length === 0 && status !== 200 && status !== 0) {
          setError("Failed to load flight data");
          return;
        }

        setError(null);
        hydrateHistoricalPaths(data, historicalPathsRef.current);
        setFlights(data);
        syncTrails(data);
        void fetchAllHistoricalPaths();
      } catch {
        if (!isCancelled()) setError("Failed to load flight data");
      } finally {
        if (!isCancelled()) setLoading(false);
      }
    }

    async function loadCachedSnapshot() {
      const box = getBoundingBox(latitude, longitude, radiusKm);
      const cached = await readFlightCache(
        flightCacheKey(box.minLat, box.maxLat, box.minLng, box.maxLng),
      );
      if (isCancelled() || !cached || cached.flights.length === 0) return;

      usingMockRef.current = false;
      setUsingMock(false);
      setUsingCached(true);
      setError(null);
      hydrateHistoricalPaths(cached.flights, historicalPathsRef.current);
      setFlights(cached.flights);
      syncTrails(cached.flights);
    }

    void loadCachedSnapshot();
    fetchPositions();
    void fetchAllHistoricalPaths();
    const positionsInterval = setInterval(
      fetchPositions,
      FLIGHT_REFRESH_INTERVAL_MS,
    );
    const tracksInterval = setInterval(
      fetchAllHistoricalPaths,
      TRACK_FETCH_INTERVAL_MS,
    );

    return () => {
      cancelled = true;
      clearInterval(positionsInterval);
      clearInterval(tracksInterval);
    };
  }, [latitude, longitude, radiusKm, enabled]);

  return { flights, flightTrails, loading, error, usingMock, usingCached };
}
