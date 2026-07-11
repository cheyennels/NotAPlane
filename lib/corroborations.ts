import { supabase } from "./supabase";

export type CorroborationCount = {
  /** Total people who corroborated (identities never exposed). */
  total: number;
  /** How many of those landed in the last 7 days. */
  recent: number;
};

/**
 * Corroboration counts per sighting, via the `corroboration_counts` RPC. Only
 * aggregate counts come back — never who corroborated. Returns an empty map on
 * error or when given no ids.
 */
export async function getCorroborationCounts(
  sightingIds: string[],
): Promise<Map<string, CorroborationCount>> {
  const counts = new Map<string, CorroborationCount>();
  if (sightingIds.length === 0) return counts;

  const { data, error } = await supabase.rpc("corroboration_counts", {
    sighting_ids: sightingIds,
  });
  if (error || !data) return counts;

  for (const row of data as {
    sighting_id: string;
    total: number;
    recent: number;
  }[]) {
    counts.set(row.sighting_id, {
      total: Number(row.total),
      recent: Number(row.recent),
    });
  }
  return counts;
}
