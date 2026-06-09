import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { getMapboxAccessToken } from "@/lib/mapbox";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef } from "react";
import { StyleSheet, ViewStyle } from "react-native";

const STYLE_ID = "notaplane-hide-mapbox-controls";
const MARKER_STYLE_ID = "notaplane-report-location-marker";

type ReportLocationMapProps = {
  coordinate: [number, number];
  onCoordinateChange: (coordinate: [number, number]) => void;
  style?: object;
};

function hideMapboxControls(container: HTMLElement) {
  container
    .querySelectorAll(".mapboxgl-ctrl-logo, .mapboxgl-ctrl-attrib")
    .forEach((node) => {
      (node as HTMLElement).style.display = "none";
    });
}

function ensureGlobalHideStyles() {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .mapboxgl-ctrl-logo,
    .mapboxgl-ctrl-attrib,
    .mapboxgl-ctrl-attrib-button {
      display: none !important;
    }
  `;
  document.head.appendChild(style);
}

function ensureReportLocationMarkerStyles() {
  if (typeof document === "undefined" || document.getElementById(MARKER_STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = MARKER_STYLE_ID;
  style.textContent = `
    .report-location-marker {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background-color: ${Colors.green};
      border: 2px solid ${Colors.black};
      box-shadow: 0 0 8px rgba(57, 255, 20, 0.9);
      cursor: pointer;
    }
  `;
  document.head.appendChild(style);
}

export default function ReportLocationMapBase({
  coordinate,
  onCoordinateChange,
  style,
}: ReportLocationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const token = getMapboxAccessToken();

  useEffect(() => {
    if (!token) return;

    ensureGlobalHideStyles();
    ensureReportLocationMarkerStyles();
    const container = containerRef.current;
    if (!container) return;

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container,
      style: "mapbox://styles/mapbox/dark-v11",
      center: coordinate,
      zoom: 11,
      attributionControl: false,
    });

    const markerElement = document.createElement("div");
    markerElement.className = "report-location-marker";
    markerElement.style.width = "18px";
    markerElement.style.height = "18px";
    markerElement.style.borderRadius = "50%";
    markerElement.style.backgroundColor = Colors.green;
    markerElement.style.border = `2px solid ${Colors.black}`;
    markerElement.style.boxShadow = "0 0 8px rgba(57, 255, 20, 0.9)";
    markerElement.style.cursor = "pointer";

    const marker = new mapboxgl.Marker({ element: markerElement, anchor: "center" })
      .setLngLat(coordinate)
      .addTo(map);

    map.on("load", () => hideMapboxControls(container));
    map.on("click", (event) => {
      const next: [number, number] = [event.lngLat.lng, event.lngLat.lat];
      marker.setLngLat(next);
      onCoordinateChange(next);
    });

    mapRef.current = map;
    markerRef.current = marker;

    return () => {
      marker.remove();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [token, onCoordinateChange]);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;

    marker.setLngLat(coordinate);
    map.jumpTo({ center: coordinate });
  }, [coordinate]);

  if (!token) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: Colors.surface2,
          padding: 16,
          textAlign: "center",
          fontFamily: Fonts.mono,
          color: Colors.muted,
          fontSize: 10,
        }}
      >
        Add EXPO_PUBLIC_MAPBOX_TOKEN to your .env file, then restart Expo.
      </div>
    );
  }

  const flatStyle = StyleSheet.flatten([styles.map, style]) as ViewStyle;

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        flex: flatStyle.flex ?? 1,
      }}
    />
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
});
