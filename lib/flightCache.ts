import AsyncStorage from "@react-native-async-storage/async-storage";
import { OpenSkyFlight } from "./opensky";

const STORAGE_PREFIX = "notaplane-flights:";
/** How long cached API snapshots remain usable when live fetches fail. */
export const FLIGHT_CACHE_TTL_MS = 1_800_000;

type CachedFlights = {
  flights: OpenSkyFlight[];
  fetchedAt: number;
};

const memoryCache = new Map<string, CachedFlights>();

export function flightCacheKey(
  minLat: number,
  maxLat: number,
  minLng: number,
  maxLng: number,
): string {
  return `${minLat.toFixed(3)},${minLng.toFixed(3)},${maxLat.toFixed(3)},${maxLng.toFixed(3)}`;
}

export async function readFlightCache(
  key: string,
): Promise<CachedFlights | null> {
  const fromMemory = memoryCache.get(key);
  if (fromMemory && Date.now() - fromMemory.fetchedAt <= FLIGHT_CACHE_TTL_MS) {
    return fromMemory;
  }

  try {
    const raw = await AsyncStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CachedFlights;
    if (
      !parsed.flights ||
      Date.now() - parsed.fetchedAt > FLIGHT_CACHE_TTL_MS
    ) {
      await AsyncStorage.removeItem(`${STORAGE_PREFIX}${key}`);
      memoryCache.delete(key);
      return null;
    }

    memoryCache.set(key, parsed);
    return parsed;
  } catch {
    return null;
  }
}

export async function writeFlightCache(
  key: string,
  flights: OpenSkyFlight[],
): Promise<void> {
  const entry: CachedFlights = { flights, fetchedAt: Date.now() };
  memoryCache.set(key, entry);

  try {
    await AsyncStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(entry));
  } catch {
    // Ignore quota errors — in-memory cache still works this session.
  }
}

// The most recent successful real fetch, kept separately from the per-box cache
// so we can show real (not demo) flights anywhere they overlap the current
// viewport — even after the user pans to a box we never fetched exactly.
const LATEST_KEY = `${STORAGE_PREFIX}latest`;
let latestSnapshot: CachedFlights | null = null;

export async function writeLatestFlights(
  flights: OpenSkyFlight[],
): Promise<void> {
  if (flights.length === 0) return;
  const entry: CachedFlights = { flights, fetchedAt: Date.now() };
  latestSnapshot = entry;
  try {
    await AsyncStorage.setItem(LATEST_KEY, JSON.stringify(entry));
  } catch {
    // Ignore quota errors — the in-memory snapshot still works this session.
  }
}

/** Real flights from the last successful fetch that fall inside the given box,
 *  or null when there is no fresh snapshot or nothing overlaps. */
export async function readLatestFlightsInBox(
  minLat: number,
  maxLat: number,
  minLng: number,
  maxLng: number,
): Promise<OpenSkyFlight[] | null> {
  let snapshot = latestSnapshot;
  if (!snapshot) {
    try {
      const raw = await AsyncStorage.getItem(LATEST_KEY);
      if (raw) snapshot = JSON.parse(raw) as CachedFlights;
    } catch {
      return null;
    }
  }
  if (!snapshot || Date.now() - snapshot.fetchedAt > FLIGHT_CACHE_TTL_MS) {
    return null;
  }
  latestSnapshot = snapshot;

  const inBox = snapshot.flights.filter(
    (f) =>
      f.latitude >= minLat &&
      f.latitude <= maxLat &&
      f.longitude >= minLng &&
      f.longitude <= maxLng,
  );
  return inBox.length > 0 ? inBox : null;
}
