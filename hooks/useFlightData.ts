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
const TRACK_FETCH_INTERVAL_MS = 30_000;
const TRACK_BACKOFF_MS = 120_000;
const TRACK_RETRY_MS = 300_000;
const MAX_FALLBACK_TRAIL_POINTS = 36;
const MIN_TRAIL_DISTANCE_DEG = 0.00003;

function distanceBetween(
  a: [number, number],
  b: [number, number],
): number {
  const dLng = a[0] - b[0];
  const dLat = a[1] - b[1];
  return Math.sqrt(dLng * dLng + dLat * dLat);
}

function updateFallbackTrails(
  trails: Map<string, [number, number][]>,
  flights: OpenSkyFlight[],
): Map<string, [number, number][]> {
  const next = new Map(trails);
  const activeIds = new Set<string>();

  for (const flight of flights) {
    activeIds.add(flight.icao24);
    const point: [number, number] = [flight.longitude, flight.latitude];
    const history = next.get(flight.icao24) ?? [];
    const last = history[history.length - 1];
    const moved =
      !last || distanceBetween(last, point) >= MIN_TRAIL_DISTANCE_DEG;
    const updated = moved
      ? [...history, point].slice(-MAX_FALLBACK_TRAIL_POINTS)
      : history;
    next.set(flight.icao24, updated);
  }

  for (const icao24 of next.keys()) {
    if (!activeIds.has(icao24)) next.delete(icao24);
  }

  return next;
}

function buildFlightTrails(
  flights: OpenSkyFlight[],
  historicalPaths: Map<string, [number, number][]>,
  fallbackTrails: Map<string, [number, number][]>,
): FlightTrail[] {
  return flights
    .map((flight) => {
      const historical = historicalPaths.get(flight.icao24);
      const fallback = fallbackTrails.get(flight.icao24) ?? [];

      const historicalPath = historical
        ? appendFlightPosition(historical, flight)
        : [];
      const fallbackPath = fallback.length
        ? appendFlightPosition(fallback, flight)
        : [[flight.longitude, flight.latitude] as [number, number]];

      const coordinates =
        historicalPath.length >= fallbackPath.length
          ? historicalPath
          : fallbackPath;

      return { icao24: flight.icao24, coordinates };
    })
    .filter((trail) => trail.coordinates.length >= 2);
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
    if (historicalPaths.has(flight.icao24)) continue;

    const lastAttempt = trackAttemptedAt.get(flight.icao24) ?? 0;
    if (now - lastAttempt < TRACK_RETRY_MS) continue;

    return { flight, nextIndex: index + 1 };
  }

  return null;
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
  const fallbackTrailsRef = useRef<Map<string, [number, number][]>>(new Map());
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
      fallbackTrailsRef.current = new Map();
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
      setFlightTrails(
        buildFlightTrails(
          nextFlights,
          historicalPathsRef.current,
          fallbackTrailsRef.current,
        ),
      );
    }

    async function fetchNextHistoricalPath() {
      if (trackFetchInFlightRef.current) return;
      if (Date.now() < statesBackoffUntilRef.current) return;

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

      try {
        const result = await getFlightPath(
          target.flight.icao24,
          Math.floor(now / 1000),
        );
        if (isCancelled()) return;

        trackAttemptedAtRef.current.set(target.flight.icao24, now);

        if (result.status === 429) {
          trackBackoffUntilRef.current = now + TRACK_BACKOFF_MS;
          return;
        }

        if (result.coordinates.length >= 2) {
          historicalPathsRef.current.set(
            target.flight.icao24,
            result.coordinates,
          );
          const existing =
            fallbackTrailsRef.current.get(target.flight.icao24) ?? [];
          if (result.coordinates.length >= existing.length) {
            fallbackTrailsRef.current.set(target.flight.icao24, [
              ...result.coordinates,
            ]);
          }
          syncTrails(flightsRef.current);
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
          setError("Flight data rate limited — showing last known positions");
          return;
        }

        if (status !== 200 && status !== 0) {
          setError("Failed to load flight data");
          return;
        }

        setError(null);
        fallbackTrailsRef.current = updateFallbackTrails(
          fallbackTrailsRef.current,
          data,
        );
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
// reduce interval to 2 minutes instead of 30 seconds to save on API calls
    const interval = setInterval(fetch, 120000); // 2 minutes instead of 30 seconds
    // const interval = setInterval(fetchPositions, FLIGHT_REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [latitude, longitude, radiusKm, enabled]);

  return { flights, flightTrails, loading, error };
}
