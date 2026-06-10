import { Platform } from "react-native";

export const TLE_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
export const VISUAL_SATELLITE_GROUP = "visual";
/** Minimum elevation above horizon to count as visible. */
export const SATELLITE_MIN_ELEVATION_DEG = 5;

export type SatelliteTLE = {
  norad: number;
  name: string;
  tle1: string;
  tle2: string;
};

export type SatellitePosition = {
  norad: number;
  name: string;
  lat: number;
  lng: number;
  altKm: number;
  elevation: number;
  azimuth: number;
};

type CachedTLE = { tle1: string; tle2: string; fetchedAt: number };
type CachedCatalog = { satellites: SatelliteTLE[]; fetchedAt: number };

const tleCache = new Map<number, CachedTLE>();
let visualCatalogCache: CachedCatalog | null = null;

function tleApiUrl(params: Record<string, string>): string {
  const query = new URLSearchParams(params).toString();
  if (Platform.OS === "web") {
    // Route through the working Expo API proxy (opensky+api.ts also handles TLE).
    return `/api/opensky?${query}`;
  }
  const celestrak = new URLSearchParams({ ...params, FORMAT: "TLE" });
  return `https://celestrak.org/NORAD/elements/gp.php?${celestrak}`;
}

function isValidTleText(text: string): boolean {
  return (
    Boolean(text.trim()) &&
    !text.includes("<html") &&
    !text.includes("Query removed")
  );
}

export function parseTleFile(text: string): SatelliteTLE[] {
  const lines = text
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const satellites: SatelliteTLE[] = [];
  for (let i = 0; i + 2 < lines.length; i += 3) {
    const name = lines[i];
    const tle1 = lines[i + 1];
    const tle2 = lines[i + 2];
    if (!tle1.startsWith("1 ") || !tle2.startsWith("2 ")) continue;

    const norad = Number.parseInt(tle1.substring(2, 7), 10);
    if (!Number.isFinite(norad)) continue;

    satellites.push({ norad, name: name.trim(), tle1, tle2 });
  }
  return satellites;
}

export async function fetchSatelliteGroup(
  group: string,
): Promise<SatelliteTLE[]> {
  if (
    group === VISUAL_SATELLITE_GROUP &&
    visualCatalogCache &&
    Date.now() - visualCatalogCache.fetchedAt < TLE_CACHE_TTL_MS
  ) {
    return visualCatalogCache.satellites;
  }

  try {
    const res = await fetch(tleApiUrl({ group }));
    if (!res.ok) return visualCatalogCache?.satellites ?? [];

    const text = await res.text();
    if (!isValidTleText(text)) return visualCatalogCache?.satellites ?? [];

    const satellites = parseTleFile(text);
    if (group === VISUAL_SATELLITE_GROUP && satellites.length > 0) {
      visualCatalogCache = { satellites, fetchedAt: Date.now() };
      for (const sat of satellites) {
        tleCache.set(sat.norad, {
          tle1: sat.tle1,
          tle2: sat.tle2,
          fetchedAt: Date.now(),
        });
      }
    }
    return satellites;
  } catch {
    return visualCatalogCache?.satellites ?? [];
  }
}

/** Propagate TLE to a given Date and return geodetic position. */
export function tleSatPosition(
  tle1: string,
  tle2: string,
  at: Date,
): { lat: number; lng: number; altKm: number } | null {
  try {
    const epochField = tle1.substring(18, 32).trim();
    const yr = Number.parseInt(epochField.substring(0, 2), 10);
    const fullYear = yr >= 57 ? 1900 + yr : 2000 + yr;
    const dayFraction = Number.parseFloat(epochField.substring(2));
    const epochMs = Date.UTC(fullYear, 0, 1) + (dayFraction - 1) * 86_400_000;

    const inc = Number.parseFloat(tle2.substring(8, 16)) * (Math.PI / 180);
    const raan = Number.parseFloat(tle2.substring(17, 25)) * (Math.PI / 180);
    const ecc = Number.parseFloat(`0.${tle2.substring(26, 33).trim()}`);
    const argp = Number.parseFloat(tle2.substring(34, 42)) * (Math.PI / 180);
    const m0 = Number.parseFloat(tle2.substring(43, 51)) * (Math.PI / 180);
    const n =
      Number.parseFloat(tle2.substring(52, 63)) * 2 * Math.PI * (1 / 86_400);

    const dt = (at.getTime() - epochMs) / 1000;
    const mu = 398_600.4418;
    const a = Math.cbrt(mu / (n * n));

    const M = (m0 + n * dt) % (2 * Math.PI);

    let E = M;
    for (let i = 0; i < 10; i++) E = M + ecc * Math.sin(E);

    const nu = 2 * Math.atan2(
      Math.sqrt(1 + ecc) * Math.sin(E / 2),
      Math.sqrt(1 - ecc) * Math.cos(E / 2),
    );

    const r = a * (1 - ecc * Math.cos(E));
    const u = nu + argp;
    const cO = Math.cos(raan);
    const sO = Math.sin(raan);
    const cI = Math.cos(inc);
    const sI = Math.sin(inc);
    const cU = Math.cos(u);
    const sU = Math.sin(u);

    const x = r * (cO * cU - sO * sU * cI);
    const y = r * (sO * cU + cO * sU * cI);
    const z = r * sU * sI;

    const JD = at.getTime() / 86_400_000 + 2_440_587.5;
    const T = (JD - 2_451_545.0) / 36_525;
    const gmstDeg =
      (280.46061837 +
        360.98564736629 * (JD - 2_451_545.0) +
        T * T * 0.000387933) %
      360;
    const theta = (((gmstDeg + 360) % 360) * Math.PI) / 180;

    const xe = x * Math.cos(theta) + y * Math.sin(theta);
    const ye = -x * Math.sin(theta) + y * Math.cos(theta);
    const ze = z;

    const lng = (Math.atan2(ye, xe) * 180) / Math.PI;
    const lat =
      (Math.atan2(ze, Math.sqrt(xe * xe + ye * ye)) * 180) / Math.PI;
    const altKm = Math.sqrt(x * x + y * y + z * z) - 6_371;

    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(altKm)) {
      return null;
    }
    return { lat, lng, altKm };
  } catch {
    return null;
  }
}

export function satelliteLookAngles(
  observerLat: number,
  observerLng: number,
  satLat: number,
  satLng: number,
  satAltitudeKm: number,
): { altitude: number; azimuth: number } {
  const toRad = Math.PI / 180;
  const lat1 = observerLat * toRad;
  const lat2 = satLat * toRad;
  const dLng = (satLng - observerLng) * toRad;

  const cosC =
    Math.sin(lat1) * Math.sin(lat2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const centralAngle = Math.acos(Math.min(1, Math.max(-1, cosC)));

  const earthRadiusKm = 6371;
  const elevation = Math.atan2(
    cosC - earthRadiusKm / (earthRadiusKm + satAltitudeKm),
    Math.sin(centralAngle),
  );

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const azimuth = ((Math.atan2(y, x) / toRad) + 360) % 360;

  return { altitude: elevation / toRad, azimuth };
}

async function fetchIssLivePosition(): Promise<{
  lat: number;
  lng: number;
  altKm: number;
} | null> {
  try {
    const res = await fetch("https://api.wheretheiss.at/v1/satellites/25544");
    if (!res.ok) return null;

    const data = await res.json();
    const lat = Number(data.latitude);
    const lng = Number(data.longitude);
    const altKm = Number(data.altitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    return {
      lat,
      lng,
      altKm: Number.isFinite(altKm) ? altKm : 420,
    };
  } catch {
    return null;
  }
}

async function satelliteGroundPosition(
  satellite: SatelliteTLE,
  at: Date,
): Promise<{ lat: number; lng: number; altKm: number } | null> {
  const ageMinutes = Math.abs(at.getTime() - Date.now()) / 60_000;
  if (satellite.norad === 25544 && ageMinutes <= 2) {
    const live = await fetchIssLivePosition();
    if (live) return live;
  }
  return tleSatPosition(satellite.tle1, satellite.tle2, at);
}

export function displaySatelliteName(name: string): string {
  return name
    .replace(/\s+/g, " ")
    .replace(/\(.*?\)/g, "")
    .trim();
}

export async function getVisibleSatellites(
  observerLat: number,
  observerLng: number,
  at: Date,
  minElevation = SATELLITE_MIN_ELEVATION_DEG,
): Promise<SatellitePosition[]> {
  const catalog = await fetchSatelliteGroup(VISUAL_SATELLITE_GROUP);
  const visible: SatellitePosition[] = [];

  await Promise.all(
    catalog.map(async (satellite) => {
      const pos = await satelliteGroundPosition(satellite, at);
      if (!pos) return;

      const { altitude, azimuth } = satelliteLookAngles(
        observerLat,
        observerLng,
        pos.lat,
        pos.lng,
        pos.altKm,
      );
      if (altitude < minElevation) return;

      visible.push({
        norad: satellite.norad,
        name: displaySatelliteName(satellite.name),
        lat: pos.lat,
        lng: pos.lng,
        altKm: pos.altKm,
        elevation: altitude,
        azimuth,
      });
    }),
  );

  return visible.sort((a, b) => b.elevation - a.elevation);
}

export async function findBestSatelliteMatch(
  observerLat: number,
  observerLng: number,
  at: Date,
  minElevation = SATELLITE_MIN_ELEVATION_DEG,
): Promise<string | null> {
  const visible = await getVisibleSatellites(
    observerLat,
    observerLng,
    at,
    minElevation,
  );
  return visible[0]?.name ?? null;
}

/** Ground-track positions for map display (all visually tracked satellites). */
export async function getTrackedSatellitePositions(
  observerLat: number,
  observerLng: number,
  at: Date,
): Promise<SatellitePosition[]> {
  const catalog = await fetchSatelliteGroup(VISUAL_SATELLITE_GROUP);
  const results: SatellitePosition[] = [];

  await Promise.all(
    catalog.map(async (satellite) => {
      const pos = await satelliteGroundPosition(satellite, at);
      if (!pos) return;

      const { altitude, azimuth } = satelliteLookAngles(
        observerLat,
        observerLng,
        pos.lat,
        pos.lng,
        pos.altKm,
      );

      results.push({
        norad: satellite.norad,
        name: displaySatelliteName(satellite.name),
        lat: pos.lat,
        lng: pos.lng,
        altKm: pos.altKm,
        elevation: altitude,
        azimuth,
      });
    }),
  );

  return results.sort((a, b) => b.elevation - a.elevation);
}
