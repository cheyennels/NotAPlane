import { useEffect, useRef, useState } from "react";
import {
  appendFlightPosition,
  FlightTrail,
} from "../components/map/flightsGeoJson";
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
const TRACK_RETRY_MS = 120_000;
const TRACK_SESSION_TTL_MS = 1_800_000;
const TRACK_SESSION_PREFIX = "notaplane-track:";

function normalizeIcao(icao24: string): string {
  return icao24.toLowerCase();
}

function readSessionTrack(
  icao24: string,
): [number, number][] | null {
  if (typeof sessionStorage === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(`${TRACK_SESSION_PREFIX}${icao24}`);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as {
      coordinates: [number, number][];
      fetchedAt: number;
    };

    if (Date.now() - parsed.fetchedAt > TRACK_SESSION_TTL_MS) {
      sessionStorage.removeItem(`${TRACK_SESSION_PREFIX}${icao24}`);
      return null;
    }

    return parsed.coordinates;
  } catch {
    return null;
  }
}

function writeSessionTrack(icao24: string, coordinates: [number, number][]) {
  if (typeof sessionStorage === "undefined") return;

  try {
    sessionStorage.setItem(
      `${TRACK_SESSION_PREFIX}${icao24}`,
      JSON.stringify({ coordinates, fetchedAt: Date.now() }),
    );
  } catch {
    // Ignore quota errors.
  }
}

function buildFlightTrails(
  flights: OpenSkyFlight[],
  historicalPaths: Map<string, [number, number][]>,
): FlightTrail[] {
  return flights
    .map((flight) => {
      const id = normalizeIcao(flight.icao24);
      const historical = historicalPaths.get(id);
      if (!historical || historical.length < 2) return null;

      return {
        icao24: flight.icao24,
        coordinates: appendFlightPosition(historical, flight),
      };
    })
    .filter((trail): trail is FlightTrail => trail !== null);
}

function pickNextTrackTarget(
  flights: OpenSkyFlight[],
  queueIndex: number,
  historicalPaths: Map<string, [number, number][]>,
  trackAttemptedAt: Map<string, number>,
  now: number,
): { flight: OpenSkyFlight; nextIndex: number } | null {
  if (flights.length === 0) return null;

  for (let offset = 0; offset < flights.length; offset += 1) {
    const index = (queueIndex + offset) % flights.length;
    const flight = flights[index];
    const id = normalizeIcao(flight.icao24);
    const lastAttempt = trackAttemptedAt.get(id) ?? 0;
    const hasHistorical = historicalPaths.has(id);

    if (hasHistorical && now - lastAttempt < TRACK_REFRESH_MS) continue;
    if (!hasHistorical && now - lastAttempt < TRACK_RETRY_MS) continue;

    return { flight, nextIndex: index + 1 };
  }

  return null;
}

function hydrateHistoricalPaths(
  flights: OpenSkyFlight[],
  historicalPaths: Map<string, [number, number][]>,
) {
  for (const flight of flights) {
    const id = normalizeIcao(flight.icao24);
    if (historicalPaths.has(id)) continue;

    const cached = readSessionTrack(id);
    if (cached && cached.length >= 2) {
      historicalPaths.set(id, cached);
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
  const historicalPathsRef = useRef<Map<string, [number, number][]>>(new Map());
  const trackAttemptedAtRef = useRef<Map<string, number>>(new Map());
  const statesBackoffUntilRef = useRef(0);
  const trackBackoffUntilRef = useRef(0);
  const lastTrackFetchAtRef = useRef(0);
  const trackQueueIndexRef = useRef(0);
  const trackFetchInFlightRef = useRef(false);
  const flightsRef = useRef<OpenSkyFlight[]>([]);

  useEffect(() => {
    if (!enabled) {
      historicalPathsRef.current = new Map();
      trackAttemptedAtRef.current = new Map();
      statesBackoffUntilRef.current = 0;
      trackBackoffUntilRef.current = 0;
      lastTrackFetchAtRef.current = 0;
      trackQueueIndexRef.current = 0;
      trackFetchInFlightRef.current = false;
      flightsRef.current = [];
      setFlights([]);
      setFlightTrails([]);
      setLoading(false);
      setError(null);
      return;
    }

    if (!latitude || !longitude) return;

    let cancelled = false;
    const isCancelled = () => cancelled;

    function syncTrails(nextFlights: OpenSkyFlight[]) {
      flightsRef.current = nextFlights;
      setFlightTrails(buildFlightTrails(nextFlights, historicalPathsRef.current));
    }

    function storeHistoricalPath(id: string, coordinates: [number, number][]) {
      historicalPathsRef.current.set(id, coordinates);
      writeSessionTrack(id, coordinates);
      syncTrails(flightsRef.current);
    }

    async function fetchNextHistoricalPath() {
      if (trackFetchInFlightRef.current) return;

      const now = Date.now();
      if (now < trackBackoffUntilRef.current) return;
      if (
        lastTrackFetchAtRef.current !== 0 &&
        now - lastTrackFetchAtRef.current < TRACK_FETCH_INTERVAL_MS
      ) {
        return;
      }

      const nextFlights = flightsRef.current;
      const target = pickNextTrackTarget(
        nextFlights,
        trackQueueIndexRef.current,
        historicalPathsRef.current,
        trackAttemptedAtRef.current,
        now,
      );
      if (!target) return;

      trackQueueIndexRef.current = target.nextIndex;
      trackFetchInFlightRef.current = true;
      lastTrackFetchAtRef.current = now;

      const id = normalizeIcao(target.flight.icao24);

      try {
        // time=0 returns the full live track from OpenSky's /tracks endpoint.
        const result = await getFlightPath(id, 0);
        if (isCancelled()) return;

        trackAttemptedAtRef.current.set(id, now);

        if (result.status === 429) {
          trackBackoffUntilRef.current = now + TRACK_BACKOFF_MS;
          return;
        }

        if (result.coordinates.length >= 2) {
          storeHistoricalPath(id, result.coordinates);
        }
      } finally {
        trackFetchInFlightRef.current = false;
      }
    }

    async function fetchPositions() {
      const now = Date.now();
      if (now < statesBackoffUntilRef.current) return;

      setLoading(true);
      try {
        const box = getBoundingBox(latitude, longitude, radiusKm);
        const { flights: data, status } = await getFlightsInArea(
          box.minLat,
          box.maxLat,
          box.minLng,
          box.maxLng,
        );
        if (isCancelled()) return;

        if (status === 429) {
          statesBackoffUntilRef.current = now + STATES_BACKOFF_MS;
          setError("Flights are limited currently");
          return;
        }

        if (status !== 200 && status !== 0) {
          setError("Failed to load flight data");
          return;
        }

        setError(null);
        hydrateHistoricalPaths(data, historicalPathsRef.current);
        setFlights(data);
        syncTrails(data);
        void fetchNextHistoricalPath();
      } catch {
        if (!isCancelled()) setError("Failed to load flight data");
      } finally {
        if (!isCancelled()) setLoading(false);
      }
    }

    fetchPositions();
    const positionsInterval = setInterval(
      fetchPositions,
      FLIGHT_REFRESH_INTERVAL_MS,
    );
    const tracksInterval = setInterval(
      fetchNextHistoricalPath,
      TRACK_FETCH_INTERVAL_MS,
    );

    return () => {
      cancelled = true;
      clearInterval(positionsInterval);
      clearInterval(tracksInterval);
    };
  }, [latitude, longitude, radiusKm, enabled]);

  return { flights, flightTrails, loading, error };
}
