import ReportLocationMap from "@/components/map/ReportLocationMap";
import ReportStepShell from "@/components/report/ReportStepShell";
import BottomActionBar from "@/components/ui/BottomActionBar";
import Button from "@/components/ui/Button";
import SectionLabel from "@/components/ui/SectionLabel";
import ToggleRow from "@/components/ui/ToggleRow";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useReport } from "../../context/ReportContext";

export default function StepTwoWhere() {
  const { form, updateForm } = useReport();
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [coordinates, setCoordinates] = useState<[number, number]>([
    form.longitude,
    form.latitude,
  ]);

  async function getCurrentLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "Location permission is required to use this feature. Please enable it in your settings.",
      );
      setUseCurrentLocation(false);
      return;
    }

    const location = await Location.getCurrentPositionAsync({});
    setCoordinates([location.coords.longitude, location.coords.latitude]);
  }

  async function handleToggle() {
    const next = !useCurrentLocation;
    setUseCurrentLocation(next);
    if (next) {
      await getCurrentLocation();
    }
  }

  function formatLat(coord: number) {
    return `${Math.abs(coord).toFixed(4)}° ${coord >= 0 ? "N" : "S"}`;
  }

  function formatLng(coord: number) {
    return `${Math.abs(coord).toFixed(4)}° ${coord >= 0 ? "E" : "W"}`;
  }

  function handleContinue() {
    updateForm({
      latitude: coordinates[1],
      longitude: coordinates[0],
    });
    router.push("/report/step-3-what" as any);
  }

  return (
    <ReportStepShell
      step={2}
      stepHeading="Where did you see it?"
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
      <View style={styles.mapContainer}>
        <ReportLocationMap
          style={styles.map}
          coordinate={coordinates}
          onCoordinateChange={(coords) => {
            if (!useCurrentLocation) setCoordinates(coords);
          }}
        />
        <Text style={styles.mapHint}>TAP TO REPOSITION PIN</Text>
      </View>

      {/* Use current location toggle */}
      <ToggleRow
        label="Use my Current Location"
        sublabel="Location must be allowed in settings"
        value={useCurrentLocation}
        onToggle={handleToggle}
      />

      <View style={styles.divider} />

      {/* Coordinates */}
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
