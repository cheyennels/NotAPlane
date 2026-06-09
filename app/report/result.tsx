import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { router, useLocalSearchParams } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  explained: { color: Colors.blue, label: "Explained" },
  partial: { color: Colors.green, label: "Partial Match" },
  unexplained: { color: Colors.red ?? "#ff4444", label: "Unexplained" },
  pending: { color: Colors.muted, label: "Pending" },
};

export default function ResultScreen() {
  const { status, matchedFlight, matchedCelestial } = useLocalSearchParams<{
    status: string;
    matchedFlight: string;
    matchedCelestial: string;
  }>();

  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;

  const flightLabel =
    matchedFlight && matchedFlight !== "null" ? matchedFlight : null;
  const celestialLabel =
    matchedCelestial && matchedCelestial !== "null" ? matchedCelestial : null;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner}>
        <Text style={styles.title}>Analysis Complete</Text>

        {/* Status badge */}
        <View style={[styles.statusBadge, { borderColor: cfg.color }]}>
          <View style={[styles.statusDot, { backgroundColor: cfg.color }]} />
          <Text style={[styles.statusLabel, { color: cfg.color }]}>
            {cfg.label.toUpperCase()}
          </Text>
        </View>

        {/* Flight card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View
              style={[
                styles.dot,
                { backgroundColor: flightLabel ? Colors.blue : Colors.muted },
              ]}
            />
            <Text
              style={[
                styles.cardHeaderText,
                { color: flightLabel ? Colors.blue : Colors.muted },
              ]}
            >
              Aircraft
            </Text>
          </View>
          {flightLabel ? (
            <>
              <Text style={styles.matchTitle}>{flightLabel}</Text>
              <Text style={styles.matchBody}>
                A flight matching callsign {flightLabel} was detected within
                range of your location at the time of the sighting.
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.matchTitle}>No Aircraft Matched</Text>
              <Text style={styles.matchBody}>
                No airborne flights were detected within range of your location
                at the time of the sighting.
              </Text>
            </>
          )}
        </View>

        {/* Celestial card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: celestialLabel ? Colors.blue : Colors.muted,
                },
              ]}
            />
            <Text
              style={[
                styles.cardHeaderText,
                { color: celestialLabel ? Colors.blue : Colors.muted },
              ]}
            >
              Celestial
            </Text>
          </View>
          {celestialLabel ? (
            <>
              <Text style={styles.matchTitle}>{celestialLabel}</Text>
              <Text style={styles.matchBody}>
                {celestialLabel} was visible above the horizon at your location
                and time, and may account for the sighting.
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.matchTitle}>No Celestial Body Matched</Text>
              <Text style={styles.matchBody}>
                No known planets or the Moon were prominently visible at the
                reported position and time.
              </Text>
            </>
          )}
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.returnBtn}
          onPress={() => router.replace("/(tabs)/map" as any)}
        >
          <Text style={styles.returnBtnText}>Return Home</Text>
        </TouchableOpacity>
      </View>
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
    paddingTop: 80,
    paddingBottom: 24,
    gap: 16,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: Colors.white,
    letterSpacing: 1,
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLabel: {
    fontFamily: Fonts.display,
    fontSize: 11,
    letterSpacing: 2,
  },
  card: {
    marginVertical: 8,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
    paddingBottom: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  cardHeaderText: {
    fontFamily: Fonts.display,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  matchTitle: {
    fontFamily: Fonts.display,
    fontSize: 16,
    color: Colors.white,
    letterSpacing: 1,
    marginBottom: 10,
    lineHeight: 24,
  },
  matchBody: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.muted,
    lineHeight: 17,
  },
  bottomBar: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: Colors.black,
  },
  returnBtn: {
    backgroundColor: Colors.green,
    padding: 16,
    alignItems: "center",
  },
  returnBtnText: {
    fontFamily: Fonts.display,
    fontSize: 12,
    color: Colors.black,
    letterSpacing: 1,
  },
});
