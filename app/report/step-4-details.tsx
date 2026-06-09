import ReportStepShell from "@/components/report/ReportStepShell";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { router } from "expo-router";
import { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useReport } from "../../context/ReportContext";

const DIRECTIONS = [
  "North",
  "South",
  "East",
  "West",
  "Northeast",
  "Northwest",
  "Southeast",
  "Southwest",
];

const ALTITUDES = ["Low", "Medium", "High", "Unknown"];

const MOVEMENTS = ["Hovering", "Erratic", "Steady", "Stationary"];

export default function StepFourDetails() {
  const { form, updateForm } = useReport();

  const [direction, setDirection] = useState(form.direction);
  const [altitude, setAltitude] = useState(form.altitude);
  const [movement, setMovement] = useState(form.movement);
  const [speed, setSpeed] = useState(form.speed);

  function handleContinue() {
    updateForm({ direction, altitude, movement, speed });
    router.push("/report/step-5-review" as any);
  }

  return (
    <ReportStepShell
      step={4}
      stepHeading="Movement & Details"
      footer={
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.continueBtn}
            onPress={() => router.push("/report/step-5-review" as any)}
          >
            <Text style={styles.continueBtnText}>Continue</Text>
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
      <Text style={styles.label}>DIRECTION OF TRAVEL</Text>
      <View style={styles.pillGrid}>
        {DIRECTIONS.map((d) => (
          <TouchableOpacity
            key={d}
            style={[styles.pill, direction === d && styles.pillActive]}
            onPress={() => setDirection(d)}
          >
            <Text
              style={[
                styles.pillText,
                direction === d && styles.pillTextActive,
              ]}
            >
              {d}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Altitude */}
      <Text style={styles.label}>ESTIMATED ALTITUDE</Text>
      <View style={styles.pillGrid}>
        {ALTITUDES.map((a) => (
          <TouchableOpacity
            key={a}
            style={[styles.pill, altitude === a && styles.pillActive]}
            onPress={() => setAltitude(a)}
          >
            <Text
              style={[styles.pillText, altitude === a && styles.pillTextActive]}
            >
              {a}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Movement type */}
      <Text style={styles.label}>MOVEMENT TYPE</Text>
      <View style={styles.pillGrid}>
        {MOVEMENTS.map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.pill, movement === m && styles.pillActive]}
            onPress={() => setMovement(m)}
          >
            <Text
              style={[styles.pillText, movement === m && styles.pillTextActive]}
            >
              {m}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Speed */}
      <Text style={styles.label}>SPEED OF OBJECT</Text>
      <TextInput
        style={styles.textInput}
        placeholder="estimated speed"
        placeholderTextColor={Colors.muted}
        value={speed}
        onChangeText={setSpeed}
      />
    </ReportStepShell>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: Colors.green,
    letterSpacing: 2,
    marginBottom: 8,
  },
  pillGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 24,
  },
  pill: {
    borderWidth: 2,
    borderColor: Colors.white,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  pillActive: {
    borderColor: Colors.green,
    backgroundColor: "rgba(57,255,20,0.07)",
  },
  pillText: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.muted,
  },
  pillTextActive: {
    color: Colors.green,
  },
  textInput: {
    backgroundColor: Colors.surface2,
    borderWidth: 2,
    borderColor: Colors.white,
    padding: 14,
    marginBottom: 24,
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.white,
  },
  bottomBar: {
    padding: 16,
    paddingBottom: 32,
    gap: 10,
    backgroundColor: Colors.black,
  },
  continueBtn: {
    backgroundColor: Colors.green,
    padding: 16,
    alignItems: "center",
  },
  continueBtnText: {
    fontFamily: Fonts.display,
    fontSize: 12,
    color: Colors.black,
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
