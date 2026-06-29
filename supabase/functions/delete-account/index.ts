// @ts-nocheck
// Account deletion (App Store Guideline 5.1.1(v)). Removes the caller's photos,
// data rows, and auth user. Uses the service_role key, which stays server-side
// in this function's environment and never reaches the client.
import { createClient } from "@supabase/supabase-js";

const PHOTO_BUCKET = "sighting-photos";

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
    "Access-Control-Allow-Methods": "POST, OPTIONS",
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

async function deleteAllUserPhotos(admin, userId: string) {
  // Photos live at `${userId}/...`. List + remove in pages.
  for (;;) {
    const { data, error } = await admin.storage
      .from(PHOTO_BUCKET)
      .list(userId, { limit: 100 });
    if (error) {
      console.warn("Photo list failed:", error.message);
      return;
    }
    if (!data || data.length === 0) return;

    const paths = data.map((f) => `${userId}/${f.name}`);
    const { error: removeError } = await admin.storage
      .from(PHOTO_BUCKET)
      .remove(paths);
    if (removeError) {
      console.warn("Photo remove failed:", removeError.message);
      return;
    }
    if (data.length < 100) return;
  }
}

Deno.serve(async (req) => {
  const origin = resolveAllowedOrigin(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (req.method !== "POST") {
    return corsJson({ error: "Method not allowed" }, 405, origin);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return corsJson({ error: "Unauthorized" }, 401, origin);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.warn("delete-account is missing service-role configuration");
    return corsJson({ error: "Service unavailable" }, 503, origin);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Resolve the caller authoritatively from the token (don't trust client input).
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData?.user) {
    return corsJson({ error: "Unauthorized" }, 401, origin);
  }
  const userId = userData.user.id;

  try {
    await deleteAllUserPhotos(admin, userId);

    // Corroborations the user made, then their sightings (their sightings'
    // corroborations cascade via FK), then the profile row.
    await admin.from("corroborations").delete().eq("user_id", userId);
    await admin.from("sightings").delete().eq("user_id", userId);
    await admin.from("profiles").delete().eq("id", userId);

    const { error: deleteUserError } = await admin.auth.admin.deleteUser(userId);
    if (deleteUserError) {
      console.warn("auth.admin.deleteUser failed:", deleteUserError.message);
      return corsJson({ error: "Account deletion failed" }, 500, origin);
    }

    return corsJson({ ok: true }, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("delete-account failure:", message);
    return corsJson({ error: "Account deletion failed" }, 500, origin);
  }
});
