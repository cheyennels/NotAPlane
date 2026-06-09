import ReportStepShell from "@/components/report/ReportStepShell";
import BottomActionBar from "@/components/ui/BottomActionBar";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import PillGroup from "@/components/ui/PillGroup";
import SectionLabel from "@/components/ui/SectionLabel";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet } from "react-native";
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
        <BottomActionBar>
          <Button label="Continue" onPress={handleContinue} />
          <Button
            label="Cancel"
            variant="outline"
            onPress={() => router.replace("/(tabs)/map" as any)}
          />
        </BottomActionBar>
      }
    >
      <SectionLabel>Direction of Travel</SectionLabel>
      <PillGroup
        options={DIRECTIONS}
        selected={direction}
        onSelect={setDirection}
        style={styles.pillGrid}
      />

      <SectionLabel>Estimated Altitude</SectionLabel>
      <PillGroup
        options={ALTITUDES}
        selected={altitude}
        onSelect={setAltitude}
        style={styles.pillGrid}
      />

      <SectionLabel>Movement Type</SectionLabel>
      <PillGroup
        options={MOVEMENTS}
        selected={movement}
        onSelect={setMovement}
        style={styles.pillGrid}
      />

      <FormField
        label="Speed of Object"
        placeholder="estimated speed"
        value={speed}
        onChangeText={setSpeed}
      />
    </ReportStepShell>
  );
}

const styles = StyleSheet.create({
  pillGrid: {
    marginBottom: 24,
  },
});
