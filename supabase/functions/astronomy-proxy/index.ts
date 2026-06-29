// @ts-nocheck
// AstronomyAPI proxy. Holds the AstronomyAPI app id/secret server-side so they
// never ship in the client bundle. Requires an authenticated NotAPlane user.
const ASTRONOMY_TIMEOUT_MS = 12_000;
const ASTRONOMY_URL = "https://api.astronomyapi.com/api/v2/bodies/positions";

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
  if (configured.length === 0) return origin || "*";
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

function corsJson(body: unknown, status: number, origin: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

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

const NUMBER_RE = /^-?\d{1,4}(\.\d+)?$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}:\d{2}$/;

Deno.serve(async (req) => {
  const origin = resolveAllowedOrigin(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (!isAuthenticatedUser(req)) {
    return corsJson({ error: "Unauthorized" }, 401, origin);
  }

  const appId = Deno.env.get("ASTRONOMY_APP_ID");
  const appSecret = Deno.env.get("ASTRONOMY_APP_SECRET");
  if (!appId || !appSecret) {
    console.warn("AstronomyAPI credentials are not configured");
    return corsJson({ error: "Astronomy service unavailable" }, 503, origin);
  }

  const url = new URL(req.url);
  const latitude = url.searchParams.get("latitude") ?? "";
  const longitude = url.searchParams.get("longitude") ?? "";
  const elevation = url.searchParams.get("elevation") ?? "0";
  const fromDate = url.searchParams.get("from_date") ?? "";
  const toDate = url.searchParams.get("to_date") ?? "";
  const time = url.searchParams.get("time") ?? "";

  if (
    !NUMBER_RE.test(latitude) ||
    !NUMBER_RE.test(longitude) ||
    !NUMBER_RE.test(elevation) ||
    !DATE_RE.test(fromDate) ||
    !DATE_RE.test(toDate) ||
    !TIME_RE.test(time)
  ) {
    return corsJson({ error: "Invalid parameters" }, 400, origin);
  }

  const params = new URLSearchParams({
    latitude,
    longitude,
    elevation,
    from_date: fromDate,
    to_date: toDate,
    time,
  });

  const auth = btoa(`${appId}:${appSecret}`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ASTRONOMY_TIMEOUT_MS);

  try {
    const response = await fetch(`${ASTRONOMY_URL}?${params}`, {
      headers: { Authorization: `Basic ${auth}` },
      signal: controller.signal,
    });

    if (!response.ok) {
      console.warn("AstronomyAPI error:", response.status, await response.text());
      return corsJson({ error: "Celestial data unavailable" }, response.status, origin);
    }

    return corsJson(await response.json(), 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isTimeout = message.includes("abort") || message.includes("Abort");
    console.warn("astronomy-proxy failure:", message);
    return corsJson(
      { error: isTimeout ? "Astronomy request timed out" : "Astronomy proxy failed" },
      isTimeout ? 504 : 500,
      origin,
    );
  } finally {
    clearTimeout(timeout);
  }
});
