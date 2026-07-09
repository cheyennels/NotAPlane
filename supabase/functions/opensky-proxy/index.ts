// @ts-nocheck
// OpenSky + Celestrak TLE proxy. This is the single authenticated backend for
// flight/satellite data on every platform (web and native). Secrets
// (OpenSky credentials) live only in this function's environment.
// Fail fast: the client aborts at 12s. We may make two attempts (authenticated,
// then anonymous), so keep each well under half of that.
const OPENSKY_TIMEOUT_MS = 5_000;
const OPENSKY_TOKEN_TIMEOUT_MS = 4_000;
const TLE_TIMEOUT_MS = 12_000;
const TOKEN_URL =
  "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token";
const TOKEN_REFRESH_MARGIN_MS = 30_000;

const ALLOWED_TLE_GROUPS = new Set(["visual", "stations", "starlink", "active"]);

// Keep cached states at least as long as the client poll interval (10s) so
// repeated map refreshes don't each hit OpenSky.
const STATES_CACHE_TTL_MS = 25_000;
const STATES_STALE_MAX_MS = 300_000;
const TRACK_CACHE_TTL_MS = 1_800_000;
const TRACK_STALE_MAX_MS = 7_200_000;
const TLE_GROUP_CACHE_TTL_MS = 12 * 60 * 60 * 1000;

type CacheEntry = { body: unknown; fetchedAt: number };

const statesCache = new Map<string, CacheEntry>();
const statesInflight = new Map<string, Promise<Response>>();
const trackCache = new Map<string, CacheEntry>();
const tleGroupCache = new Map<string, { body: string; fetchedAt: number }>();

let tokenCache: { token: string; expiresAt: number } | null = null;

// ---------------------------------------------------------------------------
// CORS — restrict to configured origins. Set ALLOWED_ORIGINS (comma-separated)
// to the app's web origin(s) to lock this down. Native fetch sends no Origin
// and is unaffected. Until ALLOWED_ORIGINS is set we echo the caller's origin
// so deploys don't break; the real abuse control is the auth gate below.
// ---------------------------------------------------------------------------
const DEV_ORIGINS = [
  "http://localhost:8081",
  "http://localhost:19006",
  "http://localhost:3000",
];

function resolveAllowedOrigin(req: Request): string {
  const origin = req.headers.get("Origin") ?? "";
  const configured = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  const allowed = [...configured, ...DEV_ORIGINS];

  if (origin && allowed.includes(origin)) return origin;
  // Not yet configured: stay permissive so the app keeps working.
  if (configured.length === 0) return origin || "*";
  // Configured but origin not allowed: report the first allowed origin so the
  // browser blocks the cross-origin read.
  return configured[0];
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, content-type, apikey, x-client-info",
  };
}

function applyCors(res: Response, origin: string): Response {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(corsHeaders(origin))) headers.set(k, v);
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}

// ---------------------------------------------------------------------------
// Auth — require a real signed-in user. verify_jwt=true at the gateway already
// validated the token's signature/expiry, but the public anon key is itself a
// valid project JWT, so we must additionally reject anything that isn't an
// authenticated user.
// ---------------------------------------------------------------------------
function getJwtClaims(req: Request): Record<string, unknown> | null {
  const header = req.headers.get("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    let payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    payload = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), "=");
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

function isAuthenticatedUser(req: Request): boolean {
  const claims = getJwtClaims(req);
  return (
    !!claims && claims.role === "authenticated" && typeof claims.sub === "string"
  );
}

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------
const COORD_RE = /^-?\d{1,3}(\.\d+)?$/;
const ICAO24_RE = /^[0-9a-fA-F]{1,8}$/;
const DIGITS_RE = /^\d+$/;

// ---------------------------------------------------------------------------
// OpenSky auth (credentials read only from this function's environment)
// ---------------------------------------------------------------------------
async function getOpenSkyAuthHeaders(): Promise<Record<string, string>> {
  const clientId = Deno.env.get("OPENSKY_CLIENT_ID");
  const clientSecret = Deno.env.get("OPENSKY_CLIENT_SECRET");

  if (clientId && clientSecret) {
    const now = Date.now();
    if (tokenCache && now < tokenCache.expiresAt) {
      return { Authorization: `Bearer ${tokenCache.token}` };
    }

    try {
      const tokenResponse = await fetch(TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: clientId,
          client_secret: clientSecret,
        }),
        signal: AbortSignal.timeout(OPENSKY_TOKEN_TIMEOUT_MS),
      });

      if (tokenResponse.ok) {
        const data = await tokenResponse.json();
        if (data.access_token) {
          const expiresInMs = (data.expires_in ?? 1800) * 1000;
          tokenCache = {
            token: data.access_token,
            expiresAt: Date.now() + expiresInMs - TOKEN_REFRESH_MARGIN_MS,
          };
          return { Authorization: `Bearer ${tokenCache.token}` };
        }
      } else {
        console.warn(
          "OpenSky OAuth token request failed:",
          tokenResponse.status,
        );
      }
    } catch (error) {
      console.warn(
        "OpenSky OAuth token request errored:",
        error instanceof Error ? error.message : String(error),
      );
    }

    // OAuth is configured but no token — go straight to anonymous (fast,
    // IP-limited) rather than the deprecated Basic path, which OpenSky stalls.
    return {};
  }

  // No OAuth client configured: legacy Basic auth, else anonymous.
  const username = Deno.env.get("OPENSKY_USERNAME");
  const password = Deno.env.get("OPENSKY_PASSWORD");
  if (username && password && username !== "your_username") {
    return { Authorization: `Basic ${btoa(`${username}:${password}`)}` };
  }

  return {};
}

// ---------------------------------------------------------------------------
// OpenSky states + tracks
// ---------------------------------------------------------------------------
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

// One OpenSky attempt (with or without auth). Upstream error bodies are logged
// server-side and never forwarded to callers.
async function fetchOpenSkyOnce(
  openskyUrl: string,
  useAuth: boolean,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENSKY_TIMEOUT_MS);
  const label = useAuth ? "auth" : "anon";

  try {
    const authHeaders = useAuth ? await getOpenSkyAuthHeaders() : {};
    const response = await fetch(openskyUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": "NotAPlane/1.0 (Supabase Edge)",
        ...authHeaders,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text();
      console.warn(`OpenSky API error (${label}):`, response.status, detail);
      return Response.json(
        { error: "OpenSky API error", status: response.status },
        { status: response.status },
      );
    }

    return Response.json(await response.json());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isTimeout = message.includes("abort") || message.includes("Abort");
    console.warn(`OpenSky proxy failure (${label}):`, message);
    return Response.json(
      { error: isTimeout ? "OpenSky request timed out" : "Proxy failed" },
      { status: isTimeout ? 504 : 500 },
    );
  } finally {
    clearTimeout(timeout);
  }
}

// Try authenticated first. If OpenSky *quickly* rejects the account (429/403),
// retry once anonymously — that's a separate rate-limit bucket that may still be
// under limit. On a timeout (504) we do NOT retry: a stall means the whole IP is
// throttled, so a second request would only deepen it. Fail fast instead.
async function fetchOpenSky(openskyUrl: string): Promise<Response> {
  const authed = await fetchOpenSkyOnce(openskyUrl, true);
  if (authed.ok) return authed;

  if (authed.status === 429 || authed.status === 403) {
    const anon = await fetchOpenSkyOnce(openskyUrl, false);
    if (anon.ok) return anon;
  }
  return authed;
}

async function fetchStatesCached(
  lamin: string,
  lomin: string,
  lamax: string,
  lomax: string,
): Promise<Response> {
  const key = statesCacheKey(lamin, lomin, lamax, lomax);

  const fresh = getCachedStates(key, false);
  if (fresh) return Response.json(fresh);

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

      if (response.status === 429 || response.status === 504) {
        const retryAfter = response.headers.get("Retry-After");
        const stale = getCachedStates(key, true);
        if (stale) {
          const headers: Record<string, string> = { "X-OpenSky-Stale": "true" };
          if (retryAfter) headers["Retry-After"] = retryAfter;
          return Response.json(stale, { headers });
        }
        const headers: Record<string, string> = {};
        if (retryAfter) headers["Retry-After"] = retryAfter;
        return new Response(null, { status: response.status, headers });
      }

      return response;
    } finally {
      statesInflight.delete(key);
    }
  })();

  statesInflight.set(key, request);
  return request;
}

function getCachedTrack(icao24: string, allowStale = false): unknown | null {
  const entry = trackCache.get(icao24.toLowerCase());
  if (!entry) return null;
  const age = Date.now() - entry.fetchedAt;
  if (age <= TRACK_CACHE_TTL_MS) return entry.body;
  if (allowStale && age <= TRACK_STALE_MAX_MS) return entry.body;
  trackCache.delete(icao24.toLowerCase());
  return null;
}

async function fetchTrackCached(icao24: string, time: string): Promise<Response> {
  const id = icao24.toLowerCase();
  const cached = getCachedTrack(id);
  if (cached) return Response.json(cached);

  const response = await fetchOpenSky(
    `https://opensky-network.org/api/tracks/all?icao24=${id}&time=${time}`,
  );

  if (response.ok) {
    const body = await response.clone().json();
    trackCache.set(id, { body, fetchedAt: Date.now() });
    return response;
  }

  if (response.status === 429 || response.status === 504) {
    const stale = getCachedTrack(id, true);
    if (stale) {
      return Response.json(stale, { headers: { "X-OpenSky-Stale": "true" } });
    }
  }

  return response;
}

// ---------------------------------------------------------------------------
// Celestrak TLE (no secret; cached to spare the upstream)
// ---------------------------------------------------------------------------
async function fetchTle(celestrakUrl: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TLE_TIMEOUT_MS);

  try {
    const response = await fetch(celestrakUrl, { signal: controller.signal });
    if (!response.ok) {
      console.warn("Celestrak request failed:", response.status);
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
    console.warn("TLE proxy failure:", message);
    return Response.json(
      { error: isTimeout ? "TLE request timed out" : "TLE proxy failed" },
      { status: isTimeout ? 504 : 500 },
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchTleGroup(group: string): Promise<Response> {
  const cached = tleGroupCache.get(group);
  if (cached && Date.now() - cached.fetchedAt <= TLE_GROUP_CACHE_TTL_MS) {
    return new Response(cached.body, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const response = await fetchTle(
    `https://celestrak.org/NORAD/elements/gp.php?GROUP=${group}&FORMAT=TLE`,
  );

  if (response.ok) {
    tleGroupCache.set(group, { body: await response.clone().text(), fetchedAt: Date.now() });
  }
  return response;
}

function fetchTleByCatnr(catnr: string): Promise<Response> {
  return fetchTle(
    `https://celestrak.org/NORAD/elements/gp.php?CATNR=${catnr}&FORMAT=TLE`,
  );
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
Deno.serve(async (req) => {
  const origin = resolveAllowedOrigin(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  const url = new URL(req.url);

  if (url.searchParams.get("ping") === "1") {
    return applyCors(Response.json({ ok: true }), origin);
  }

  if (!isAuthenticatedUser(req)) {
    return applyCors(Response.json({ error: "Unauthorized" }, { status: 401 }), origin);
  }

  try {
    const group = url.searchParams.get("group");
    if (group) {
      if (!ALLOWED_TLE_GROUPS.has(group)) {
        return applyCors(
          Response.json({ error: "Unsupported satellite group" }, { status: 400 }),
          origin,
        );
      }
      return applyCors(await fetchTleGroup(group), origin);
    }

    const catnr = url.searchParams.get("catnr");
    if (catnr) {
      if (!DIGITS_RE.test(catnr)) {
        return applyCors(Response.json({ error: "Invalid catnr" }, { status: 400 }), origin);
      }
      return applyCors(await fetchTleByCatnr(catnr), origin);
    }

    const icao24 = url.searchParams.get("icao24");
    const time = url.searchParams.get("time");
    if (icao24 && time !== null) {
      if (!ICAO24_RE.test(icao24) || !DIGITS_RE.test(time)) {
        return applyCors(
          Response.json({ error: "Invalid track params" }, { status: 400 }),
          origin,
        );
      }
      return applyCors(await fetchTrackCached(icao24, time), origin);
    }

    const lamin = url.searchParams.get("lamin");
    const lomin = url.searchParams.get("lomin");
    const lamax = url.searchParams.get("lamax");
    const lomax = url.searchParams.get("lomax");
    if (lamin && lomin && lamax && lomax) {
      if (
        !COORD_RE.test(lamin) ||
        !COORD_RE.test(lomin) ||
        !COORD_RE.test(lamax) ||
        !COORD_RE.test(lomax)
      ) {
        return applyCors(
          Response.json({ error: "Invalid coordinates" }, { status: 400 }),
          origin,
        );
      }
      return applyCors(await fetchStatesCached(lamin, lomin, lamax, lomax), origin);
    }

    return applyCors(
      Response.json({ error: "Missing bounding box or track params" }, { status: 400 }),
      origin,
    );
  } catch (error) {
    console.warn("opensky-proxy failure:", error);
    return applyCors(Response.json({ error: "Proxy failed" }, { status: 500 }), origin);
  }
});
