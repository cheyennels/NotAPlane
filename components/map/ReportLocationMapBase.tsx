import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import {
  canRenderMapboxMap,
  getMapboxAccessToken,
  initializeMapbox,
  isExpoGo,
} from "@/lib/mapbox";
import { StyleSheet, Text, View } from "react-native";

type ReportLocationMapProps = {
  coordinate: [number, number];
  onCoordinateChange: (coordinate: [number, number]) => void;
  style?: object;
};

export default function ReportLocationMapBase({
  coordinate,
  onCoordinateChange,
  style,
}: ReportLocationMapProps) {
  const token = getMapboxAccessToken();

  if (!token) {
    return (
      <View style={[styles.fallback, style]}>
        <Text style={styles.fallbackText}>
          Add EXPO_PUBLIC_MAPBOX_TOKEN to your .env file, then restart Expo.
        </Text>
      </View>
    );
  }

  if (!canRenderMapboxMap()) {
    return (
      <View style={[styles.fallback, style]}>
        <Text style={styles.fallbackText}>
          {isExpoGo()
            ? "Map unavailable in Expo Go. Use a development build to pick a location on the map."
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
      onPress={(event: { geometry: { coordinates: [number, number] } }) =>
        onCoordinateChange(event.geometry.coordinates)
      }
      logoEnabled={false}
      attributionEnabled={false}
      compassEnabled={false}
      scaleBarEnabled={false}
    >
      <Camera
        zoomLevel={11}
        centerCoordinate={coordinate}
        animationMode="none"
      />
      <MarkerView coordinate={coordinate}>
        <View style={styles.pin} />
      </MarkerView>
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
  fallback: {
    flex: 1,
    backgroundColor: Colors.surface2,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  fallbackText: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.muted,
    lineHeight: 16,
    textAlign: "center",
  },
  pin: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.green,
    borderWidth: 2,
    borderColor: Colors.black,
  },
});
