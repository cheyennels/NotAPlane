import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { router } from "expo-router";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function ResultScreen() {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner}>
        {/* Header */}
        <Text style={styles.title}>Analysis Complete</Text>
        <Text style={styles.subtitle}>
          Thank you for your report. Based on the following data, we believe
          this report has been explained as an aircraft.
        </Text>

        {/* Aircraft match card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View
              style={[styles.statusDot, { backgroundColor: Colors.blue }]}
            />
            <Text style={[styles.cardHeaderText, { color: Colors.blue }]}>
              Aircraft
            </Text>
          </View>
          <Text style={styles.matchTitle}>Delta Airlines{"\n"}WN2847</Text>
          <Text style={styles.matchBody}>
            A Boeing 737-800 was passing within 2.1 miles of your location at
            10:23 PM — approximately the time of your report. Altitude: 8,400
            ft. Heading Northwest.
          </Text>
        </View>

        {/* No celestial match card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View
              style={[styles.statusDot, { backgroundColor: Colors.muted }]}
            />
            <Text style={styles.cardHeaderText}>No Match</Text>
          </View>
          <Text style={styles.matchTitle}>No Celestial Body{"\n"}Matched</Text>
          <Text style={styles.matchBody}>
            No known stars, planets, or satellite passes were recorded at the
            reported position and time. This aspect of the sighting remains
            unresolved.
          </Text>
        </View>
      </ScrollView>

      {/* Return home button */}
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
  card: {
    marginVertical: 16,
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
  subtitle: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.muted,
    lineHeight: 18,
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
    paddingBottom: 6,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  cardHeaderText: {
    fontFamily: Fonts.display,
    fontSize: 12,
    color: Colors.muted,
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
