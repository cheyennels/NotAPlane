import ReportStepShell from "@/components/report/ReportStepShell";
import BottomActionBar from "@/components/ui/BottomActionBar";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { useReport } from "../../context/ReportContext";

function formatDate(d: Date) {
  return d
    .toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })
    .toUpperCase();
}

function formatTime(d: Date) {
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default function StepOneWhen() {
  const [date, setDate] = useState(new Date());
  const { form, updateForm } = useReport();

  const [dateText, setDateText] = useState(form.date || formatDate(new Date()));
  const [timeText, setTimeText] = useState(form.time || formatTime(new Date()));
  const [duration, setDuration] = useState(form.duration);

  // Update context when continuing
  function handleContinue() {
    updateForm({ date: dateText, time: timeText, duration });
    router.push("/report/step-2-where" as any);
  }

  function useNow() {
    const now = new Date();
    setDate(now);
    setDateText(formatDate(now));
    setTimeText(formatTime(now));
  }

  function handleDateChange(text: string) {
    setDateText(text);
    const parsed = new Date(text);
    if (!isNaN(parsed.getTime())) {
      const next = new Date(date);
      next.setFullYear(
        parsed.getFullYear(),
        parsed.getMonth(),
        parsed.getDate(),
      );
      setDate(next);
    }
  }

  function handleTimeChange(text: string) {
    setTimeText(text);
    const match = text.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return;

    const next = new Date(date);
    next.setHours(Number(match[1]), Number(match[2]), 0, 0);
    setDate(next);
  }

  return (
    <ReportStepShell
      step={1}
      stepHeading="When did you see it?"
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
      <Text style={styles.bigDate}>{formatDate(date)}</Text>
      <Text style={styles.bigTime}>{formatTime(date)}</Text>

      {/* Use now button */}
      <Button
        label="Set to current date and time"
        variant="tint"
        onPress={useNow}
        style={styles.useNowBtn}
        labelStyle={styles.useNowText}
      />

      <FormField
        label="Date"
        placeholder="date of event"
        value={dateText}
        onChangeText={handleDateChange}
      />

      <FormField
        label="Time"
        placeholder="time (24 hour clock)"
        value={timeText}
        onChangeText={handleTimeChange}
        keyboardType="numbers-and-punctuation"
      />

      <FormField
        label="Length of Observation"
        placeholder="length of time"
        value={duration}
        onChangeText={setDuration}
      />
    </ReportStepShell>
  );
}

const styles = StyleSheet.create({
  bigDate: {
    fontFamily: Fonts.display,
    fontSize: 28,
    color: Colors.green,
    letterSpacing: 1,
    lineHeight: 38,
  },
  bigTime: {
    fontFamily: Fonts.display,
    fontSize: 28,
    color: Colors.green,
    letterSpacing: 1,
    marginBottom: 20,
  },
  useNowBtn: {
    padding: 14,
    marginBottom: 28,
  },
  useNowText: {
    fontSize: 10,
  },
});
