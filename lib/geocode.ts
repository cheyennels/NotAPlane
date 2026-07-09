import { getMapboxAccessToken } from "./mapbox";

export type Coords = { latitude: number; longitude: number };

type GeoContext = { id?: string; short_code?: string; text?: string };
type GeoFeature = { center?: [number, number]; context?: GeoContext[] };

/**
 * Resolve a free-text place (e.g. "Monroe, WA") to coordinates via the Mapbox
 * geocoding API, reusing the public `pk` token. Returns null when the place
 * can't be found or no token is configured.
 *
 * Mapbox's top hit can ignore the state you typed (e.g. "Monroe, WA" ranks
 * Monroe, GA first), so when the query names a state we prefer the candidate
 * whose region matches it.
 */
export async function geocodeLocation(query: string): Promise<Coords | null> {
  const token = getMapboxAccessToken();
  const q = query.trim();
  if (!token || !q) return null;

  try {
    const url =
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json` +
      `?access_token=${token}&limit=5&types=place,region,postcode,locality,district`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    const features: GeoFeature[] = data?.features ?? [];
    if (features.length === 0) return null;

    let chosen = features[0];

    // Only when the query has an explicit "..., <state>" part.
    const parts = q.split(",");
    if (parts.length > 1) {
      const stateToken = parts[parts.length - 1].trim().toLowerCase();
      const match = features.find((f) => {
        const region = (f.context ?? []).find((c) =>
          c.id?.startsWith("region"),
        );
        if (!region) return false;
        const short = (region.short_code ?? "").toLowerCase(); // e.g. "us-wa"
        const text = (region.text ?? "").toLowerCase(); // e.g. "washington"
        return short.endsWith(`-${stateToken}`) || text === stateToken;
      });
      if (match) chosen = match;
    }

    const center = chosen.center;
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
