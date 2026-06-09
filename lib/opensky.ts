// OpenSky Network API — proxied through Supabase edge function on web
// Docs: https://openskynetwork.github.io/opensky-api/rest.html

import { Platform } from "react-native";

export type OpenSkyFlight = {
  icao24: string;
  callsign: string;
  origin_country: string;
  latitude: number;
  longitude: number;
  altitude_m: number;
  altitude_ft: number;
  heading: number;
  velocity_ms: number;
  velocity_mph: number;
  on_ground: boolean;
  last_contact: number;
};

export type FlightPath = {
  icao24: string;
  callsign: string;
  path: [number, number][];
};

const PROXY_TIMEOUT_MS = 12_000;

function toBase64(value: string): string {
  if (typeof btoa === "function") {
    return btoa(value);
  }

  // React Native doesn't expose btoa — use a tiny inline encoder.
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let output = "";
  let i = 0;

  while (i < value.length) {
    const a = value.charCodeAt(i++);
    const b = i < value.length ? value.charCodeAt(i++) : 0;
    const c = i < value.length ? value.charCodeAt(i++) : 0;
    const bitmap = (a << 16) | (b << 8) | c;

    output += chars[(bitmap >> 18) & 63];
    output += chars[(bitmap >> 12) & 63];
    output += i - 2 < value.length ? chars[(bitmap >> 6) & 63] : "=";
    output += i - 1 < value.length ? chars[bitmap & 63] : "=";
  }

  return output;
}

function getOpenSkyAuthHeader(): Record<string, string> {
  const username = process.env.EXPO_PUBLIC_OPENSKY_USERNAME;
  const password = process.env.EXPO_PUBLIC_OPENSKY_PASSWORD;

  if (!username || !password) return {};

  return { Authorization: `Basic ${toBase64(`${username}:${password}`)}` };
}

export type FlightsInAreaResult = {
  flights: OpenSkyFlight[];
  status: number;
};

// Get all aircraft currently within a bounding box
export async function getFlightsInArea(
  minLat: number,
  maxLat: number,
  minLng: number,
  maxLng: number,
): Promise<FlightsInAreaResult> {
  try {
    const url = `https://opensky-network.org/api/states/all?lamin=${minLat}&lomin=${minLng}&lamax=${maxLat}&lomax=${maxLng}`;
    const response = await fetchOpenSky(url);

    if (!response.ok) {
      const detail = await response.text();
      console.warn("OpenSky API error:", response.status, detail);
      return { flights: [], status: response.status };
    }

    const data = await response.json();
    if (!data.states) return { flights: [], status: response.status };

    const flights = data.states
      .filter((s: any[]) => s[5] !== null && s[6] !== null && !s[8])
      .map((s: any[]) => ({
        icao24: s[0],
        callsign: (s[1] || "").trim(),
        origin_country: s[2],
        latitude: s[6],
        longitude: s[5],
        altitude_m: s[7] || 0,
        altitude_ft: Math.round((s[7] || 0) * 3.28084),
        heading: s[10] || 0,
        velocity_ms: s[9] || 0,
        velocity_mph: Math.round((s[9] || 0) * 2.23694),
        on_ground: s[8] || false,
        last_contact: s[4] || 0,
      }));

    return { flights, status: response.status };
  } catch (error) {
    console.warn("OpenSky fetch failed:", error);
    return { flights: [], status: 0 };
  }
}

export async function getFlightPath(
  icao24: string,
  trackTime = 0,
): Promise<{ coordinates: [number, number][]; status: number }> {
  try {
    const id = icao24.toLowerCase();
    const url = `https://opensky-network.org/api/tracks/all?icao24=${id}&time=${trackTime}`;
    const response = await fetchOpenSky(url);

    if (!response.ok) {
      const detail = await response.clone().text();
      console.warn("OpenSky track error:", id, response.status, detail);
      return { coordinates: [], status: response.status };
    }

    const data = await response.json();
    if (!Array.isArray(data.path) || data.path.length === 0) {
      return { coordinates: [], status: response.status };
    }

    const coordinates = data.path
      .filter((p: unknown[]) => p[1] != null && p[2] != null)
      .map((p: unknown[]) => [Number(p[2]), Number(p[1])] as [number, number]);

    return { coordinates, status: response.status };
  } catch (error) {
    console.warn("OpenSky path fetch failed:", error);
    return { coordinates: [], status: 0 };
  }
}

export function getBoundingBox(
  lat: number,
  lng: number,
  radiusKm: number = 50,
) {
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));

  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  };
}

export function headingToDirection(heading: number): string {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return directions[Math.round(heading / 45) % 8];
}

export async function findNearbyFlights(
  latitude: number,
  longitude: number,
  radiusKm: number = 10,
): Promise<OpenSkyFlight[]> {
  const box = getBoundingBox(latitude, longitude, radiusKm);
  const result = await getFlightsInArea(
    box.minLat,
    box.maxLat,
    box.minLng,
    box.maxLng,
  );
  return result.flights;
}

async function fetchOpenSkyViaExpoApi(url: string): Promise<Response | null> {
  const parsed = new URL(url);
  const lamin = parsed.searchParams.get("lamin");
  const lomin = parsed.searchParams.get("lomin");
  const lamax = parsed.searchParams.get("lamax");
  const lomax = parsed.searchParams.get("lomax");
  const icao24 = parsed.searchParams.get("icao24");

  let apiUrl: string | null = null;

  if (lamin && lomin && lamax && lomax) {
    apiUrl = `/api/opensky?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;
  } else if (icao24 && parsed.searchParams.has("time")) {
    apiUrl = `/api/opensky?icao24=${icao24}&time=${parsed.searchParams.get("time")}`;
  }

  if (!apiUrl) return null;

  try {
    return await fetch(apiUrl, {
      signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
    });
  } catch (error) {
    console.warn("OpenSky API route unavailable:", error);
    return null;
  }
}

async function fetchOpenSkyViaProxy(url: string): Promise<Response | null> {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) return null;

  const parsed = new URL(url);
  const lamin = parsed.searchParams.get("lamin");
  const lomin = parsed.searchParams.get("lomin");
  const lamax = parsed.searchParams.get("lamax");
  const lomax = parsed.searchParams.get("lomax");
  const icao24 = parsed.searchParams.get("icao24");

  let proxyUrl: string | null = null;

  if (lamin && lomin && lamax && lomax) {
    proxyUrl = `${supabaseUrl}/functions/v1/opensky-proxy?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;
  } else if (icao24 && parsed.searchParams.has("time")) {
    proxyUrl = `${supabaseUrl}/functions/v1/opensky-proxy?icao24=${icao24}&time=${parsed.searchParams.get("time")}`;
  }

  if (!proxyUrl) return null;

  try {
    return await fetch(proxyUrl, {
      headers: {
        Authorization: `Bearer ${anonKey}`,
        apikey: anonKey,
      },
      signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
    });
  } catch (error) {
    console.warn("OpenSky proxy unavailable:", error);
    return null;
  }
}

async function fetchOpenSkyDirect(url: string): Promise<Response> {
  return fetch(url, { headers: getOpenSkyAuthHeader() });
}

async function fetchOpenSky(url: string): Promise<Response> {
  // Native apps can call OpenSky directly (no browser CORS).
  if (Platform.OS !== "web") {
    return fetchOpenSkyDirect(url);
  }

  const apiResponse = await fetchOpenSkyViaExpoApi(url);
  if (apiResponse?.ok) return apiResponse;

  // A 429 from the local API route means OpenSky is rate-limiting; don't
  // immediately hit the Supabase proxy for the same track request.
  if (apiResponse?.status === 429) {
    return apiResponse;
  }

  const proxyResponse = await fetchOpenSkyViaProxy(url);
  if (proxyResponse?.ok) return proxyResponse;

  const failed = apiResponse ?? proxyResponse;
  if (failed && !failed.ok) {
    const detail = await failed.clone().text();
    console.warn("OpenSky web fetch error:", failed.status, detail);
    return failed;
  }

  return new Response(null, { status: 502, statusText: "OpenSky proxy unavailable" });
}
