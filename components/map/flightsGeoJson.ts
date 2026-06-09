import { OpenSkyFlight } from "@/lib/opensky";
import { PLANE_ICON_ROTATION_OFFSET } from "./flightMapStyles";

export type FlightFeatureProperties = {
  icao24: string;
  callsign: string;
  origin_country: string;
  latitude: number;
  longitude: number;
  altitude_m: number;
  altitude_ft: number;
  heading: number;
  iconRotation: number;
  velocity_ms: number;
  velocity_mph: number;
  on_ground: boolean;
};

export type FlightTrail = {
  icao24: string;
  coordinates: [number, number][];
};

export function bearingBetween(
  from: [number, number],
  to: [number, number],
): number {
  const [lng1, lat1] = from;
  const [lng2, lat2] = to;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export function appendFlightPosition(
  coordinates: [number, number][],
  flight: { longitude: number; latitude: number },
): [number, number][] {
  const current: [number, number] = [flight.longitude, flight.latitude];
  if (coordinates.length === 0) return [current];

  const last = coordinates[coordinates.length - 1];
  if (last[0] === current[0] && last[1] === current[1]) return coordinates;

  return [...coordinates, current];
}

export function computeIconRotation(
  flight: OpenSkyFlight,
  trail?: [number, number][],
): number {
  const path = trail?.length
    ? appendFlightPosition(trail, flight)
    : ([[flight.longitude, flight.latitude]] as [number, number][]);

  let bearing: number | null = null;

  if (path.length >= 2) {
    bearing = bearingBetween(path[path.length - 2], path[path.length - 1]);
  } else if (flight.heading) {
    bearing = flight.heading;
  }

  if (bearing == null) {
    return (PLANE_ICON_ROTATION_OFFSET + 360) % 360;
  }

  return (bearing + PLANE_ICON_ROTATION_OFFSET + 360) % 360;
}

function trailsByIcao(
  flightTrails?: FlightTrail[],
): Map<string, [number, number][]> {
  return new Map(
    (flightTrails ?? []).map((trail) => [trail.icao24, trail.coordinates]),
  );
}

export function flightsToGeoJson(
  flights: OpenSkyFlight[],
  flightTrails?: FlightTrail[],
): GeoJSON.FeatureCollection<GeoJSON.Point, FlightFeatureProperties> {
  const trails = trailsByIcao(flightTrails);

  return {
    type: "FeatureCollection",
    features: flights.map((flight) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [flight.longitude, flight.latitude],
      },
      properties: {
        icao24: flight.icao24,
        callsign: flight.callsign,
        origin_country: flight.origin_country,
        latitude: flight.latitude,
        longitude: flight.longitude,
        altitude_m: flight.altitude_m,
        altitude_ft: flight.altitude_ft,
        heading: flight.heading,
        iconRotation: computeIconRotation(
          flight,
          trails.get(flight.icao24),
        ),
        velocity_ms: flight.velocity_ms,
        velocity_mph: flight.velocity_mph,
        on_ground: flight.on_ground,
      },
    })),
  };
}

export function flightFromProperties(
  properties: FlightFeatureProperties | Record<string, unknown>,
): OpenSkyFlight {
  return {
    icao24: String(properties.icao24),
    callsign: String(properties.callsign ?? ""),
    origin_country: String(properties.origin_country ?? ""),
    latitude: Number(properties.latitude),
    longitude: Number(properties.longitude),
    altitude_m: Number(properties.altitude_m),
    altitude_ft: Number(properties.altitude_ft),
    heading: Number(properties.heading),
    velocity_ms: Number(properties.velocity_ms),
    velocity_mph: Number(properties.velocity_mph),
    on_ground: properties.on_ground === true || properties.on_ground === "true",
  };
}

export function flightTrailsToGeoJson(
  trails: FlightTrail[],
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: trails
      .filter((trail) => trail.coordinates.length >= 2)
      .map((trail) => ({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: trail.coordinates,
        },
        properties: { icao24: trail.icao24 },
      })),
  };
}
