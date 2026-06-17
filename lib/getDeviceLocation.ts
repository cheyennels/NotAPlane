import * as Location from "expo-location";
import { Alert } from "react-native";

export type DeviceLocation = {
  latitude: number;
  longitude: number;
};

export async function getDeviceLocation(): Promise<DeviceLocation | null> {
  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) {
    Alert.alert(
      "Location services off",
      "Turn on location services in your device settings, then try again.",
    );
    return null;
  }

  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    Alert.alert(
      "Permission denied",
      "Location permission is required to use your current position. Enable it in settings and try again.",
    );
    return null;
  }

  try {
    const lastKnown = await Location.getLastKnownPositionAsync();
    if (lastKnown) {
      return {
        latitude: lastKnown.coords.latitude,
        longitude: lastKnown.coords.longitude,
      };
    }
  } catch {
    // Fall through to a fresh GPS read.
  }

  try {
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not read your location.";
    Alert.alert("Location unavailable", message);
    return null;
  }
}
