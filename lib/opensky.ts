// OpenSky Network API — proxied through Supabase edge function on web
// Docs: https://openskynetwork.github.io/opensky-api/rest.html

import {
  flightCacheKey,
  readFlightCache,
  writeFlightCache,
} from "./flightCache";
import {
  readFlightTrackCache,
  writeFlightTrackCache,
} from "./flightTrackCache";
import { estimateFlightTrail } from "./flightTrailEstimate";
import {
  getMockFlightPath,
  getMockFlightsInArea,
  isMockFlightsActive,
  isMockFlightsForced,
  setMockFlightsActive,
} from "./mockFlights";
import { functionAuthHeaders, functionUrl } from "./edgeFetch";

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

export type FlightsInAreaResult = {
  flights: OpenSkyFlight[];
  status: number;
  /** Demo flights (forced or rate-limited). */
  mock?: boolean;
  /** True when OpenSky returned 429 and demo data is shown. */
  rateLimited?: boolean;
  /** True when showing a previously stored API snapshot. */
  cached?: boolean;
};

function shouldFallbackToMockFlights(status: number): boolean {
  return (
    status === 429 ||
    status === 504 ||
    status === 502 ||
    status === 500 ||
    status === 403 ||
    status === 0
  );
}

async function mockOrCachedFlightsResult(
  cacheKey: string,
  minLat: number,
  maxLat: number,
  minLng: number,
  maxLng: number,
  status: number,
): Promise<FlightsInAreaResult> {
  const cached = await cachedFlightsResult(cacheKey);
  if (cached) return cached;
  return mockFlightsResult(
    minLat,
    maxLat,
    minLng,
    maxLng,
    status === 429,
  );
}

function mockFlightsResult(
  minLat: number,
  maxLat: number,
  minLng: number,
  maxLng: number,
  rateLimited = false,
): FlightsInAreaResult {
  return {
    flights: getMockFlightsInArea(minLat, maxLat, minLng, maxLng),
    status: 200,
    mock: true,
    rateLimited,
  };
}

function parseOpenSkyStates(states: unknown[][]): OpenSkyFlight[] {
  return states
    .filter((s) => s[5] !== null && s[6] !== null && !s[8])
    .map((s) => ({
      icao24: String(s[0]),
      callsign: String(s[1] || "").trim(),
      origin_country: String(s[2]),
      latitude: Number(s[6]),
      longitude: Number(s[5]),
      altitude_m: Number(s[7]) || 0,
      altitude_ft: Math.round((Number(s[7]) || 0) * 3.28084),
      heading: Number(s[10]) || 0,
      velocity_ms: Number(s[9]) || 0,
      velocity_mph: Math.round((Number(s[9]) || 0) * 2.23694),
      on_ground: Boolean(s[8]),
      last_contact: Number(s[4]) || 0,
    }));
}

async function cachedFlightsResult(
  cacheKey: string,
): Promise<FlightsInAreaResult | null> {
  const cached = await readFlightCache(cacheKey);
  if (!cached || cached.flights.length === 0) return null;

  setMockFlightsActive(false);
  return {
    flights: cached.flights,
    status: 200,
    cached: true,
  };
}

// Get all aircraft currently within a bounding box
export async function getFlightsInArea(
  minLat: number,
  maxLat: number,
  minLng: number,
  maxLng: number,
): Promise<FlightsInAreaResult> {
  if (isMockFlightsForced()) {
    return mockFlightsResult(minLat, maxLat, minLng, maxLng);
  }

  const cacheKey = flightCacheKey(minLat, maxLat, minLng, maxLng);

  try {
    const url = `https://opensky-network.org/api/states/all?lamin=${minLat}&lomin=${minLng}&lamax=${maxLat}&lomax=${maxLng}`;
    const response = await fetchOpenSky(url);

    if (shouldFallbackToMockFlights(response.status)) {
      console.warn(
        `OpenSky unavailable (${response.status}); using cached or demo flight data.`,
      );
      return mockOrCachedFlightsResult(
        cacheKey,
        minLat,
        maxLat,
        minLng,
        maxLng,
        response.status,
      );
    }

    if (!response.ok) {
      console.warn("OpenSky API error:", response.status, await response.text());
      const cached = await cachedFlightsResult(cacheKey);
      if (cached) return cached;
      return { flights: [], status: response.status };
    }

    const data = await response.json();
    if (!data.states) {
      const cached = await cachedFlightsResult(cacheKey);
      if (cached) return cached;
      return { flights: [], status: response.status };
    }

    const flights = parseOpenSkyStates(data.states);
    await writeFlightCache(cacheKey, flights);
    setMockFlightsActive(false);
    return { flights, status: response.status };
  } catch (error) {
    console.warn("OpenSky fetch failed:", error);
    return mockOrCachedFlightsResult(
      cacheKey,
      minLat,
      maxLat,
      minLng,
      maxLng,
      0,
    );
  }
}

export async function getFlightPath(
  icao24: string,
  trackTime = 0,
  flight?: OpenSkyFlight,
): Promise<{
  coordinates: [number, number][];
  status: number;
  mock?: boolean;
  estimated?: boolean;
  cached?: boolean;
}> {
  const id = icao24.toLowerCase();

  if (isMockFlightsForced()) {
    const mockPath = getMockFlightPath(id);
    if (mockPath) {
      return { coordinates: mockPath, status: 200, mock: true };
    }
  }

  const cachedTrack = await readFlightTrackCache(id);
  if (
    cachedTrack &&
    cachedTrack.coordinates.length >= 2 &&
    cachedTrack.source !== "estimated"
  ) {
    return {
      coordinates: cachedTrack.coordinates,
      status: 200,
      mock: cachedTrack.source === "mock",
      cached: true,
    };
  }

  async function fetchTrack(time: number) {
    const url = `https://opensky-network.org/api/tracks/all?icao24=${id}&time=${time}`;
    const response = await fetchOpenSky(url);
    if (!response.ok) {
      const detail = await response.clone().text();
      console.warn("OpenSky track error:", id, response.status, detail);
      return { coordinates: [] as [number, number][], status: response.status };
    }

    const data = await response.json();
    if (!Array.isArray(data.path) || data.path.length === 0) {
      return { coordinates: [] as [number, number][], status: response.status };
    }

    const coordinates = data.path
      .filter((p: unknown[]) => p[1] != null && p[2] != null)
      .map((p: unknown[]) => [Number(p[2]), Number(p[1])] as [number, number]);

    return { coordinates, status: response.status };
  }

  try {
    // Prefer the live track snapshot; fall back to last_contact if needed.
    let result = await fetchTrack(0);
    if (result.coordinates.length < 2 && trackTime !== 0) {
      result = await fetchTrack(trackTime);
    }

    if (result.coordinates.length >= 2) {
      await writeFlightTrackCache(id, result.coordinates, "opensky");
      return result;
    }

    if (isMockFlightsActive()) {
      const mockPath = getMockFlightPath(id);
      if (mockPath) {
        await writeFlightTrackCache(id, mockPath, "mock");
        return { coordinates: mockPath, status: 200, mock: true };
      }
    }

    if (flight) {
      const estimated = estimateFlightTrail(flight);
      if (estimated.length >= 2) {
        await writeFlightTrackCache(id, estimated, "estimated");
        return {
          coordinates: estimated,
          status: result.status || 200,
          estimated: true,
        };
      }
    }

    return result;
  } catch (error) {
    console.warn("OpenSky path fetch failed:", error);
    if (isMockFlightsActive()) {
      const mockPath = getMockFlightPath(id);
      if (mockPath) {
        await writeFlightTrackCache(id, mockPath, "mock");
        return { coordinates: mockPath, status: 200, mock: true };
      }
    }
    if (flight) {
      const estimated = estimateFlightTrail(flight);
      if (estimated.length >= 2) {
        await writeFlightTrackCache(id, estimated, "estimated");
        return { coordinates: estimated, status: 0, estimated: true };
      }
    }
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

// All platforms go through the authenticated opensky-proxy Edge Function, which
// holds the OpenSky credentials. We translate the OpenSky URL the rest of this
// module builds into the proxy's query params.
async function fetchOpenSky(url: string): Promise<Response> {
  const parsed = new URL(url);
  const params = new URLSearchParams();

  const icao24 = parsed.searchParams.get("icao24");
  const time = parsed.searchParams.get("time");
  const lamin = parsed.searchParams.get("lamin");
  const lomin = parsed.searchParams.get("lomin");
  const lamax = parsed.searchParams.get("lamax");
  const lomax = parsed.searchParams.get("lomax");

  if (icao24 && time !== null) {
    params.set("icao24", icao24);
    params.set("time", time);
  } else if (lamin && lomin && lamax && lomax) {
    params.set("lamin", lamin);
    params.set("lomin", lomin);
    params.set("lamax", lamax);
    params.set("lomax", lomax);
  } else {
    return new Response(null, { status: 400, statusText: "Bad request" });
  }

  try {
    return await fetch(functionUrl("opensky-proxy", params), {
      headers: await functionAuthHeaders(),
      signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
    });
  } catch (error) {
    console.warn("OpenSky proxy unavailable:", error);
    return new Response(null, {
      status: 502,
      statusText: "OpenSky proxy unavailable",
    });
  }
}
