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
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.continueBtn} onPress={handleContinue}>
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
      <Text style={styles.bigDate}>{formatDate(date)}</Text>
      <Text style={styles.bigTime}>{formatTime(date)}</Text>

      {/* Use now button */}
      <TouchableOpacity style={styles.useNowBtn} onPress={useNow}>
        <Text style={styles.useNowText}>Set to current date and time</Text>
      </TouchableOpacity>

      {/* Date field */}
      <Text style={styles.label}>DATE</Text>
      <TextInput
        style={styles.textInput}
        placeholder="date of event"
        placeholderTextColor={Colors.muted}
        value={dateText}
        onChangeText={handleDateChange}
      />

      {/* Time field */}
      <Text style={styles.label}>TIME</Text>
      <TextInput
        style={styles.textInput}
        placeholder="time (24 hour clock)"
        placeholderTextColor={Colors.muted}
        value={timeText}
        onChangeText={handleTimeChange}
        keyboardType="numbers-and-punctuation"
      />

      {/* Duration field */}
      <Text style={styles.label}>LENGTH OF OBSERVAITON</Text>
      <TextInput
        style={styles.textInput}
        placeholder="length of time"
        placeholderTextColor={Colors.muted}
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
    borderWidth: 2,
    borderColor: Colors.green,
    padding: 14,
    alignItems: "center",
    marginBottom: 28,
    backgroundColor: "rgba(57,255,20,0.07)",
  },
  useNowText: {
    fontFamily: Fonts.display,
    fontSize: 10,
    color: Colors.green,
    letterSpacing: 1,
  },
  label: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: Colors.green,
    letterSpacing: 2,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: Colors.surface2,
    borderWidth: 2,
    borderColor: Colors.white,
    padding: 14,
    marginBottom: 16,
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
