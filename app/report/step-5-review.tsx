import ReportStepShell from "@/components/report/ReportStepShell";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { analyzeSighting } from "@/lib/analysis";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useReport } from "../../context/ReportContext";
import { supabase } from "../../lib/supabase";

export default function StepFiveReview() {
  const { form, resetForm } = useReport();
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      Alert.alert("Error", "You must be logged in to submit a sighting.");
      setLoading(false);
      return;
    }

    const { data: inserted, error } = await supabase
      .from("sightings")
      .insert({
        user_id: user.id,
        sighted_at: `${form.date} ${form.time}`,
        duration: form.duration,
        latitude: form.latitude,
        longitude: form.longitude,
        description: form.description,
        shape: form.shape,
        colors: form.colors,
        sound: form.sound,
        photo_urls: form.photoUris,
        direction: form.direction,
        altitude: form.altitude,
        movement: form.movement,
        speed: form.speed,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      Alert.alert("Error", error.message);
      setLoading(false);
      return;
    }

    resetForm();
    router.replace("/report/result" as any);
    setLoading(false);

    // Run analysis in background after navigation
    if (inserted) {
      analyzeSighting(
        inserted.id,
        inserted.latitude,
        inserted.longitude,
        inserted.sighted_at,
      );
    }
  }

  return (
    <ReportStepShell
      step={5}
      stepHeading="Review & Submit"
      footer={
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.black} />
            ) : (
              <Text style={styles.submitBtnText}>Submit Report</Text>
            )}
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
          {form.date}
          {"\n"}
          {form.time}
        </Text>
      </View>

      <View style={styles.reviewRow}>
        <Text style={styles.reviewKey}>LOCATION</Text>
        <Text style={[styles.reviewVal, styles.reviewValGreen]}>
          {form.latitude.toFixed(4)}° N{"\n"}
          {Math.abs(form.longitude).toFixed(4)}° W
        </Text>
      </View>

      <View style={styles.reviewRow}>
        <Text style={styles.reviewKey}>DURATION</Text>
        <Text style={styles.reviewVal}>{form.duration || "—"}</Text>
      </View>

      <View style={styles.reviewRow}>
        <Text style={styles.reviewKey}>DESCRIPTION</Text>
        <Text style={[styles.reviewVal, styles.reviewValSmall]}>
          {form.description || "—"}
        </Text>
      </View>

      <View style={styles.reviewRow}>
        <Text style={styles.reviewKey}>SHAPE</Text>
        <Text style={styles.reviewVal}>{form.shape || "—"}</Text>
      </View>

      <View style={styles.reviewRow}>
        <Text style={styles.reviewKey}>COLOR</Text>
        <Text style={styles.reviewVal}>
          {form.colors.length > 0 ? form.colors.join(", ") : "—"}
        </Text>
      </View>

      <View style={styles.reviewRow}>
        <Text style={styles.reviewKey}>DIRECTION</Text>
        <Text style={styles.reviewVal}>{form.direction || "—"}</Text>
      </View>

      <View style={styles.reviewRow}>
        <Text style={styles.reviewKey}>ALTITUDE</Text>
        <Text style={styles.reviewVal}>{form.altitude || "—"}</Text>
      </View>

      <View style={styles.reviewRow}>
        <Text style={styles.reviewKey}>SOUND</Text>
        <Text style={styles.reviewVal}>{form.sound || "—"}</Text>
      </View>

      <View style={styles.reviewRow}>
        <Text style={styles.reviewKey}>SPEED</Text>
        <Text style={styles.reviewVal}>{form.speed || "—"}</Text>
      </View>

      <View style={[styles.reviewRow, styles.reviewRowLast]}>
        <Text style={styles.reviewKey}>PHOTO</Text>
        <Text style={[styles.reviewVal, styles.reviewValGreen]}>
          {form.photoUris.length > 0
            ? `${form.photoUris.length} attached`
            : "None"}
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
  btnDisabled: {
    opacity: 0.5,
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
