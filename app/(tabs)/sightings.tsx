import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const MOCK_SIGHTINGS = [
  {
    id: "1",
    location: "Minneapolis, MN",
    date: "July 7th",
    time: "12:42 AM",
    description:
      "This flight left Florida at 5:45pm and will be landing in New York at 10:30pm. Altitude is low.",
    status: "unexplained",
    corroborations: 3,
  },
  {
    id: "2",
    location: "Eden Prairie, MN",
    date: "June 13th",
    time: "7:45 PM",
    description:
      "This flight left Florida at 5:45pm and will be landing in New York at 10:30pm. Altitude is low.",
    status: "partial",
    corroborations: 25,
  },
  {
    id: "3",
    location: "Minneapolis, MN",
    date: "May 27th",
    time: "10:14 PM",
    description:
      "This flight left Florida at 5:45pm and will be landing in New York at 10:30pm. Altitude is low.",
    status: "explained",
    match: "Delta Airlines WN2847",
    corroborations: 75,
  },
  {
    id: "4",
    location: "Minneapolis, MN",
    date: "May 27th",
    time: "10:14 PM",
    description:
      "This flight left Florida at 5:45pm and will be landing in New York at 10:30pm. Altitude is low.",
    status: "explained",
    match: "Delta Airlines WN2847",
    corroborations: 75,
  },
];

function getStatusColor(status: string) {
  switch (status) {
    case "unexplained":
      return Colors.red;
    case "partial":
      return Colors.yellow;
    case "explained":
      return Colors.blue;
    default:
      return Colors.muted;
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
      return "Unknown";
  }
}

export default function SightingsScreen() {
  const totalReports = 7;
  const unresolved = 3;
  const corroborations = 12;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Sightings</Text>
        <Text style={styles.headerSub}>{totalReports} Reports Submitted</Text>
      </View>

      <ScrollView contentContainerStyle={styles.inner}>
        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>TOTAL REPORTS</Text>
            <Text style={styles.statVal}>{totalReports}</Text>
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

        {/* Sighting cards */}
        {MOCK_SIGHTINGS.map((sighting) => (
          <TouchableOpacity
            key={sighting.id}
            style={styles.sightingCard}
            onPress={() => {}}
          >
            {/* Status label */}
            {sighting.match ? (
              <Text
                style={[
                  styles.matchLabel,
                  { color: getStatusColor(sighting.status) },
                ]}
              >
                {sighting.match.toUpperCase()}
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

            {/* Location */}
            <Text style={styles.cardLocation}>
              {sighting.location.toUpperCase()}
            </Text>

            {/* Date */}
            <Text style={styles.cardDate}>
              {sighting.date} · {sighting.time}
            </Text>

            {/* Description */}
            <Text style={styles.cardDescription}>{sighting.description}</Text>

            {/* Corroborations */}
            <Text style={styles.corrobLabel}>
              {sighting.corroborations} CORROBORATIONS
            </Text>
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
    gap: 10,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: 12,
  },
  statLabel: {
    fontFamily: Fonts.mono,
    fontSize: 8,
    color: Colors.green,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 6,
    lineHeight: 13,
  },
  statVal: {
    fontFamily: Fonts.display,
    fontSize: 24,
    color: Colors.white,
    letterSpacing: 1,
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
