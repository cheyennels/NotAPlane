import ReportStepShell from "@/components/report/ReportStepShell";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { router } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

// Temporary mock data - we'll replace this with real state later
const mockReport = {
  date: "June 28th, 2026",
  time: "18:25",
  duration: "~ 5 minutes",
  latitude: "44.9778 * N",
  longitude: "44.9778 * W",
  description:
    "Bright silent disk, moving NW. Stopped for about 4 minutes, I took attached photo before it sped off and vanished.",
  shape: "Cigar / Unknown / Other",
  color: "Blue",
  direction: "Northwest",
  altitude: "High",
  sound: "Silent",
  speed: "Unknown",
  photos: "1 attached",
};

export default function StepFiveReview() {
  return (
    <ReportStepShell
      step={5}
      stepHeading="Review & Submit"
      footer={
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={() => router.push("/report/result" as any)}
          >
            <Text style={styles.submitBtnText}>Submit Report</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => router.replace("/report/step-1-when" as any)}
          >
            <Text style={styles.editBtnText}>Edit Report</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => router.replace("/(tabs)/map" as any)}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      }
    >
      <View style={styles.reviewRow}>
        <Text style={styles.reviewKey}>DATE & TIME</Text>
        <Text style={styles.reviewVal}>
          {mockReport.date}
          {"\n"}
          {mockReport.time}
        </Text>
      </View>

      <View style={styles.reviewRow}>
        <Text style={styles.reviewKey}>LOCATION</Text>
        <Text style={[styles.reviewVal, styles.reviewValGreen]}>
          {mockReport.latitude}
          {"\n"}
          {mockReport.longitude}
        </Text>
      </View>

      <View style={styles.reviewRow}>
        <Text style={styles.reviewKey}>DURATION</Text>
        <Text style={styles.reviewVal}>{mockReport.duration}</Text>
      </View>

      <View style={styles.reviewRow}>
        <Text style={styles.reviewKey}>DESCRIPTION</Text>
        <Text style={[styles.reviewVal, styles.reviewValSmall]}>
          {mockReport.description}
        </Text>
      </View>

      <View style={styles.reviewRow}>
        <Text style={styles.reviewKey}>SHAPE</Text>
        <Text style={styles.reviewVal}>{mockReport.shape}</Text>
      </View>

      <View style={styles.reviewRow}>
        <Text style={styles.reviewKey}>COLOR</Text>
        <Text style={styles.reviewVal}>{mockReport.color}</Text>
      </View>

      <View style={styles.reviewRow}>
        <Text style={styles.reviewKey}>DIRECTION</Text>
        <Text style={styles.reviewVal}>{mockReport.direction}</Text>
      </View>

      <View style={styles.reviewRow}>
        <Text style={styles.reviewKey}>ALTITUDE</Text>
        <Text style={styles.reviewVal}>{mockReport.altitude}</Text>
      </View>

      <View style={styles.reviewRow}>
        <Text style={styles.reviewKey}>SOUND</Text>
        <Text style={styles.reviewVal}>{mockReport.sound}</Text>
      </View>

      <View style={styles.reviewRow}>
        <Text style={styles.reviewKey}>SPEED</Text>
        <Text style={styles.reviewVal}>{mockReport.speed}</Text>
      </View>

      <View style={[styles.reviewRow, styles.reviewRowLast]}>
        <Text style={styles.reviewKey}>PHOTO</Text>
        <Text style={[styles.reviewVal, styles.reviewValGreen]}>
          {mockReport.photos}
        </Text>
      </View>
    </ReportStepShell>
  );
}

const styles = StyleSheet.create({
  reviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 16,
    gap: 16,
  },
  reviewRowLast: {
    borderBottomWidth: 0,
  },
  reviewKey: {
    fontFamily: Fonts.display,
    fontSize: 12,
    color: Colors.white,
    letterSpacing: 1,
    textTransform: "uppercase",
    flexShrink: 0,
    paddingTop: 2,
  },
  reviewVal: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.muted,
    textAlign: "right",
    flex: 1,
    lineHeight: 16,
  },
  reviewValGreen: {
    color: Colors.green,
  },
  reviewValSmall: {
    fontSize: 12,
    lineHeight: 15,
  },
  bottomBar: {
    padding: 16,
    paddingBottom: 32,
    gap: 10,
    backgroundColor: Colors.black,
  },
  submitBtn: {
    backgroundColor: Colors.green,
    padding: 16,
    alignItems: "center",
  },
  submitBtnText: {
    fontFamily: Fonts.display,
    fontSize: 12,
    color: Colors.black,
    letterSpacing: 1,
  },
  editBtn: {
    borderWidth: 2,
    borderColor: Colors.green,
    padding: 16,
    alignItems: "center",
    backgroundColor: Colors.darkGreen,
  },
  editBtnText: {
    fontFamily: Fonts.display,
    fontSize: 12,
    color: Colors.green,
    letterSpacing: 1,
  },
  cancelBtn: {
    borderWidth: 2,
    borderColor: Colors.white,
    padding: 16,
    alignItems: "center",
  },
  cancelBtnText: {
    fontFamily: Fonts.display,
    fontSize: 12,
    color: Colors.white,
    letterSpacing: 1,
  },
});
