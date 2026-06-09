import { useEffect, useState } from "react";

const CELESTIAL_REFRESH_INTERVAL_MS = 300_000; // 5 minutes
const ISS_REFRESH_INTERVAL_MS = 30_000; // ISS moves ~8 km/s, refresh often

/** Brightest stars, J2000 equatorial coordinates. */
const BRIGHT_STARS = [
  { id: "sirius", name: "Sirius", raHours: 6.752, decDegrees: -16.716, magnitude: -1.46 },
  { id: "canopus", name: "Canopus", raHours: 6.399, decDegrees: -52.696, magnitude: -0.74 },
  { id: "arcturus", name: "Arcturus", raHours: 14.261, decDegrees: 19.182, magnitude: -0.05 },
  { id: "vega", name: "Vega", raHours: 18.616, decDegrees: 38.784, magnitude: 0.03 },
  { id: "capella", name: "Capella", raHours: 5.278, decDegrees: 45.998, magnitude: 0.08 },
  { id: "rigel", name: "Rigel", raHours: 5.242, decDegrees: -8.202, magnitude: 0.13 },
  { id: "procyon", name: "Procyon", raHours: 7.655, decDegrees: 5.225, magnitude: 0.34 },
  { id: "betelgeuse", name: "Betelgeuse", raHours: 5.919, decDegrees: 7.407, magnitude: 0.42 },
  { id: "altair", name: "Altair", raHours: 19.846, decDegrees: 8.868, magnitude: 0.77 },
  { id: "aldebaran", name: "Aldebaran", raHours: 4.599, decDegrees: 16.509, magnitude: 0.86 },
  { id: "spica", name: "Spica", raHours: 13.42, decDegrees: -11.161, magnitude: 0.97 },
  { id: "antares", name: "Antares", raHours: 16.49, decDegrees: -26.432, magnitude: 1.06 },
  { id: "pollux", name: "Pollux", raHours: 7.755, decDegrees: 28.026, magnitude: 1.14 },
  { id: "deneb", name: "Deneb", raHours: 20.69, decDegrees: 45.28, magnitude: 1.25 },
  { id: "polaris", name: "Polaris", raHours: 2.53, decDegrees: 89.264, magnitude: 1.98 },
] as const;

export type CelestialBodyKind = "planet" | "star" | "iss";

export type CelestialBody = {
  id: string;
  name: string;
  kind: CelestialBodyKind;
  altitude: number;
  azimuth: number;
  magnitude: number | null;
  /** Latitude on Earth where the body is at zenith. */
  earthLatitude: number;
  /** Longitude on Earth where the body is at zenith. */
  earthLongitude: number;
};

export function celestialBodyColor(kind: CelestialBodyKind): string {
  switch (kind) {
    case "star":
      return "#FFFFFF";
    case "iss":
      return "#FF69B4";
    default:
      return "#FFA500";
  }
}

/** Below this zoom the map shows celestial markers; above it, the SkyCompass. */
export const CELESTIAL_REFERENCE_ZOOM = 11;

function julianDate(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

function greenwichMeanSiderealTimeDegrees(date: Date): number {
  const jd = julianDate(date);
  const daysSinceJ2000 = jd - 2451545.0;
  const gmst = 280.46061837 + 360.98564736629 * daysSinceJ2000;
  return ((gmst % 360) + 360) % 360;
}

/** Geographic point on Earth where the body is directly overhead. */
export function subEarthPointFromEquatorial(
  rightAscensionHours: number,
  declinationDegrees: number,
  at: Date,
): { latitude: number; longitude: number } {
  const raDegrees = rightAscensionHours * 15;
  const gst = greenwichMeanSiderealTimeDegrees(at);
  // Body is at zenith where local sidereal time equals its RA:
  // east longitude = RA - GMST
  let longitude = raDegrees - gst;
  longitude = ((longitude + 540) % 360) - 180;
  return {
    latitude: declinationDegrees,
    longitude,
  };
}

export function celestialBodyEarthCoordinate(body: CelestialBody): [number, number] {
  return [body.earthLongitude, body.earthLatitude];
}

/** Alt/az of a fixed star as seen from the observer. */
function equatorialToHorizontal(
  raHours: number,
  decDegrees: number,
  latitude: number,
  longitude: number,
  at: Date,
): { altitude: number; azimuth: number } {
  const toRad = Math.PI / 180;
  const lstDegrees = greenwichMeanSiderealTimeDegrees(at) + longitude;
  const hourAngle = ((lstDegrees - raHours * 15) % 360) * toRad;
  const dec = decDegrees * toRad;
  const lat = latitude * toRad;

  const sinAlt =
    Math.sin(dec) * Math.sin(lat) +
    Math.cos(dec) * Math.cos(lat) * Math.cos(hourAngle);
  const alt = Math.asin(Math.min(1, Math.max(-1, sinAlt)));

  const cosAz =
    (Math.sin(dec) - sinAlt * Math.sin(lat)) / (Math.cos(alt) * Math.cos(lat));
  let azimuth = Math.acos(Math.min(1, Math.max(-1, cosAz))) / toRad;
  if (Math.sin(hourAngle) > 0) azimuth = 360 - azimuth;

  return { altitude: alt / toRad, azimuth };
}

/** Elevation/azimuth of a satellite given its ground point and altitude. */
function satelliteLookAngles(
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

export function useNearbyCelestial(
  latitude: number,
  longitude: number,
  enabled: boolean = true,
) {
  const [bodies, setBodies] = useState<CelestialBody[]>([]);
  const [iss, setIss] = useState<CelestialBody | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !latitude || !longitude) return;

    const appId = process.env.EXPO_PUBLIC_ASTRONOMY_APP_ID;
    const appSecret = process.env.EXPO_PUBLIC_ASTRONOMY_APP_SECRET;
    if (!appId || !appSecret) {
      setError("Add EXPO_PUBLIC_ASTRONOMY_APP_ID and EXPO_PUBLIC_ASTRONOMY_APP_SECRET to .env");
      return;
    }

    const auth = btoa(`${appId}:${appSecret}`);

    async function fetchBodies() {
      setLoading(true);
      try {
        const now = new Date();
        const date = now.toISOString().split("T")[0];
        const time = now.toTimeString().slice(0, 8);

        const params = new URLSearchParams({
          latitude: latitude.toString(),
          longitude: longitude.toString(),
          elevation: "0",
          from_date: date,
          to_date: date,
          time,
        });

        const response = await fetch(
          `https://api.astronomyapi.com/api/v2/bodies/positions?${params}`,
          { headers: { Authorization: `Basic ${auth}` } }
        );

        if (!response.ok) {
          setError("Celestial data unavailable");
          return;
        }

        const data = await response.json();
        const rows = data?.data?.table?.rows ?? [];

        const visible: CelestialBody[] = [];
        for (const row of rows) {
          const cell = row?.cells?.[0];
          const altitude = parseFloat(
            cell?.position?.horizontal?.altitude?.degrees ?? "-90"
          );
          const azimuth = parseFloat(
            cell?.position?.horizontal?.azimuth?.degrees ?? "0"
          );
          const raHours = parseFloat(
            cell?.position?.equatorial?.rightAscension?.hours ?? "NaN"
          );
          const decDegrees = parseFloat(
            cell?.position?.equatorial?.declination?.degrees ?? "NaN"
          );
          const magnitude = cell?.extraInfo?.magnitude != null
            ? parseFloat(cell.extraInfo.magnitude)
            : null;

          if (altitude <= 5 || Number.isNaN(raHours) || Number.isNaN(decDegrees)) {
            continue;
          }

          const { latitude: earthLatitude, longitude: earthLongitude } =
            subEarthPointFromEquatorial(raHours, decDegrees, now);

          visible.push({
            id: row.entry.id,
            name: row.entry.name,
            kind: "planet",
            altitude,
            azimuth,
            magnitude,
            earthLatitude,
            earthLongitude,
          });
        }

        for (const star of BRIGHT_STARS) {
          const { altitude, azimuth } = equatorialToHorizontal(
            star.raHours,
            star.decDegrees,
            latitude,
            longitude,
            now,
          );
          if (altitude <= 5) continue;

          const { latitude: earthLatitude, longitude: earthLongitude } =
            subEarthPointFromEquatorial(star.raHours, star.decDegrees, now);

          visible.push({
            id: star.id,
            name: star.name,
            kind: "star",
            altitude,
            azimuth,
            magnitude: star.magnitude,
            earthLatitude,
            earthLongitude,
          });
        }

        setError(null);
        setBodies(visible);
      } catch {
        setError("Failed to load celestial data");
      } finally {
        setLoading(false);
      }
    }

    fetchBodies();
    const interval = setInterval(fetchBodies, CELESTIAL_REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [latitude, longitude, enabled]);

  useEffect(() => {
    if (!enabled || !latitude || !longitude) {
      setIss(null);
      return;
    }

    async function fetchIss() {
      try {
        const response = await fetch(
          "https://api.wheretheiss.at/v1/satellites/25544",
        );
        if (!response.ok) return;

        const data = await response.json();
        const satLat = Number(data.latitude);
        const satLng = Number(data.longitude);
        const satAltKm = Number(data.altitude);
        if (Number.isNaN(satLat) || Number.isNaN(satLng)) return;

        const { altitude, azimuth } = satelliteLookAngles(
          latitude,
          longitude,
          satLat,
          satLng,
          Number.isNaN(satAltKm) ? 420 : satAltKm,
        );

        setIss({
          id: "iss",
          name: "ISS",
          kind: "iss",
          altitude,
          azimuth,
          magnitude: null,
          earthLatitude: satLat,
          earthLongitude: satLng,
        });
      } catch {
        // Keep the last known ISS position on transient failures
      }
    }

    fetchIss();
    const interval = setInterval(fetchIss, ISS_REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [latitude, longitude, enabled]);

  return { bodies: iss ? [...bodies, iss] : bodies, loading, error };
}