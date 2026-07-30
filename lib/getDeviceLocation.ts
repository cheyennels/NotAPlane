import * as Location from "expo-location";
import { Platform } from "react-native";
import { notify } from "./notify";

export type DeviceLocation = {
  latitude: number;
  longitude: number;
};

export async function getDeviceLocation(): Promise<DeviceLocation | null> {
  return Platform.OS === "web" ? getWebLocation() : getNativeLocation();
}

// Web: use the browser Geolocation API directly. expo-location's web shim for
// hasServicesEnabled/getLastKnownPosition is unreliable, and the browser
// handles the permission prompt itself.
function getWebLocation(): Promise<DeviceLocation | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      notify(
        "Location unavailable",
        "Your browser doesn't support location. Place the pin manually instead.",
      );
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      (error) => {
        notify(
          "Location unavailable",
          error.code === error.PERMISSION_DENIED
            ? "Allow location access in your browser, then try again — or place the pin manually."
            : "Couldn't read your location. Try again or place the pin manually.",
        );
        resolve(null);
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  });
}

async function getNativeLocation(): Promise<DeviceLocation | null> {
  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) {
    notify(
      "Location services off",
      "Turn on location services in your device settings, then try again.",
    );
    return null;
  }

  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    notify(
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
    notify("Location unavailable", message);
    return null;
  }
}
