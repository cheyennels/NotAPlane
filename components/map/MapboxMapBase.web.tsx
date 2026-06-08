import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { getMapboxAccessToken } from "@/lib/mapbox";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef } from "react";
import { StyleSheet, ViewStyle } from "react-native";
import { getSightingPinColor, MapSighting } from "./types";

const DEFAULT_CENTER: [number, number] = [-93.265, 44.9778];
const STYLE_ID = "notaplane-hide-mapbox-controls";

type MapboxMapProps = {
  style?: object;
  sightings?: MapSighting[];
  onPinPress?: (id: string) => void;
};

function hideMapboxControls(container: HTMLElement) {
  container
    .querySelectorAll(
      ".mapboxgl-ctrl-logo, .mapboxgl-ctrl-attrib, .mapboxgl-ctrl-attrib-button, .mapboxgl-ctrl-bottom-left, .mapboxgl-ctrl-bottom-right",
    )
    .forEach((node) => {
      const element = node as HTMLElement;
      if (
        element.classList.contains("mapboxgl-ctrl-logo") ||
        element.classList.contains("mapboxgl-ctrl-attrib") ||
        element.classList.contains("mapboxgl-ctrl-attrib-button") ||
        element.querySelector(".mapboxgl-ctrl-logo") ||
        element.querySelector(".mapboxgl-ctrl-attrib")
      ) {
        element.style.display = "none";
      }
    });

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
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }
  `;
  document.head.appendChild(style);
}

export default function MapboxMapBase({
  style,
  sightings = [],
  onPinPress,
}: MapboxMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const token = getMapboxAccessToken();

  useEffect(() => {
    if (!token) return;

    ensureGlobalHideStyles();
    const container = containerRef.current;
    if (!container) return;

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container,
      style: "mapbox://styles/mapbox/dark-v11",
      center: DEFAULT_CENTER,
      zoom: 11,
      attributionControl: false,
    });

    const hide = () => hideMapboxControls(container);
    map.on("load", hide);

    const observer = new MutationObserver(hide);
    observer.observe(container, { childList: true, subtree: true });
    hide();

    mapRef.current = map;

    return () => {
      observer.disconnect();
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [token]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = sightings.map((sighting) => {
      const element = document.createElement("div");
      element.style.width = "12px";
      element.style.height = "12px";
      element.style.borderRadius = "50%";
      element.style.backgroundColor = getSightingPinColor(sighting.status);
      element.style.border = `2px solid ${Colors.black}`;
      element.style.cursor = "pointer";

      if (onPinPress) {
        element.addEventListener("click", () => onPinPress(sighting.id));
      }

      return new mapboxgl.Marker({ element })
        .setLngLat([sighting.longitude, sighting.latitude])
        .addTo(map);
    });
  }, [sightings, onPinPress]);

  if (!token) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: Colors.surface2,
          padding: 24,
          textAlign: "center",
          fontFamily: Fonts.mono,
          color: Colors.muted,
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
