export interface Flight {
  icao24: string;
  callsign: string;
  airline: string;
  aircraft_type: string | null;
  latitude: number;
  longitude: number;
  altitude_ft: number;
  heading_deg: number;
  time_position: number; // unix timestamp
  path: [number, number][]; // [lat, lng] array
}
