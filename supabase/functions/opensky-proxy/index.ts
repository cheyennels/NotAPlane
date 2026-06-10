// @ts-nocheck
const OPENSKY_TIMEOUT_MS = 15_000;
const TOKEN_URL =
  "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token";
const TOKEN_REFRESH_MARGIN_MS = 30_000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
};

let tokenCache: { token: string; expiresAt: number } | null = null;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

async function getOpenSkyAuthHeaders(): Promise<Record<string, string>> {
  const clientId = Deno.env.get("OPENSKY_CLIENT_ID");
  const clientSecret = Deno.env.get("OPENSKY_CLIENT_SECRET");

  if (clientId && clientSecret) {
    const now = Date.now();
    if (tokenCache && now < tokenCache.expiresAt) {
      return { Authorization: `Bearer ${tokenCache.token}` };
    }

    const tokenResponse = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
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
    }
  }

  const username = Deno.env.get("OPENSKY_USERNAME");
  const password = Deno.env.get("OPENSKY_PASSWORD");
  if (username && password && username !== "your_username") {
    return {
      Authorization: `Basic ${btoa(`${username}:${password}`)}`,
    };
  }

  return {};
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const url = new URL(req.url);

  if (url.searchParams.get("ping") === "1") {
    return jsonResponse({ ok: true });
  }

  try {
    const lamin = url.searchParams.get("lamin");
    const lomin = url.searchParams.get("lomin");
    const lamax = url.searchParams.get("lamax");
    const lomax = url.searchParams.get("lomax");
    const icao24 = url.searchParams.get("icao24");

    let openskyUrl: string | null = null;

    if (icao24 && url.searchParams.has("time")) {
      openskyUrl = `https://opensky-network.org/api/tracks/all?icao24=${icao24}&time=${url.searchParams.get("time")}`;
    } else if (lamin && lomin && lamax && lomax) {
      openskyUrl =
        `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;
    }

    if (!openskyUrl) {
      return jsonResponse({ error: "Missing bounding box or track params" }, 400);
    }

    const authHeaders = await getOpenSkyAuthHeaders();
    const headers: Record<string, string> = {
      Accept: "application/json",
      "User-Agent": "NotAPlane/1.0 (Supabase Edge)",
      ...authHeaders,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OPENSKY_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(openskyUrl, {
        headers,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const body = await response.text();
      return jsonResponse(
        { error: "OpenSky API error", status: response.status, body },
        response.status,
      );
    }

    const data = await response.json();
    return jsonResponse(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isTimeout = message.includes("abort") || message.includes("Abort");
    return jsonResponse(
      {
        error: isTimeout ? "OpenSky request timed out" : "Proxy failed",
        message,
      },
      isTimeout ? 504 : 500,
    );
  }
});
