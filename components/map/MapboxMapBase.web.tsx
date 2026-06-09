import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { getMapboxAccessToken } from "@/lib/mapbox";
import { OpenSkyFlight } from "@/lib/opensky";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, ViewStyle } from "react-native";
import {
  FlightFeatureProperties,
  FlightTrail,
  flightFromProperties,
  flightTrailsToGeoJson,
  flightsToGeoJson,
} from "./flightsGeoJson";
import {
  FLIGHT_ICON_WEB_LAYOUT,
  FLIGHT_ICON_WEB_PAINT,
  FLIGHT_TRAIL_WEB_LAYOUT,
  FLIGHT_TRAIL_WEB_PAINT,
} from "./flightMapStyles";
import { getFlightTooltipLines } from "./flightTooltip";
import { getSightingPinColor, MapSighting } from "./types";

const DEFAULT_CENTER: [number, number] = [-93.265, 44.9778];
const STYLE_ID = "notaplane-hide-mapbox-controls";
const FLIGHT_TOOLTIP_STYLE_ID = "notaplane-flight-tooltip-styles";
const FLIGHTS_SOURCE_ID = "notaplane-flights";
const FLIGHTS_LAYER_ID = "notaplane-flights-layer";
const FLIGHTS_TRAIL_SOURCE_ID = "notaplane-flight-trails";
const FLIGHTS_TRAIL_LAYER_ID = "notaplane-flight-trails-layer";

type MapboxMapProps = {
  style?: object;
  sightings?: MapSighting[];
  flights?: OpenSkyFlight[];
  flightTrails?: FlightTrail[];
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

function ensureFlightTooltipStyles() {
  if (typeof document === "undefined") return;

  let style = document.getElementById(
    FLIGHT_TOOLTIP_STYLE_ID,
  ) as HTMLStyleElement | null;

  if (!style) {
    style = document.createElement("style");
    style.id = FLIGHT_TOOLTIP_STYLE_ID;
    document.head.appendChild(style);
  }

  style.textContent = `
    .notaplane-flight-tooltip {
      position: absolute;
      min-width: 140px;
      padding: 8px 10px;
      background: rgba(20, 20, 20, 0.96);
      border: 2px solid #F2F2F0;
      color: #F2F2F0;
      font-family: "Space Mono", ui-monospace, monospace;
      font-size: 10px;
      line-height: 1.5;
      letter-spacing: 0.5px;
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.15s ease, visibility 0.15s ease;
      z-index: 10;
      transform: translate(-50%, calc(-100% - 8px));
    }

    .notaplane-flight-tooltip-title {
      font-family: "Silkscreen", sans-serif;
      color: #39FF14;
      font-size: 11px;
      letter-spacing: 0.5px;
    }

    .notaplane-flight-tooltip.is-visible {
      opacity: 1;
      visibility: visible;
    }
  `;
}

function ensureTrailLayers(map: mapboxgl.Map) {
  if (!map.getSource(FLIGHTS_TRAIL_SOURCE_ID)) {
    map.addSource(FLIGHTS_TRAIL_SOURCE_ID, {
      type: "geojson",
      data: flightTrailsToGeoJson([]),
    });

    map.addLayer({
      id: FLIGHTS_TRAIL_LAYER_ID,
      type: "line",
      source: FLIGHTS_TRAIL_SOURCE_ID,
      layout: FLIGHT_TRAIL_WEB_LAYOUT as mapboxgl.LineLayout,
      paint: FLIGHT_TRAIL_WEB_PAINT,
    });
  }

  if (!map.getSource(FLIGHTS_SOURCE_ID)) {
    map.addSource(FLIGHTS_SOURCE_ID, {
      type: "geojson",
      data: flightsToGeoJson([]),
    });
  }
}

function ensurePlaneLayer(map: mapboxgl.Map) {
  if (map.getLayer(FLIGHTS_LAYER_ID)) return;

  map.addLayer({
    id: FLIGHTS_LAYER_ID,
    type: "symbol",
    source: FLIGHTS_SOURCE_ID,
    layout: FLIGHT_ICON_WEB_LAYOUT as mapboxgl.SymbolLayout,
    paint: FLIGHT_ICON_WEB_PAINT,
  });
}

function showFlightTooltip(
  tooltipEl: HTMLDivElement,
  map: mapboxgl.Map,
  coordinates: [number, number],
  flight: OpenSkyFlight,
) {
  tooltipEl.replaceChildren();
  getFlightTooltipLines(flight).forEach((line, index) => {
    const row = document.createElement("div");
    row.textContent = line;
    if (index === 0) {
      row.className = "notaplane-flight-tooltip-title";
    }
    tooltipEl.appendChild(row);
  });

  const point = map.project(coordinates);
  tooltipEl.style.left = `${point.x}px`;
  tooltipEl.style.top = `${point.y}px`;
  tooltipEl.classList.add("is-visible");
}

function hideFlightTooltip(tooltipEl: HTMLDivElement) {
  tooltipEl.classList.remove("is-visible");
}

export default function MapboxMapBase({
  style,
  sightings = [],
  onPinPress,
  flights = [],
  flightTrails = [],
}: MapboxMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const activeFlightRef = useRef<[number, number] | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const token = getMapboxAccessToken();

  useEffect(() => {
    if (!token) return;

    ensureGlobalHideStyles();
    ensureFlightTooltipStyles();
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

    const tooltipEl = document.createElement("div");
    tooltipEl.className = "notaplane-flight-tooltip";
    container.appendChild(tooltipEl);
    tooltipRef.current = tooltipEl;

    const repositionTooltip = () => {
      if (!activeFlightRef.current || !tooltipRef.current) return;
      const point = map.project(activeFlightRef.current);
      tooltipRef.current.style.left = `${point.x}px`;
      tooltipRef.current.style.top = `${point.y}px`;
    };

    const onMouseEnter = (
      event: mapboxgl.MapMouseEvent & {
        features?: mapboxgl.MapboxGeoJSONFeature[];
      },
    ) => {
      map.getCanvas().style.cursor = "pointer";
      const feature = event.features?.[0];
      if (!feature?.geometry || feature.geometry.type !== "Point") return;

      const coordinates = feature.geometry.coordinates as [number, number];
      activeFlightRef.current = coordinates;
      showFlightTooltip(
        tooltipEl,
        map,
        coordinates,
        flightFromProperties(feature.properties as FlightFeatureProperties),
      );
    };

    const onMouseLeave = () => {
      map.getCanvas().style.cursor = "";
      activeFlightRef.current = null;
      hideFlightTooltip(tooltipEl);
    };

    const hide = () => hideMapboxControls(container);
    map.on("load", () => {
      hide();
      ensureTrailLayers(map);
      try {
        ensurePlaneLayer(map);
        map.on("mouseenter", FLIGHTS_LAYER_ID, onMouseEnter);
        map.on("mouseleave", FLIGHTS_LAYER_ID, onMouseLeave);
      } catch (layerError) {
        console.warn("Flight plane layer failed to load:", layerError);
      }
      map.on("move", repositionTooltip);
      map.on("zoom", repositionTooltip);
      setMapReady(true);
    });

    const observer = new MutationObserver(hide);
    observer.observe(container, { childList: true, subtree: true });
    hide();

    mapRef.current = map;

    return () => {
      observer.disconnect();
      map.off("mouseenter", FLIGHTS_LAYER_ID, onMouseEnter);
      map.off("mouseleave", FLIGHTS_LAYER_ID, onMouseLeave);
      map.off("move", repositionTooltip);
      map.off("zoom", repositionTooltip);
      tooltipEl.remove();
      tooltipRef.current = null;
      activeFlightRef.current = null;
      setMapReady(false);
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      if (map.getLayer(FLIGHTS_LAYER_ID)) map.removeLayer(FLIGHTS_LAYER_ID);
      if (map.getLayer(FLIGHTS_TRAIL_LAYER_ID)) {
        map.removeLayer(FLIGHTS_TRAIL_LAYER_ID);
      }
      if (map.getSource(FLIGHTS_SOURCE_ID)) map.removeSource(FLIGHTS_SOURCE_ID);
      if (map.getSource(FLIGHTS_TRAIL_SOURCE_ID)) {
        map.removeSource(FLIGHTS_TRAIL_SOURCE_ID);
      }
      map.remove();
      mapRef.current = null;
    };
  }, [token]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

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

      return new mapboxgl.Marker({ element, anchor: "center" })
        .setLngLat([sighting.longitude, sighting.latitude])
        .addTo(map);
    });
  }, [sightings, onPinPress, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const source = map.getSource(FLIGHTS_SOURCE_ID) as
      | mapboxgl.GeoJSONSource
      | undefined;
    const trailSource = map.getSource(FLIGHTS_TRAIL_SOURCE_ID) as
      | mapboxgl.GeoJSONSource
      | undefined;
    if (!source || !trailSource) return;

    source.setData(flightsToGeoJson(flights, flightTrails));
    trailSource.setData(flightTrailsToGeoJson(flightTrails));
    activeFlightRef.current = null;
    if (tooltipRef.current) hideFlightTooltip(tooltipRef.current);
  }, [flights, flightTrails, mapReady]);

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
        position: "relative",
      }}
    />
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
});
