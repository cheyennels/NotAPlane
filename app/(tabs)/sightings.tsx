import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { router } from "expo-router";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSightings } from "../../hooks/useSightings";

function getStatusColor(status: string) {
  switch (status) {
    case "unexplained":
      return Colors.red;
    case "partial":
      return Colors.yellow;
    case "explained":
      return Colors.blue;
    default:
      return Colors.green;
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "unexplained":
      return "Unexplained";
    case "partial":
      return "Partial Match";
    case "explained":
      return "Explained";
    default:
      return "Pending";
  }
}

export default function SightingsScreen() {
  const { sightings, loading, error, refetch } = useSightings();

  const unresolved = sightings.filter(
    (s) => s.status === "unexplained" || s.status === "pending",
  ).length;

  const corroborations = 0; // will wire up later

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={Colors.green} size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity onPress={refetch}>
          <Text style={styles.retryText}>Tap to retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Sightings</Text>
        <Text style={styles.headerSub}>
          {sightings.length} Reports Submitted
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.inner}>
        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>TOTAL REPORTS</Text>
            <Text style={styles.statVal}>{sightings.length}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>UNRESOLVED</Text>
            <Text style={styles.statVal}>{unresolved}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>CORROBORATIONS</Text>
            <Text style={styles.statVal}>{corroborations}</Text>
          </View>
        </View>

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
            {sighting.matched_flight ? (
              <Text
                style={[
                  styles.matchLabel,
                  { color: getStatusColor(sighting.status) },
                ]}
              >
                {sighting.matched_flight.toUpperCase()}
              </Text>
            ) : (
              <Text
                style={[
                  styles.statusLabel,
                  { color: getStatusColor(sighting.status) },
                ]}
              >
                {getStatusLabel(sighting.status).toUpperCase()}
              </Text>
            )}

            <Text style={styles.cardLocation}>
              {sighting.latitude.toFixed(4)}° N ·{" "}
              {Math.abs(sighting.longitude).toFixed(4)}° W
            </Text>

            <Text style={styles.cardDate}>{sighting.sighted_at}</Text>

            <Text style={styles.cardDescription} numberOfLines={2}>
              {sighting.description || "No description provided."}
            </Text>

            <Text style={styles.corrobLabel}>0 Corroborations</Text>
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
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.black,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  errorText: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.red,
    textAlign: "center",
  },
  retryText: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.green,
    textAlign: "center",
    textDecorationLine: "underline",
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerTitle: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: Colors.white,
    letterSpacing: 1,
    marginBottom: 4,
  },
  headerSub: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.muted,
    letterSpacing: 1,
  },
  inner: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
    gap: 12,
  },
  statsRow: {
    flexDirection: "row",
    gap: 0,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    padding: 12,
  },
  statLabel: {
    fontFamily: Fonts.mono,
    fontSize: 8,
    color: Colors.green,
    letterSpacing: 1,
    marginBottom: 6,
    lineHeight: 13,
    textTransform: "uppercase",
  },
  statVal: {
    fontFamily: Fonts.display,
    fontSize: 24,
    color: Colors.white,
    letterSpacing: 1,
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
  matchLabel: {
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
