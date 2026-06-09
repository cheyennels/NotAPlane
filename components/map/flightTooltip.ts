import { OpenSkyFlight, headingToDirection } from "@/lib/opensky";

export function getFlightTooltipLines(flight: OpenSkyFlight): string[] {
  const lines: string[] = [];

  if (flight.callsign) {
    lines.push(flight.callsign);
  }

  lines.push(`ICAO ${flight.icao24.toUpperCase()}`);

  if (flight.origin_country) {
    lines.push(flight.origin_country);
  }

  lines.push(`Alt ${flight.altitude_ft.toLocaleString()} ft`);
  lines.push(`Speed ${flight.velocity_mph} mph`);
  lines.push(
    `Heading ${Math.round(flight.heading)}° ${headingToDirection(flight.heading)}`,
  );

  return lines;
}
