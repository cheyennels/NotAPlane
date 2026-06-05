import Constants from "expo-constants";
import { NativeModules, Platform } from "react-native";

export function isMapboxNativeAvailable(): boolean {
  return NativeModules.RNMBXModule != null;
}

export function isExpoGo(): boolean {
  return Constants.appOwnership === "expo";
}

export function canRenderMapboxMap(): boolean {
  if (Platform.OS === "web") return true;
  return isMapboxNativeAvailable();
}

export function getMapboxAccessToken(): string | undefined {
  return process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
}

export function initializeMapbox(): void {
  const token = getMapboxAccessToken();
  if (!token) return;

  if (Platform.OS === "web" || isMapboxNativeAvailable()) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Mapbox = require("@rnmapbox/maps").default;
    Mapbox.setAccessToken(token);
  }
}
