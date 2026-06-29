// Helpers for calling our authenticated Supabase Edge Functions. Secrets for
// upstream APIs (OpenSky, AstronomyAPI) live only inside those functions; the
// client just forwards the signed-in user's access token.
import { supabase } from "./supabase";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export function functionUrl(name: string, params?: URLSearchParams): string {
  const query = params && [...params.keys()].length ? `?${params}` : "";
  return `${supabaseUrl}/functions/v1/${name}${query}`;
}

/**
 * Authorization headers for an Edge Function call. Uses the current user's
 * access token (the functions reject the bare anon key). Falls back to the anon
 * key when signed out, which the functions answer with 401 — callers degrade
 * gracefully (cached/mock data).
 */
export async function functionAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? anonKey;
  return {
    Authorization: `Bearer ${token}`,
    apikey: anonKey,
  };
}
