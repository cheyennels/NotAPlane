// @ts-nocheck
const OPENSKY_TIMEOUT_MS = 8_000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const url = new URL(req.url);

  // Health check — verify the function is reachable without calling OpenSky.
  if (url.searchParams.get("ping") === "1") {
    return jsonResponse({ ok: true });
  }

  try {
    const lamin = url.searchParams.get("lamin");
    const lomin = url.searchParams.get("lomin");
    const lamax = url.searchParams.get("lamax");
    const lomax = url.searchParams.get("lomax");
    const icao24 = url.searchParams.get("icao24");
    const time = url.searchParams.get("time");

    let openskyUrl: string | null = null;

    if (icao24 && time) {
      openskyUrl = `https://opensky-network.org/api/tracks/all?icao24=${icao24}&time=${time}`;
    } else if (lamin && lomin && lamax && lomax) {
      openskyUrl =
        `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;
    }

    if (!openskyUrl) {
      return jsonResponse({ error: "Missing bounding box or track params" }, 400);
    }

    const username = Deno.env.get("OPENSKY_USERNAME");
    const password = Deno.env.get("OPENSKY_PASSWORD");

    const headers: Record<string, string> = {
      Accept: "application/json",
      "User-Agent": "NotAPlane/1.0 (Supabase Edge)",
    };

    if (username && password && username !== "your_username") {
      headers.Authorization = `Basic ${btoa(`${username}:${password}`)}`;
    }

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
