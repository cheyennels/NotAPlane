import { useEffect, useRef, useState } from "react";
import {
  appendFlightPosition,
  FlightTrail,
} from "../components/map/flightsGeoJson";
import { flightCacheKey, readFlightCache } from "../lib/flightCache";
import { estimateFlightTrail } from "../lib/flightTrailEstimate";
import { getMockFlightPath, getMockFlightsInArea, isMockFlightsActive } from "../lib/mockFlights";
import {
  getBoundingBox,
  getFlightPath,
  getFlightsInArea,
  OpenSkyFlight,
} from "../lib/opensky";

// Poll every 30s. The opensky-proxy caches responses, so this keeps OpenSky
// load low and avoids the retry storm that gets the account rate-limited.
const FLIGHT_REFRESH_INTERVAL_MS = 30_000;
const STATES_BACKOFF_BASE_MS = 60_000;
const STATES_BACKOFF_MAX_MS = 600_000;
const TRACK_FETCH_INTERVAL_MS = 30_000;
const TRACK_REFRESH_MS = 300_000;
const TRACK_BACKOFF_MS = 300_000;
const TRACK_RETRY_MS = 15_000;
const TRACK_SESSION_TTL_MS = 1_800_000;
const TRACK_SESSION_PREFIX = "notaplane-track:";
const TRACK_FETCH_CONCURRENCY = 4;

type TrailSource = "opensky" | "mock" | "estimated";

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
      source: parsed.source ?? "estimated",
      fetchedAt: parsed.fetchedAt,
    };
  } catch {
    return null;
  }
}

function writeSessionTrack(entry: HistoricalPathEntry, icao24: string) {
  if (typeof sessionStorage === "undefined") return;

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

/** Extend known full tracks (OpenSky/mock) with the latest live position. */
function extendLivePositions(
  flights: OpenSkyFlight[],
  historicalPaths: Map<string, HistoricalPathEntry>,
) {
  for (const flight of flights) {
    const id = normalizeIcao(flight.icao24);
    const existing = historicalPaths.get(id);
    if (!existing || existing.source === "estimated") continue;

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

    if (now - lastAttempt < TRACK_RETRY_MS) return false;
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
      continue;
    }

    const estimated = estimateFlightTrail(flight);
    if (estimated.length >= 2) {
      historicalPaths.set(id, {
        coordinates: estimated,
        source: "estimated",
        fetchedAt: Date.now(),
      });
    }
  }
}

function refreshEstimatedPaths(
  flights: OpenSkyFlight[],
  historicalPaths: Map<string, HistoricalPathEntry>,
) {
  if (isMockFlightsActive()) return;

  for (const flight of flights) {
    const id = normalizeIcao(flight.icao24);
    const existing = historicalPaths.get(id);
    if (existing?.source !== "estimated") continue;

    const estimated = estimateFlightTrail(flight);
    if (estimated.length >= 2) {
      historicalPaths.set(id, {
        coordinates: estimated,
        source: "estimated",
        fetchedAt: existing.fetchedAt,
      });
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
  const statesBackoffCountRef = useRef(0);
  const trackBackoffUntilRef = useRef(0);
  const trackFetchInFlightRef = useRef(false);
  const flightsRef = useRef<OpenSkyFlight[]>([]);
  const usingMockRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      historicalPathsRef.current = new Map();
      trackAttemptedAtRef.current = new Map();
      statesBackoffUntilRef.current = 0;
      statesBackoffCountRef.current = 0;
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
      refreshEstimatedPaths(nextFlights, historicalPathsRef.current);
      extendLivePositions(nextFlights, historicalPathsRef.current);
      setFlightTrails(
        buildFlightTrails(nextFlights, historicalPathsRef.current),
      );
    }

    function trailSourceFromResult(result: {
      mock?: boolean;
      estimated?: boolean;
    }): TrailSource {
      if (result.mock) return "mock";
      if (result.estimated) return "estimated";
      return "opensky";
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
              const result = await getFlightPath(id, trackTime, flight);
              return { id, result };
            }),
          );

          for (const { id, result } of results) {
            trackAttemptedAtRef.current.set(id, Date.now());

            if (result.status === 429 && result.coordinates.length < 2) {
              trackBackoffUntilRef.current = Date.now() + TRACK_BACKOFF_MS;
              continue;
            }

            if (result.coordinates.length >= 2) {
              if (result.status === 429) {
                trackBackoffUntilRef.current = Date.now() + TRACK_BACKOFF_MS;
              }
              storeHistoricalPath(
                id,
                result.coordinates,
                trailSourceFromResult(result),
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
            const count = statesBackoffCountRef.current;
            const backoff = Math.min(
              STATES_BACKOFF_BASE_MS * Math.pow(2, count),
              STATES_BACKOFF_MAX_MS,
            );
            statesBackoffUntilRef.current = now + backoff;
            statesBackoffCountRef.current = count + 1;
            console.info(
              `OpenSky rate limited — retrying in ${Math.round(backoff / 1000)}s (attempt ${count + 1})`,
            );
          }
          hydrateHistoricalPaths(data, historicalPathsRef.current);
          setFlights(data);
          syncTrails(data);
          return;
        }

        // Successful real response — reset backoff streak.
        statesBackoffCountRef.current = 0;
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
        await fetchAllHistoricalPaths();
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
      void fetchAllHistoricalPaths();
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
