import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export type Sighting = {
  id: string;
  sighted_at: string;
  duration: string;
  latitude: number;
  longitude: number;
  description: string;
  shape: string;
  colors: string[];
  sound: string;
  direction: string;
  altitude: string;
  movement: string;
  speed: string;
  status: string;
  matched_flight: string | null;
  matched_celestial: string | null;
  created_at: string;
  corroborations: number;
};

export function useSightings() {
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSightings();
  }, []);

  async function fetchSightings() {
    setLoading(true);
    const { data, error } = await supabase
      .from("sightings")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const rows = data || [];

    if (rows.length === 0) {
      setSightings([]);
      setLoading(false);
      return;
    }

    const ids = rows.map((s) => s.id);
    const { data: corrobRows } = await supabase
      .from("corroborations")
      .select("sighting_id")
      .in("sighting_id", ids);

    const counts: Record<string, number> = {};
    for (const row of corrobRows || []) {
      counts[row.sighting_id] = (counts[row.sighting_id] ?? 0) + 1;
    }

    setSightings(rows.map((s) => ({ ...s, corroborations: counts[s.id] ?? 0 })));
    setLoading(false);
  }

  return { sightings, loading, error, refetch: fetchSightings };
}
