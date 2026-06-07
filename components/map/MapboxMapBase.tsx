import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import {
  canRenderMapboxMap,
  getMapboxAccessToken,
  initializeMapbox,
  isExpoGo,
} from "@/lib/mapbox";
import { StyleSheet, Text, View } from "react-native";
import { getSightingPinColor, MapSighting } from "./types";

const DEFAULT_CENTER: [number, number] = [-93.265, 44.9778];

type MapboxMapProps = {
  style?: object;
  sightings?: MapSighting[];
};

export default function MapboxMapBase({
  style,
  sightings = [],
}: MapboxMapProps) {
  const token = getMapboxAccessToken();

  if (!token) {
    return (
      <View style={[styles.fallback, style]}>
        <Text style={styles.fallbackTitle}>Map unavailable</Text>
        <Text style={styles.fallbackText}>
          Add EXPO_PUBLIC_MAPBOX_TOKEN to your .env file, then restart Expo.
        </Text>
      </View>
    );
  }

  if (!canRenderMapboxMap()) {
    return (
      <View style={[styles.fallback, style]}>
        <Text style={styles.fallbackTitle}>Map unavailable</Text>
        <Text style={styles.fallbackText}>
          {isExpoGo()
            ? "@rnmapbox/maps does not run in Expo Go. Use a development build instead:\n\nnpx expo run:ios"
            : "Mapbox native modules are not linked. Rebuild the app after installing @rnmapbox/maps."}
        </Text>
      </View>
    );
  }

  initializeMapbox();

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Mapbox = require("@rnmapbox/maps");
  const MapView = Mapbox.MapView ?? Mapbox.default?.MapView;
  const Camera = Mapbox.Camera ?? Mapbox.default?.Camera;
  const MarkerView = Mapbox.MarkerView ?? Mapbox.default?.MarkerView;

  return (
    <MapView
      style={[styles.map, style]}
      styleURL="mapbox://styles/mapbox/dark-v11"
      logoEnabled={false}
      attributionEnabled={false}
      compassEnabled={false}
      scaleBarEnabled={false}
    >
      <Camera
        zoomLevel={11}
        centerCoordinate={DEFAULT_CENTER}
        animationMode="none"
      />
      {sightings.map((sighting) => (
        <MarkerView
          key={sighting.id}
          coordinate={[sighting.longitude, sighting.latitude]}
        >
          <View
            style={[
              styles.pin,
              { backgroundColor: getSightingPinColor(sighting.status) },
            ]}
          />
        </MarkerView>
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
  pin: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.black,
  },
  fallback: {
    flex: 1,
    backgroundColor: Colors.surface2,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  fallbackTitle: {
    fontFamily: Fonts.display,
    fontSize: 16,
    color: Colors.white,
    marginBottom: 12,
    textAlign: "center",
  },
  fallbackText: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.muted,
    lineHeight: 18,
    textAlign: "center",
  },
});
