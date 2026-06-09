import ScreenHeader from "@/components/ui/ScreenHeader";
import SectionLabel from "@/components/ui/SectionLabel";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
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
  count: number;
  location: string;
  created_at: string;
};

export default function ActivityScreen() {
  const [newItems, setNewItems] = useState<ActivityItem[]>([]);
  const [olderItems, setOlderItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActivity() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Get all sightings by the current user
      const { data: sightings } = await supabase
        .from("sightings")
        .select("id, location_description, latitude, longitude")
        .eq("user_id", user.id);

      if (!sightings?.length) {
        setLoading(false);
        return;
      }

      const sightingIds = sightings.map((s) => s.id);

      // Get corroborations on those sightings
      const { data: corroborations } = await supabase
        .from("corroborations")
        .select("id, sighting_id, created_at")
        .in("sighting_id", sightingIds)
        .order("created_at", { ascending: false });

      if (!corroborations?.length) {
        setLoading(false);
        return;
      }

      // Group by sighting_id and count
      const grouped: Record<string, { count: number; created_at: string }> = {};
      for (const c of corroborations) {
        if (!grouped[c.sighting_id]) {
          grouped[c.sighting_id] = { count: 0, created_at: c.created_at };
        }
        grouped[c.sighting_id].count++;
      }

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const items: ActivityItem[] = Object.entries(grouped).map(
        ([sighting_id, { count, created_at }]) => {
          const sighting = sightings.find((s) => s.id === sighting_id);
          const location =
            sighting?.location_description ||
            `${sighting?.latitude?.toFixed(2)}, ${sighting?.longitude?.toFixed(2)}` ||
            "Unknown location";
          return { id: sighting_id, sighting_id, count, location, created_at };
        },
      );

      setNewItems(items.filter((i) => new Date(i.created_at) >= weekAgo));
      setOlderItems(items.filter((i) => new Date(i.created_at) < weekAgo));
      setLoading(false);
    }

    fetchActivity();
  }, []);

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
        onPress={() => {}}
      >
        <Text style={styles.notifText}>
          {`${item.count} ${item.count === 1 ? "PERSON" : "PEOPLE"} CORROBORATED YOUR SIGHTING IN ${item.location.toUpperCase()}`}
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
});
