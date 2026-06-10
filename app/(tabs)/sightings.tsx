import ScreenHeader from "@/components/ui/ScreenHeader";
import { ErrorView, LoadingView } from "@/components/ui/StateViews";
import StatsRow from "@/components/ui/StatsRow";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { getStatusColor, getStatusLabel } from "@/lib/status";
import { router } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSightings } from "../../hooks/useSightings";

export default function SightingsScreen() {
  const { sightings, loading, error, refetch } = useSightings();

  const unresolved = sightings.filter(
    (s) => s.status === "unexplained" || s.status === "pending",
  ).length;

  const corroborations = sightings.reduce((sum, s) => sum + s.corroborations, 0);

  if (loading) {
    return <LoadingView />;
  }

  if (error) {
    return <ErrorView message={`Error: ${error}`} onRetry={refetch} />;
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="My Sightings"
        subtitle={`${sightings.length} Reports Submitted`}
      />

      <ScrollView contentContainerStyle={styles.inner}>
        <StatsRow
          stats={[
            { label: "TOTAL REPORTS", value: sightings.length },
            { label: "UNRESOLVED", value: unresolved },
            { label: "CORROBORATIONS", value: corroborations },
          ]}
        />

        {/* Empty state */}
        {sightings.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No sightings yet</Text>
            <Text style={styles.emptyBody}>
              Tap File Report on the map to submit your first sighting.
            </Text>
          </View>
        )}

        {/* Sighting cards */}
        {sightings.map((sighting) => (
          <TouchableOpacity
            key={sighting.id}
            style={styles.sightingCard}
            onPress={() =>
              router.push(`/(tabs)/map/sighting/${sighting.id}` as any)
            }
          >
            <Text
              style={[
                styles.statusLabel,
                { color: getStatusColor(sighting.status) },
              ]}
            >
              {(sighting.matched_flight
                ? sighting.matched_flight
                : getStatusLabel(sighting.status)
              ).toUpperCase()}
            </Text>

            <Text style={styles.cardLocation}>
              {sighting.latitude.toFixed(4)}° N ·{" "}
              {Math.abs(sighting.longitude).toFixed(4)}° W
            </Text>

            <Text style={styles.cardDate}>{sighting.sighted_at}</Text>

            <Text style={styles.cardDescription} numberOfLines={2}>
              {sighting.description || "No description provided."}
            </Text>

            <Text style={styles.corrobLabel}>{sighting.corroborations} Corroboration{sighting.corroborations !== 1 ? "s" : ""}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  inner: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
    gap: 12,
  },
  emptyState: {
    borderWidth: 2,
    borderColor: Colors.white,
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: {
    fontFamily: Fonts.display,
    fontSize: 14,
    color: Colors.white,
    letterSpacing: 1,
  },
  emptyBody: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.muted,
    textAlign: "center",
    lineHeight: 16,
  },
  sightingCard: {
    borderWidth: 2,
    borderColor: Colors.white,
    backgroundColor: Colors.surface,
    padding: 14,
    gap: 6,
  },
  statusLabel: {
    fontFamily: Fonts.display,
    fontSize: 11,
    letterSpacing: 1,
  },
  cardLocation: {
    fontFamily: Fonts.display,
    fontSize: 12,
    color: Colors.white,
    letterSpacing: 0.5,
  },
  cardDate: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: Colors.muted,
    letterSpacing: 1,
  },
  cardDescription: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.muted,
    lineHeight: 16,
  },
  corrobLabel: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: Colors.muted,
    letterSpacing: 1,
    marginTop: 4,
  },
});
