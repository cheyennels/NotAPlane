import { OpenSkyFlight } from "./opensky";

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

function moveByKm(
  lat: number,
  lng: number,
  headingDeg: number,
  distanceKm: number,
): [number, number] {
  const brng = toRadians(headingDeg);
  const latRad = toRadians(lat);
  const lngRad = toRadians(lng);
  const angular = distanceKm / EARTH_RADIUS_KM;

  const nextLatRad = Math.asin(
    Math.sin(latRad) * Math.cos(angular) +
      Math.cos(latRad) * Math.sin(angular) * Math.cos(brng),
  );
  const nextLngRad =
    lngRad +
    Math.atan2(
      Math.sin(brng) * Math.sin(angular) * Math.cos(latRad),
      Math.cos(angular) - Math.sin(latRad) * Math.sin(nextLatRad),
    );

  return [toDegrees(nextLatRad), toDegrees(nextLngRad)];
}

/**
 * Build a plausible trail by walking backward from the current position
 * along the reciprocal heading. Used when OpenSky /tracks/all is unavailable.
 */
export function estimateFlightTrail(
  flight: OpenSkyFlight,
  maxMinutes = 90,
): [number, number][] {
  if (flight.on_ground || flight.velocity_ms < 20) {
    return [[flight.longitude, flight.latitude]];
  }

  const stepSeconds = 30;
  const maxSteps = Math.floor((maxMinutes * 60) / stepSeconds);
  const kmPerStep = Math.max(0.4, (flight.velocity_ms * stepSeconds) / 1000);
  const backHeading = (flight.heading + 180) % 360;

  const coordinates: [number, number][] = [[flight.longitude, flight.latitude]];
  let lat = flight.latitude;
  let lng = flight.longitude;

  for (let i = 0; i < maxSteps; i += 1) {
    [lat, lng] = moveByKm(lat, lng, backHeading, kmPerStep);
    coordinates.unshift([lng, lat]);
  }

  return coordinates;
}
