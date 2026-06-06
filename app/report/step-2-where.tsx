import ReportLocationMap from "@/components/map/ReportLocationMap";
import ReportStepShell from "@/components/report/ReportStepShell";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useState } from "react";
import {
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function StepTwoWhere() {
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [coordinates, setCoordinates] = useState<[number, number]>([
    -93.265, 44.9778,
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

  function handleMapPress(e: any) {
    if (useCurrentLocation) return; // don't move pin if using GPS
    const coords = e.geometry.coordinates;
    setCoordinates(coords);
  }

  function formatLat(coord: number) {
    return `${Math.abs(coord).toFixed(4)}° ${coord >= 0 ? "N" : "S"}`;
  }

  function formatLng(coord: number) {
    return `${Math.abs(coord).toFixed(4)}° ${coord >= 0 ? "E" : "W"}`;
  }

  return (
    <ReportStepShell
      step={2}
      stepHeading="Where did you see it?"
      footer={
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.continueBtn}
            onPress={() => router.push("/report/step-3-what" as any)}
          >
            <Text style={styles.continueBtnText}>Continue</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      }
    >
        <View style={styles.mapContainer}>
          <ReportLocationMap
            style={styles.map}
            coordinate={coordinates}
            onCoordinateChange={setCoordinates}
          />
          <Text style={styles.mapHint}>TAP TO REPOSITION PIN</Text>
        </View>

        {/* Use current location toggle */}
        <View style={styles.toggleRow}>
          <View>
            <Text style={styles.toggleLabel}>Use my Current Location</Text>
            <Text style={styles.toggleSub}>
              Location must be allowed in settings
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.toggle, useCurrentLocation && styles.toggleActive]}
            onPress={() => setUseCurrentLocation(!useCurrentLocation)}
          >
            <View
              style={[
                styles.toggleKnob,
                useCurrentLocation && styles.toggleKnobActive,
              ]}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {/* Coordinates */}
        <View style={styles.coordRow}>
          <View style={styles.coordBox}>
            <Text style={styles.coordLabel}>LATITUDE</Text>
            <Text style={styles.coordValue}>{formatLat(coordinates[1])}</Text>
          </View>
          <View style={styles.coordBox}>
            <Text style={styles.coordLabel}>LONGITUDE</Text>
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
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  toggleLabel: {
    fontFamily: Fonts.display,
    fontSize: 11,
    color: Colors.white,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  toggleSub: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: Colors.muted,
    letterSpacing: 0.5,
  },
  toggle: {
    width: 44,
    height: 24,
    backgroundColor: Colors.surface2,
    borderWidth: 2,
    borderColor: Colors.white,
    justifyContent: "center",
    padding: 2,
  },
  toggleActive: {
    backgroundColor: Colors.green,
    borderColor: Colors.green,
  },
  toggleKnob: {
    width: 16,
    height: 16,
    backgroundColor: Colors.white,
    alignSelf: "flex-start",
  },
  toggleKnobActive: {
    backgroundColor: Colors.black,
    alignSelf: "flex-end",
  },
  divider: {
    height: 2,
    backgroundColor: Colors.white,
    marginBottom: 20,
  },
  coordRow: {
    flexDirection: "row",
    gap: 16,
  },
  coordBox: {
    flex: 1,
  },
  coordLabel: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: Colors.green,
    letterSpacing: 2,
    marginBottom: 6,
  },
  coordValue: {
    fontFamily: Fonts.display,
    fontSize: 14,
    color: Colors.white,
    letterSpacing: 1,
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
