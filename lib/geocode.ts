import { getMapboxAccessToken } from "./mapbox";

export type Coords = { latitude: number; longitude: number };

/**
 * Resolve a free-text place (e.g. "Seattle, WA") to coordinates via the Mapbox
 * geocoding API, reusing the public `pk` token. Returns null when the place
 * can't be found or no token is configured.
 */
export async function geocodeLocation(query: string): Promise<Coords | null> {
  const token = getMapboxAccessToken();
  const q = query.trim();
  if (!token || !q) return null;

  try {
    const url =
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json` +
      `?access_token=${token}&limit=1&types=place,region,postcode,locality,district`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    const center = data?.features?.[0]?.center;
    if (Array.isArray(center) && center.length === 2) {
      const [longitude, latitude] = center;
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        return { latitude: Number(latitude), longitude: Number(longitude) };
      }
    }
    return null;
  } catch {
    return null;
  }
}
