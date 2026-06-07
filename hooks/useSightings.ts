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
    } else {
      setSightings(data || []);
    }
    setLoading(false);
  }

  return { sightings, loading, error, refetch: fetchSightings };
}
