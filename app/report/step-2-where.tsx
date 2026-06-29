import ReportLocationMap from "@/components/map/ReportLocationMap";
import ReportStepShell from "@/components/report/ReportStepShell";
import BottomActionBar from "@/components/ui/BottomActionBar";
import Button from "@/components/ui/Button";
import SectionLabel from "@/components/ui/SectionLabel";
import ToggleRow from "@/components/ui/ToggleRow";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { getDeviceLocation, type DeviceLocation } from "@/lib/getDeviceLocation";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { notify } from "@/lib/notify";
import { useReport } from "../../context/ReportContext";

export default function StepTwoWhere() {
  const { form, updateForm } = useReport();
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [locating, setLocating] = useState(false);
  const [coordinates, setCoordinates] = useState<[number, number]>([
    form.longitude,
    form.latitude,
  ]);

  function applyCoordinates(longitude: number, latitude: number) {
    setCoordinates([longitude, latitude]);
    updateForm({ latitude, longitude });
  }

  async function applyCurrentLocation(): Promise<DeviceLocation | null> {
    setLocating(true);
    try {
      const location = await getDeviceLocation();
      if (!location) return null;

      applyCoordinates(location.longitude, location.latitude);
      return location;
    } finally {
      setLocating(false);
    }
  }

  async function handleToggle() {
    if (useCurrentLocation) {
      setUseCurrentLocation(false);
      return;
    }

    const location = await applyCurrentLocation();
    setUseCurrentLocation(Boolean(location));
  }

  function formatLat(coord: number) {
    return `${Math.abs(coord).toFixed(4)}° ${coord >= 0 ? "N" : "S"}`;
  }

  function formatLng(coord: number) {
    return `${Math.abs(coord).toFixed(4)}° ${coord >= 0 ? "E" : "W"}`;
  }

  async function handleContinue() {
    let longitude = coordinates[0];
    let latitude = coordinates[1];

    if (useCurrentLocation) {
      const location = await applyCurrentLocation();
      if (!location) {
        notify(
          "Current location unavailable",
          "Allow location access or turn off the toggle and place the pin manually.",
        );
        return;
      }
      longitude = location.longitude;
      latitude = location.latitude;
    }

    updateForm({ latitude, longitude });
    router.push("/report/step-3-what" as any);
  }

  return (
    <ReportStepShell
      step={2}
      stepHeading="Where did you see it?"
      footer={
        <BottomActionBar>
          <Button
            label={locating ? "Finding location..." : "Continue"}
            onPress={handleContinue}
            disabled={locating}
          />
          <Button
            label="Cancel"
            variant="outline"
            onPress={() => router.replace("/(tabs)/map" as any)}
          />
        </BottomActionBar>
      }
    >
      <View style={styles.mapContainer}>
        <ReportLocationMap
          style={styles.map}
          coordinate={coordinates}
          onCoordinateChange={(coords) => {
            if (!useCurrentLocation) {
              applyCoordinates(coords[0], coords[1]);
            }
          }}
        />
        <Text style={styles.mapHint}>
          {useCurrentLocation ? "USING YOUR CURRENT LOCATION" : "TAP TO REPOSITION PIN"}
        </Text>
        {locating ? (
          <View style={styles.locatingOverlay}>
            <ActivityIndicator color={Colors.green} />
          </View>
        ) : null}
      </View>

      <ToggleRow
        label="Use my Current Location"
        sublabel="Location must be allowed in settings"
        value={useCurrentLocation}
        onToggle={handleToggle}
      />

      <View style={styles.divider} />

      <View style={styles.coordRow}>
        <View style={styles.coordBox}>
          <SectionLabel>Latitude</SectionLabel>
          <Text style={styles.coordValue}>{formatLat(coordinates[1])}</Text>
        </View>
        <View style={styles.coordBox}>
          <SectionLabel>Longitude</SectionLabel>
          <Text style={styles.coordValue}>{formatLng(coordinates[0])}</Text>
        </View>
      </View>
    </ReportStepShell>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    height: 220,
    borderWidth: 2,
    borderColor: Colors.white,
    marginBottom: 20,
    overflow: "hidden",
    position: "relative",
  },
  map: {
    flex: 1,
  },
  mapHint: {
    position: "absolute",
    bottom: 10,
    alignSelf: "center",
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: Colors.green,
    letterSpacing: 2,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  locatingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  divider: {
    height: 2,
    backgroundColor: Colors.white,
    marginBottom: 20,
    marginTop: 12,
  },
  coordRow: {
    flexDirection: "row",
    gap: 16,
  },
  coordBox: {
    flex: 1,
  },
  coordValue: {
    fontFamily: Fonts.display,
    fontSize: 14,
    color: Colors.white,
    letterSpacing: 1,
  },
});
