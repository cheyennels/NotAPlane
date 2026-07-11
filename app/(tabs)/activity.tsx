import ScreenHeader from "@/components/ui/ScreenHeader";
import SectionLabel from "@/components/ui/SectionLabel";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { getCorroborationCounts } from "@/lib/corroborations";
import { supabase } from "@/lib/supabase";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type ActivityItem = {
  sighting_id: string;
  location: string;
  total: number;
  recent: number;
};

function formatLocation(latitude: number, longitude: number): string {
  const latSuffix = latitude >= 0 ? "N" : "S";
  const lngSuffix = longitude >= 0 ? "E" : "W";
  return `${Math.abs(latitude).toFixed(2)}° ${latSuffix} · ${Math.abs(longitude).toFixed(2)}° ${lngSuffix}`;
}

export default function ActivityScreen() {
  const [newItems, setNewItems] = useState<ActivityItem[]>([]);
  const [olderItems, setOlderItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivity = useCallback(async () => {
    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setNewItems([]);
      setOlderItems([]);
      setLoading(false);
      return;
    }

    const { data: sightings, error: sightingsError } = await supabase
      .from("sightings")
      .select("id, latitude, longitude")
      .eq("user_id", user.id);

    if (sightingsError) {
      setError(sightingsError.message);
      setLoading(false);
      return;
    }

    if (!sightings?.length) {
      setNewItems([]);
      setOlderItems([]);
      setLoading(false);
      return;
    }

    const sightingIds = sightings.map((s) => s.id);
    const locationById = new Map(
      sightings.map((s) => [s.id, formatLocation(s.latitude, s.longitude)]),
    );

    // Counts only — never who corroborated (see corroboration_counts RPC).
    const counts = await getCorroborationCounts(sightingIds);

    const items: ActivityItem[] = [];
    for (const s of sightings) {
      const c = counts.get(s.id);
      if (!c || c.total === 0) continue;
      items.push({
        sighting_id: s.id,
        location: locationById.get(s.id) ?? "Unknown location",
        total: c.total,
        recent: c.recent,
      });
    }

    // "New" = reports that picked up a corroboration in the last 7 days.
    setNewItems(items.filter((item) => item.recent > 0));
    setOlderItems(items.filter((item) => item.recent === 0));
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchActivity();
    }, [fetchActivity]),
  );

  function renderItem(item: ActivityItem) {
    const plural = (n: number) => (n === 1 ? "" : "S");
    const headline =
      item.recent > 0
        ? `YOUR SIGHTING NEAR ${item.location.toUpperCase()} GOT ${item.recent} NEW CORROBORATION${plural(item.recent)}`
        : `YOUR SIGHTING NEAR ${item.location.toUpperCase()}`;
    return (
      <TouchableOpacity
        key={item.sighting_id}
        style={styles.notifCard}
        onPress={() =>
          router.push(`/(tabs)/map/sighting/${item.sighting_id}` as any)
        }
      >
        <Text style={styles.notifText}>{headline}</Text>
        <Text style={styles.notifDate}>
          {`${item.total} corroboration${plural(item.total)} total`}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Activity"
        subtitle={`${newItems.length} New notifications`}
      />

      {loading ? (
        <ActivityIndicator color={Colors.green} style={{ marginTop: 40 }} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.inner}>
          <SectionLabel variant="section">New</SectionLabel>
          {newItems.length === 0 ? (
            <Text style={styles.empty}>No new activity</Text>
          ) : (
            newItems.map(renderItem)
          )}

          <SectionLabel variant="section">Older</SectionLabel>
          {olderItems.length === 0 ? (
            <Text style={styles.empty}>No older activity</Text>
          ) : (
            olderItems.map(renderItem)
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.black },
  inner: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40, gap: 10 },
  notifCard: {
    borderWidth: 2,
    borderColor: Colors.white,
    backgroundColor: Colors.surface,
    padding: 14,
    gap: 6,
  },
  notifText: {
    fontFamily: Fonts.display,
    fontSize: 10,
    color: Colors.white,
    letterSpacing: 0.5,
    lineHeight: 16,
  },
  notifDate: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: Colors.muted,
    letterSpacing: 1,
  },
  empty: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.muted,
    letterSpacing: 1,
  },
  error: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.red,
    letterSpacing: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
});
