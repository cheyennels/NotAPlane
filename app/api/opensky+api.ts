const OPENSKY_TIMEOUT_MS = 8_000;
const TLE_TIMEOUT_MS = 12_000;
const TLE_GROUP_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const ALLOWED_TLE_GROUPS = new Set(["visual", "stations", "starlink", "active"]);
// Keep cached states at least as long as the client poll interval (10s) so
// repeated map refreshes don't each hit OpenSky.
const STATES_CACHE_TTL_MS = 25_000;
const STATES_STALE_MAX_MS = 300_000;
const TRACK_CACHE_TTL_MS = 1_800_000;

type CacheEntry = { body: unknown; fetchedAt: number };

const statesCache = new Map<string, CacheEntry>();
const statesInflight = new Map<string, Promise<Response>>();
const trackCache = new Map<string, CacheEntry>();
const tleGroupCache = new Map<string, { body: string; fetchedAt: number }>();

function openskyAuthHeader(): Record<string, string> {
  const username =
    process.env.OPENSKY_USERNAME ?? process.env.EXPO_PUBLIC_OPENSKY_USERNAME;
  const password =
    process.env.OPENSKY_PASSWORD ?? process.env.EXPO_PUBLIC_OPENSKY_PASSWORD;

  if (!username || !password) return {};

  return {
    Authorization: `Basic ${btoa(`${username}:${password}`)}`,
  };
}

function statesCacheKey(
  lamin: string,
  lomin: string,
  lamax: string,
  lomax: string,
): string {
  return `${lamin},${lomin},${lamax},${lomax}`;
}

function getCachedStates(key: string, allowStale: boolean): unknown | null {
  const entry = statesCache.get(key);
  if (!entry) return null;

  const age = Date.now() - entry.fetchedAt;
  if (age <= STATES_CACHE_TTL_MS) return entry.body;
  if (allowStale && age <= STATES_STALE_MAX_MS) return entry.body;
  return null;
}

async function fetchOpenSky(openskyUrl: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENSKY_TIMEOUT_MS);

  try {
    const response = await fetch(openskyUrl, {
      headers: {
        Accept: "application/json",
        ...openskyAuthHeader(),
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text();
      return Response.json(
        { error: "OpenSky API error", status: response.status, body },
        { status: response.status },
      );
    }

    return Response.json(await response.json());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isTimeout = message.includes("abort") || message.includes("Abort");
    return Response.json(
      { error: isTimeout ? "OpenSky request timed out" : "Proxy failed", message },
      { status: isTimeout ? 504 : 500 },
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchStatesCached(
  lamin: string,
  lomin: string,
  lamax: string,
  lomax: string,
): Promise<Response> {
  const key = statesCacheKey(lamin, lomin, lamax, lomax);

  const fresh = getCachedStates(key, false);
  if (fresh) {
    return Response.json(fresh);
  }

  const inflight = statesInflight.get(key);
  if (inflight) return inflight;

  const request = (async () => {
    try {
      const response = await fetchOpenSky(
        `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`,
      );

      if (response.ok) {
        const body = await response.clone().json();
        statesCache.set(key, { body, fetchedAt: Date.now() });
        return response;
      }

      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        const stale = getCachedStates(key, true);
        if (stale) {
          const headers: Record<string, string> = { "X-OpenSky-Stale": "true" };
          if (retryAfter) headers["Retry-After"] = retryAfter;
          return Response.json(stale, { headers });
        }
        const headers: Record<string, string> = {};
        if (retryAfter) headers["Retry-After"] = retryAfter;
        return new Response(null, { status: 429, headers });
      }

      return response;
    } finally {
      statesInflight.delete(key);
    }
  })();

  statesInflight.set(key, request);
  return request;
}

function getCachedTrack(icao24: string): unknown | null {
  const entry = trackCache.get(icao24.toLowerCase());
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt <= TRACK_CACHE_TTL_MS) return entry.body;
  trackCache.delete(icao24.toLowerCase());
  return null;
}

async function fetchTrackCached(icao24: string, time: string): Promise<Response> {
  const id = icao24.toLowerCase();
  const cached = getCachedTrack(id);
  if (cached) {
    return Response.json(cached);
  }

  const response = await fetchOpenSky(
    `https://opensky-network.org/api/tracks/all?icao24=${id}&time=${time}`,
  );

  if (response.ok) {
    const body = await response.clone().json();
    trackCache.set(id, { body, fetchedAt: Date.now() });
  }

  return response;
}

async function fetchTleGroup(group: string): Promise<Response> {
  const cached = tleGroupCache.get(group);
  if (cached && Date.now() - cached.fetchedAt <= TLE_GROUP_CACHE_TTL_MS) {
    return new Response(cached.body, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TLE_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://celestrak.org/NORAD/elements/gp.php?GROUP=${group}&FORMAT=TLE`,
      { signal: controller.signal },
    );

    if (!response.ok) {
      return Response.json(
        { error: "Celestrak request failed", status: response.status },
        { status: response.status },
      );
    }

    const text = await response.text();
    if (!text.trim() || text.includes("<html")) {
      return Response.json({ error: "Invalid TLE response" }, { status: 502 });
    }

    tleGroupCache.set(group, { body: text, fetchedAt: Date.now() });
    return new Response(text, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isTimeout = message.includes("abort") || message.includes("Abort");
    return Response.json(
      { error: isTimeout ? "TLE request timed out" : "TLE proxy failed", message },
      { status: isTimeout ? 504 : 500 },
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchTleByCatnr(catnr: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TLE_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://celestrak.org/NORAD/elements/gp.php?CATNR=${catnr}&FORMAT=TLE`,
      { signal: controller.signal },
    );

    if (!response.ok) {
      return Response.json(
        { error: "Celestrak request failed", status: response.status },
        { status: response.status },
      );
    }

    const text = await response.text();
    if (!text.trim() || text.includes("<html")) {
      return Response.json({ error: "Invalid TLE response" }, { status: 502 });
    }

    return new Response(text, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isTimeout = message.includes("abort") || message.includes("Abort");
    return Response.json(
      { error: isTimeout ? "TLE request timed out" : "TLE proxy failed", message },
      { status: isTimeout ? 504 : 500 },
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const group = url.searchParams.get("group");
  const catnr = url.searchParams.get("catnr");

  if (group) {
    if (!ALLOWED_TLE_GROUPS.has(group)) {
      return Response.json({ error: "Unsupported satellite group" }, { status: 400 });
    }
    return fetchTleGroup(group);
  }

  if (catnr) {
    if (!/^\d+$/.test(catnr)) {
      return Response.json({ error: "Invalid catnr" }, { status: 400 });
    }
    return fetchTleByCatnr(catnr);
  }

  const lamin = url.searchParams.get("lamin");
  const lomin = url.searchParams.get("lomin");
  const lamax = url.searchParams.get("lamax");
  const lomax = url.searchParams.get("lomax");
  const icao24 = url.searchParams.get("icao24");

  if (icao24 && url.searchParams.has("time")) {
    return fetchTrackCached(icao24, url.searchParams.get("time")!);
  }

  if (lamin && lomin && lamax && lomax) {
    return fetchStatesCached(lamin, lomin, lamax, lomax);
  }

  return Response.json(
    { error: "Missing bounding box or track params" },
    { status: 400 },
  );
}
