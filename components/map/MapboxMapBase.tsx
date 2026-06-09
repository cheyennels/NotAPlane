import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { CelestialBody, celestialBodyColor, celestialBodyEarthCoordinate, CELESTIAL_REFERENCE_ZOOM } from "@/hooks/useCelestialData";
import {
  canRenderMapboxMap,
  getMapboxAccessToken,
  initializeMapbox,
  isExpoGo,
} from "@/lib/mapbox";
import { OpenSkyFlight } from "@/lib/opensky";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  FLIGHT_ICON_LAYER_STYLE,
  FLIGHT_LABEL_FILTER,
  FLIGHT_LABEL_LAYER_STYLE,
  FLIGHT_TOOLTIP_LINE_STYLE,
  FLIGHT_TOOLTIP_STYLE,
  FLIGHT_TOOLTIP_TITLE_STYLE,
  FLIGHT_TRAIL_LAYER_STYLE,
} from "./flightMapStyles";
import {
  FlightFeatureProperties,
  FlightTrail,
  flightFromProperties,
  flightTrailsToGeoJson,
  flightsToGeoJson,
} from "./flightsGeoJson";
import { getFlightTooltipLines } from "./flightTooltip";
import { MapSighting, getSightingPinColor } from "./types";

const DEFAULT_CENTER: [number, number] = [-93.265, 44.9778];

type MapboxMapProps = {
  style?: object;
  sightings?: MapSighting[];
  flights?: OpenSkyFlight[];
  flightTrails?: FlightTrail[];
  celestialBodies?: CelestialBody[];
  centerLatitude?: number;
  centerLongitude?: number;
  onPinPress?: (id: string) => void;
  onZoomChange?: (zoom: number) => void;
};

export default function MapboxMapBase({
  style,
  sightings = [],
  flights = [],
  flightTrails = [],
  celestialBodies = [],
  centerLatitude = DEFAULT_CENTER[1],
  centerLongitude = DEFAULT_CENTER[0],
  onPinPress,
  onZoomChange,
}: MapboxMapProps) {
  const [selectedFlight, setSelectedFlight] = useState<OpenSkyFlight | null>(
    null,
  );
  const [mapZoom, setMapZoom] = useState(11);
  const flightGeoJson = useMemo(
    () => flightsToGeoJson(flights, flightTrails),
    [flights, flightTrails],
  );
  const flightTrailGeoJson = useMemo(
    () => flightTrailsToGeoJson(flightTrails),
    [flightTrails],
  );
  const token = getMapboxAccessToken();

  useEffect(() => {
    setSelectedFlight(null);
  }, [flights]);

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
  const ShapeSource = Mapbox.ShapeSource ?? Mapbox.default?.ShapeSource;
  const SymbolLayer = Mapbox.SymbolLayer ?? Mapbox.default?.SymbolLayer;
  const LineLayer = Mapbox.LineLayer ?? Mapbox.default?.LineLayer;

  return (
    <MapView
      style={[styles.map, style]}
      styleURL="mapbox://styles/mapbox/dark-v11"
      logoEnabled={false}
      attributionEnabled={false}
      compassEnabled={false}
      scaleBarEnabled={false}
      onPress={() => setSelectedFlight(null)}
      onCameraChanged={(event: {
        properties?: { zoom?: number; zoomLevel?: number };
        zoom?: number;
      }) => {
        const zoom =
          event.properties?.zoom ??
          event.properties?.zoomLevel ??
          event.zoom;
        if (typeof zoom === "number") {
          setMapZoom((prev) =>
            Math.abs(prev - zoom) < 0.001 ? prev : zoom,
          );
          onZoomChange?.(zoom);
        }
      }}
    >
      <Camera
        defaultSettings={{
          zoomLevel: 11,
          centerCoordinate: [centerLongitude, centerLatitude],
        }}
      />

      {sightings.map((sighting) => (
        <MarkerView
          key={sighting.id}
          coordinate={[sighting.longitude, sighting.latitude]}
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <TouchableOpacity
            onPress={() => onPinPress?.(sighting.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <View
              style={[
                styles.pin,
                { backgroundColor: getSightingPinColor(sighting.status) },
              ]}
            />
          </TouchableOpacity>
        </MarkerView>
      ))}

      {mapZoom < CELESTIAL_REFERENCE_ZOOM &&
        celestialBodies.map((body) => (
        <MarkerView
          key={`celestial-${body.id}`}
          coordinate={celestialBodyEarthCoordinate(body)}
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <View style={styles.celestialMarker}>
            <View
              style={[
                styles.celestialDot,
                { backgroundColor: celestialBodyColor(body.kind) },
              ]}
            />
            <Text
              style={[
                styles.celestialLabel,
                { color: celestialBodyColor(body.kind) },
              ]}
            >
              {body.name.toUpperCase()}
            </Text>
          </View>
        </MarkerView>
      ))}

      <ShapeSource id="notaplane-flight-trails" shape={flightTrailGeoJson}>
        <LineLayer
          id="notaplane-flight-trails-layer"
          style={FLIGHT_TRAIL_LAYER_STYLE}
        />
      </ShapeSource>

      {flights.length > 0 ? (
        <ShapeSource
          id="notaplane-flights"
          shape={flightGeoJson}
          onPress={(event: {
            features?: Array<{ properties?: FlightFeatureProperties }>;
          }) => {
            const properties = event.features?.[0]?.properties;
            if (!properties) return;
            setSelectedFlight(flightFromProperties(properties));
          }}
        >
          <SymbolLayer
            id="notaplane-flights-layer"
            style={FLIGHT_ICON_LAYER_STYLE}
          />
          <SymbolLayer
            id="notaplane-flights-labels"
            filter={FLIGHT_LABEL_FILTER}
            style={FLIGHT_LABEL_LAYER_STYLE}
          />
        </ShapeSource>
      ) : null}

      {selectedFlight ? (
        <MarkerView
          key={`tooltip-${selectedFlight.icao24}`}
          coordinate={[selectedFlight.longitude, selectedFlight.latitude]}
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <Pressable
            onPress={() => setSelectedFlight(selectedFlight)}
            style={styles.flightMarker}
          >
            <View style={styles.flightTooltip}>
              {getFlightTooltipLines(selectedFlight).map((line, index) => (
                <Text
                  key={`${selectedFlight.icao24}-${index}`}
                  style={
                    index === 0
                      ? styles.flightTooltipTitle
                      : styles.flightTooltipLine
                  }
                >
                  {line}
                </Text>
              ))}
            </View>
          </Pressable>
        </MarkerView>
      ) : null}
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
  flightMarker: {
    alignItems: "center",
    position: "relative",
  },
  flightTooltip: {
    ...FLIGHT_TOOLTIP_STYLE,
    position: "absolute",
    bottom: 36,
  },
  flightTooltipLine: FLIGHT_TOOLTIP_LINE_STYLE,
  flightTooltipTitle: FLIGHT_TOOLTIP_TITLE_STYLE,
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
  celestialMarker: {
    alignItems: "center",
    gap: 4,
  },
  celestialDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FFA500",
    borderWidth: 1,
    borderColor: Colors.black,
  },
  celestialLabel: {
    fontFamily: Fonts.mono,
    fontSize: 8,
    color: "#FFA500",
    letterSpacing: 1,
  },
});
