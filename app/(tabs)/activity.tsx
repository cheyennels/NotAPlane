import ScreenHeader from "@/components/ui/ScreenHeader";
import SectionLabel from "@/components/ui/SectionLabel";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
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
  id: string;
  sighting_id: string;
  location: string;
  created_at: string;
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

    const { data: corroborations, error: corroborationsError } = await supabase
      .from("corroborations")
      .select("id, sighting_id, created_at")
      .in("sighting_id", sightingIds)
      .order("created_at", { ascending: false });

    if (corroborationsError) {
      setError(corroborationsError.message);
      setLoading(false);
      return;
    }

    if (!corroborations?.length) {
      setNewItems([]);
      setOlderItems([]);
      setLoading(false);
      return;
    }

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const items: ActivityItem[] = corroborations.map((corroboration) => ({
      id: corroboration.id,
      sighting_id: corroboration.sighting_id,
      location:
        locationById.get(corroboration.sighting_id) ?? "Unknown location",
      created_at: corroboration.created_at,
    }));

    setNewItems(items.filter((item) => new Date(item.created_at) >= weekAgo));
    setOlderItems(items.filter((item) => new Date(item.created_at) < weekAgo));
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchActivity();
    }, [fetchActivity]),
  );

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return (
      d.toLocaleDateString("en-US", { month: "long", day: "numeric" }) +
      " · " +
      d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    );
  }

  function renderItem(item: ActivityItem) {
    return (
      <TouchableOpacity
        key={item.id}
        style={styles.notifCard}
        onPress={() =>
          router.push(`/(tabs)/map/sighting/${item.sighting_id}` as any)
        }
      >
        <Text style={styles.notifText}>
          {`SOMEONE CORROBORATED YOUR SIGHTING NEAR ${item.location.toUpperCase()}`}
        </Text>
        <Text style={styles.notifDate}>{formatDate(item.created_at)}</Text>
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
