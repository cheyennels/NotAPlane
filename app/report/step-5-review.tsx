import ReportStepShell from "@/components/report/ReportStepShell";
import BottomActionBar from "@/components/ui/BottomActionBar";
import Button from "@/components/ui/Button";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { computeSightingAnalysis } from "@/lib/analysis";
import { notify } from "@/lib/notify";
import { uploadPhotos } from "@/lib/uploadPhoto";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
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
      notify("Error", "You must be logged in to submit a sighting.");
      setLoading(false);
      return;
    }

    const sightedAt = `${form.date} ${form.time}`;
    const analysis = await computeSightingAnalysis(
      form.latitude,
      form.longitude,
      sightedAt,
    );

    const status = analysis?.status ?? "pending";
    const matchedFlight = analysis?.matchedFlight ?? null;
    const matchedCelestial = analysis?.matchedCelestial ?? null;
    const matchedSatellite = analysis?.matchedSatellite ?? null;

    let photoUrls: string[] = [];
    if (form.photoUris.length > 0) {
      const { urls, error: uploadError } = await uploadPhotos(form.photoUris, user.id);
      if (uploadError) {
        notify("Upload Failed", uploadError);
        setLoading(false);
        return;
      }
      photoUrls = urls;
    }

    const { error } = await supabase.from("sightings").insert({
      user_id: user.id,
      sighted_at: sightedAt,
      duration: form.duration,
      latitude: form.latitude,
      longitude: form.longitude,
      description: form.description,
      shape: form.shape,
      colors: form.colors,
      sound: form.sound,
      photo_urls: photoUrls,
      direction: form.direction,
      altitude: form.altitude,
      movement: form.movement,
      speed: form.speed,
      status,
      matched_flight: matchedFlight,
      matched_celestial: matchedCelestial,
      matched_satellite: matchedSatellite,
    });

    if (error) {
      notify("Error", error.message);
      setLoading(false);
      return;
    }

    resetForm();

    setLoading(false);
    router.replace({
      pathname: "/report/result" as any,
      params: { status, matchedFlight, matchedCelestial, matchedSatellite },
    });
  }

  return (
    <ReportStepShell
      step={5}
      stepHeading="Review & Submit"
      footer={
        <BottomActionBar>
          <Button
            label="Submit Report"
            onPress={handleSubmit}
            disabled={loading}
            loading={loading}
          />
          <Button
            label="Edit Report"
            variant="accent"
            onPress={() => router.replace("/report/step-1-when" as any)}
          />
          <Button
            label="Cancel"
            variant="outline"
            onPress={() => router.replace("/(tabs)/map" as any)}
          />
        </BottomActionBar>
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
});
