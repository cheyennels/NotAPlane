import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";

// Scales with zoom; 28px at default zoom 11 matches the original marker size.
export const FLIGHT_SYMBOL_SIZE = [
  "interpolate",
  ["linear"],
  ["zoom"],
  8,
  14,
  11,
  28,
  14,
  40,
  18,
  56,
] as const;

export const FLIGHT_LABEL_SIZE = [
  "interpolate",
  ["linear"],
  ["zoom"],
  8,
  5,
  11,
  9,
  14,
  11,
  18,
  14,
] as const;

// Emoji ✈ points ~45° clockwise from north at 0° rotation on most platforms.
export const PLANE_ICON_ROTATION_OFFSET = -45;

export const FLIGHT_ICON_LAYER_STYLE = {
  textField: "✈",
  textSize: FLIGHT_SYMBOL_SIZE,
  textRotate: ["get", "iconRotation"],
  textRotationAlignment: "map",
  textPitchAlignment: "map",
  textKeepUpright: false,
  textAllowOverlap: true,
  textIgnorePlacement: true,
  textColor: Colors.green,
};

export const FLIGHT_ICON_WEB_LAYOUT = {
  "text-field": "✈",
  "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
  "text-size": FLIGHT_SYMBOL_SIZE,
  "text-rotate": ["get", "iconRotation"],
  "text-rotation-alignment": "map",
  "text-pitch-alignment": "map",
  "text-keep-upright": false,
  "text-allow-overlap": true,
  "text-ignore-placement": true,
};

export const FLIGHT_ICON_WEB_PAINT = {
  "text-color": Colors.green,
};

export const FLIGHT_TRAIL_LAYER_STYLE = {
  lineColor: Colors.green,
  lineWidth: 2,
  lineOpacity: 0.85,
  lineDasharray: [1, 2],
  lineCap: "round",
  lineJoin: "round",
};

export const FLIGHT_TRAIL_WEB_PAINT = {
  "line-color": Colors.green,
  "line-width": 2,
  "line-opacity": 0.85,
  "line-dasharray": [1, 2],
};

export const FLIGHT_TRAIL_WEB_LAYOUT = {
  "line-join": "round",
  "line-cap": "round",
} as const;

export const FLIGHT_LABEL_LAYER_STYLE = {
  textField: ["get", "callsign"],
  textSize: FLIGHT_LABEL_SIZE,
  textOffset: [0, 1.8],
  textAllowOverlap: true,
  textIgnorePlacement: true,
  textColor: Colors.green,
};

export const FLIGHT_TOOLTIP_STYLE = {
  minWidth: 140,
  paddingHorizontal: 10,
  paddingVertical: 8,
  backgroundColor: "rgba(20,20,20,0.96)",
  borderWidth: 2,
  borderColor: Colors.white,
  alignItems: "center" as const,
  zIndex: 10,
};

export const FLIGHT_TOOLTIP_LINE_STYLE = {
  fontFamily: Fonts.mono,
  fontSize: 10,
  color: Colors.white,
  letterSpacing: 0.5,
  lineHeight: 15,
};

export const FLIGHT_TOOLTIP_TITLE_STYLE = {
  fontFamily: Fonts.display,
  fontSize: 11,
  color: Colors.green,
  letterSpacing: 0.5,
  lineHeight: 15,
};

export const FLIGHT_LABEL_FILTER = ["!=", ["get", "callsign"], ""];
