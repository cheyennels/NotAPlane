import AsyncStorage from "@react-native-async-storage/async-storage";

export const FLIGHT_TRACK_CACHE_TTL_MS = 3_600_000;

type CachedTrack = {
  coordinates: [number, number][];
  source: "opensky" | "mock" | "estimated";
  fetchedAt: number;
};

const STORAGE_PREFIX = "notaplane-track-cache:";
const memoryCache = new Map<string, CachedTrack>();

export function flightTrackCacheKey(icao24: string): string {
  return icao24.toLowerCase();
}

export async function readFlightTrackCache(
  icao24: string,
): Promise<CachedTrack | null> {
  const key = flightTrackCacheKey(icao24);
  const fromMemory = memoryCache.get(key);
  if (fromMemory && Date.now() - fromMemory.fetchedAt <= FLIGHT_TRACK_CACHE_TTL_MS) {
    return fromMemory;
  }

  try {
    const raw = await AsyncStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CachedTrack;
    if (
      !parsed.coordinates ||
      parsed.coordinates.length < 2 ||
      Date.now() - parsed.fetchedAt > FLIGHT_TRACK_CACHE_TTL_MS
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

export async function writeFlightTrackCache(
  icao24: string,
  coordinates: [number, number][],
  source: CachedTrack["source"],
): Promise<void> {
  const key = flightTrackCacheKey(icao24);
  const entry: CachedTrack = { coordinates, source, fetchedAt: Date.now() };
  memoryCache.set(key, entry);

  try {
    await AsyncStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(entry));
  } catch {
    // Ignore quota errors.
  }
}
