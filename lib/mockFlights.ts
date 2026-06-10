import { OpenSkyFlight } from "./opensky";

/** Major airport coordinates used as trail departure points. */
export const AIRPORTS = {
  SEA: { name: "Seattle", latitude: 47.4502, longitude: -122.3088 },
  PDX: { name: "Portland", latitude: 45.5898, longitude: -122.5951 },
  MSP: { name: "Minneapolis", latitude: 44.8848, longitude: -93.2223 },
  LAX: { name: "Los Angeles", latitude: 33.9425, longitude: -118.4081 },
  SFO: { name: "San Francisco", latitude: 37.6213, longitude: -122.379 },
  JFK: { name: "New York", latitude: 40.6413, longitude: -73.7781 },
  EWR: { name: "Newark", latitude: 40.6895, longitude: -74.1745 },
  BOS: { name: "Boston", latitude: 42.3656, longitude: -71.0096 },
  LAS: { name: "Las Vegas", latitude: 36.084, longitude: -115.1537 },
  YWG: { name: "Winnipeg", latitude: 49.91, longitude: -97.2398 },
  YYZ: { name: "Toronto", latitude: 43.6777, longitude: -79.6248 },
  ATL: { name: "Atlanta", latitude: 33.6407, longitude: -84.4277 },
  ORD: { name: "Chicago", latitude: 41.9742, longitude: -87.9073 },
  MDW: { name: "Chicago Midway", latitude: 41.7868, longitude: -87.7522 },
  MIA: { name: "Miami", latitude: 25.7959, longitude: -80.287 },
  FAR: { name: "Fargo", latitude: 46.9207, longitude: -96.8158 },
} as const;

export type AirportCode = keyof typeof AIRPORTS;

export type MockFlightInput = {
  icao24: string;
  callsign: string;
  origin_country: string;
  latitude: number;
  longitude: number;
  /** altitude in meters */
  altitude: number;
  on_ground: boolean;
  /** velocity in m/s */
  velocity: number;
  true_track: number;
  vertical_rate: number;
  /** airport where this flight departed */
  departureAirport: AirportCode;
};

export const MOCK_FLIGHTS: MockFlightInput[] = [
  // Descending into MSP from the west
  {
    icao24: "a3d4e1",
    callsign: "DAL1832",
    origin_country: "United States",
    latitude: 44.8821,
    longitude: -93.2156,
    altitude: 3048,
    on_ground: false,
    velocity: 231,
    true_track: 112,
    vertical_rate: -8.4,
    departureAirport: "SEA",
  },
  {
    icao24: "a6f2c3",
    callsign: "ASA442",
    origin_country: "United States",
    latitude: 45.1832,
    longitude: -93.8234,
    altitude: 7620,
    on_ground: false,
    velocity: 398,
    true_track: 124,
    vertical_rate: -5.2,
    departureAirport: "SEA",
  },
  {
    icao24: "a7e3b1",
    callsign: "UAL557",
    origin_country: "United States",
    latitude: 45.2341,
    longitude: -94.1023,
    altitude: 10972,
    on_ground: false,
    velocity: 441,
    true_track: 118,
    vertical_rate: -1.2,
    departureAirport: "PDX",
  },

  // Climbing out of MSP heading west
  {
    icao24: "a1b9d7",
    callsign: "SWA4423",
    origin_country: "United States",
    latitude: 44.9234,
    longitude: -93.1087,
    altitude: 1524,
    on_ground: false,
    velocity: 189,
    true_track: 278,
    vertical_rate: 12.1,
    departureAirport: "MSP",
  },
  {
    icao24: "a2c8f5",
    callsign: "AAL2847",
    origin_country: "United States",
    latitude: 44.8901,
    longitude: -93.4521,
    altitude: 4572,
    on_ground: false,
    velocity: 334,
    true_track: 292,
    vertical_rate: 8.6,
    departureAirport: "MSP",
  },

  // Eastbound overflights
  {
    icao24: "a8c5f0",
    callsign: "AAL1167",
    origin_country: "United States",
    latitude: 45.0567,
    longitude: -92.9834,
    altitude: 11278,
    on_ground: false,
    velocity: 445,
    true_track: 88,
    vertical_rate: 0,
    departureAirport: "LAX",
  },
  {
    icao24: "a4f8a2",
    callsign: "UAL2891",
    origin_country: "United States",
    latitude: 45.1234,
    longitude: -93.0123,
    altitude: 10668,
    on_ground: false,
    velocity: 438,
    true_track: 92,
    vertical_rate: 0,
    departureAirport: "SFO",
  },
  {
    icao24: "a9d2c7",
    callsign: "DAL2203",
    origin_country: "United States",
    latitude: 44.8456,
    longitude: -92.8234,
    altitude: 11582,
    on_ground: false,
    velocity: 451,
    true_track: 85,
    vertical_rate: 0,
    departureAirport: "SEA",
  },

  // Westbound overflights
  {
    icao24: "a5d1c8",
    callsign: "JBU521",
    origin_country: "United States",
    latitude: 44.7891,
    longitude: -93.2341,
    altitude: 10972,
    on_ground: false,
    velocity: 432,
    true_track: 272,
    vertical_rate: 0,
    departureAirport: "JFK",
  },
  {
    icao24: "a3e9f1",
    callsign: "NKS1834",
    origin_country: "United States",
    latitude: 45.2012,
    longitude: -93.5678,
    altitude: 11278,
    on_ground: false,
    velocity: 441,
    true_track: 268,
    vertical_rate: 0,
    departureAirport: "EWR",
  },

  // Canada arrivals
  {
    icao24: "c04f3a",
    callsign: "WJA2341",
    origin_country: "Canada",
    latitude: 45.2891,
    longitude: -93.1234,
    altitude: 5486,
    on_ground: false,
    velocity: 356,
    true_track: 178,
    vertical_rate: -7.8,
    departureAirport: "YWG",
  },
  {
    icao24: "c08b2d",
    callsign: "ACA7721",
    origin_country: "Canada",
    latitude: 45.1567,
    longitude: -92.7823,
    altitude: 8230,
    on_ground: false,
    velocity: 389,
    true_track: 192,
    vertical_rate: -4.3,
    departureAirport: "YYZ",
  },

  // Departing north toward Canada
  {
    icao24: "a6b4d9",
    callsign: "DAL4421",
    origin_country: "United States",
    latitude: 45.0891,
    longitude: -93.3456,
    altitude: 3962,
    on_ground: false,
    velocity: 312,
    true_track: 356,
    vertical_rate: 9.2,
    departureAirport: "MSP",
  },

  // Southeast arrivals
  {
    icao24: "a9b3e6",
    callsign: "SKW5692",
    origin_country: "United States",
    latitude: 44.8134,
    longitude: -93.0621,
    altitude: 4877,
    on_ground: false,
    velocity: 345,
    true_track: 322,
    vertical_rate: -6.1,
    departureAirport: "ATL",
  },
  {
    icao24: "a7c2a4",
    callsign: "AAL3312",
    origin_country: "United States",
    latitude: 44.7823,
    longitude: -92.9012,
    altitude: 3658,
    on_ground: false,
    velocity: 289,
    true_track: 308,
    vertical_rate: -9.1,
    departureAirport: "ORD",
  },
  {
    icao24: "a5f7b3",
    callsign: "DAL2087",
    origin_country: "United States",
    latitude: 44.8567,
    longitude: -93.4123,
    altitude: 6706,
    on_ground: false,
    velocity: 378,
    true_track: 315,
    vertical_rate: -3.8,
    departureAirport: "MIA",
  },

  // Departing southeast
  {
    icao24: "a2e7b4",
    callsign: "FFT1203",
    origin_country: "United States",
    latitude: 44.9912,
    longitude: -93.1445,
    altitude: 2134,
    on_ground: false,
    velocity: 267,
    true_track: 142,
    vertical_rate: 11.2,
    departureAirport: "MSP",
  },
  {
    icao24: "a8a1c6",
    callsign: "SWA782",
    origin_country: "United States",
    latitude: 44.9456,
    longitude: -92.9834,
    altitude: 1829,
    on_ground: false,
    velocity: 245,
    true_track: 128,
    vertical_rate: 10.4,
    departureAirport: "MSP",
  },

  // Short regional hops
  {
    icao24: "a1d5e8",
    callsign: "SKW3341",
    origin_country: "United States",
    latitude: 45.0234,
    longitude: -93.5891,
    altitude: 2743,
    on_ground: false,
    velocity: 298,
    true_track: 245,
    vertical_rate: 5.3,
    departureAirport: "MSP",
  },
  {
    icao24: "a4b6f2",
    callsign: "SWA2219",
    origin_country: "United States",
    latitude: 44.9123,
    longitude: -93.2789,
    altitude: 914,
    on_ground: false,
    velocity: 178,
    true_track: 335,
    vertical_rate: 13.7,
    departureAirport: "MSP",
  },
];

type MockFlightState = MockFlightInput & {
  originLatitude: number;
  originLongitude: number;
};

let mockFlights: MockFlightState[] = [];
let mockInitialized = false;
let lastAdvanceAt = Date.now();
let mockActive = false;

export function isMockFlightsForced(): boolean {
  return process.env.EXPO_PUBLIC_USE_MOCK_FLIGHTS === "true";
}

export function isMockFlightsActive(): boolean {
  return mockActive || isMockFlightsForced();
}

export function setMockFlightsActive(active: boolean): void {
  mockActive = active;
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2);
  const dLat = lat2Rad - lat1Rad;
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
  const angular = distanceKm / 6371;

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

/** Great-circle path from departure airport to the aircraft's current position. */
export function buildMockFlightTrail(
  flight: Pick<
    MockFlightState,
    "latitude" | "longitude" | "originLatitude" | "originLongitude"
  >,
): [number, number][] {
  const lat1 = flight.originLatitude;
  const lng1 = flight.originLongitude;
  const lat2 = flight.latitude;
  const lng2 = flight.longitude;

  const distanceKm = haversineKm(lat1, lng1, lat2, lng2);
  if (distanceKm < 1) {
    return [[lng2, lat2]];
  }

  const segments = Math.max(40, Math.min(400, Math.round(distanceKm / 6)));
  const lat1Rad = toRadians(lat1);
  const lng1Rad = toRadians(lng1);
  const lat2Rad = toRadians(lat2);
  const lng2Rad = toRadians(lng2);

  const angularDistance = 2 * Math.asin(
    Math.sqrt(
      Math.sin((lat2Rad - lat1Rad) / 2) ** 2 +
        Math.cos(lat1Rad) *
          Math.cos(lat2Rad) *
          Math.sin((lng2Rad - lng1Rad) / 2) ** 2,
    ),
  );

  if (angularDistance === 0) {
    return [[lng2, lat2]];
  }

  const coordinates: [number, number][] = [];

  for (let i = 0; i <= segments; i += 1) {
    const f = i / segments;
    const a = Math.sin((1 - f) * angularDistance) / Math.sin(angularDistance);
    const b = Math.sin(f * angularDistance) / Math.sin(angularDistance);
    const x =
      a * Math.cos(lat1Rad) * Math.cos(lng1Rad) +
      b * Math.cos(lat2Rad) * Math.cos(lng2Rad);
    const y =
      a * Math.cos(lat1Rad) * Math.sin(lng1Rad) +
      b * Math.cos(lat2Rad) * Math.sin(lng2Rad);
    const z = a * Math.sin(lat1Rad) + b * Math.sin(lat2Rad);
    const lat = toDegrees(Math.atan2(z, Math.sqrt(x * x + y * y)));
    const lng = toDegrees(Math.atan2(y, x));
    coordinates.push([lng, lat]);
  }

  return coordinates;
}

function ensureMockFlights() {
  if (mockInitialized) return;

  mockFlights = MOCK_FLIGHTS.map((flight) => {
    const airport = AIRPORTS[flight.departureAirport];
    return {
      ...flight,
      callsign: flight.callsign.trim(),
      originLatitude: airport.latitude,
      originLongitude: airport.longitude,
    };
  });
  mockInitialized = true;
  lastAdvanceAt = Date.now();
}

function advanceMockFlights() {
  const now = Date.now();
  const elapsedHours = (now - lastAdvanceAt) / 3_600_000;
  lastAdvanceAt = now;

  if (elapsedHours <= 0) return;

  mockFlights = mockFlights.map((flight) => {
    const distanceKm = flight.velocity * 3.6 * elapsedHours;
    const [latitude, longitude] = moveByKm(
      flight.latitude,
      flight.longitude,
      flight.true_track,
      distanceKm,
    );
    const altitudeDelta = flight.vertical_rate * 3600 * elapsedHours;
    return {
      ...flight,
      latitude,
      longitude,
      altitude: Math.max(0, flight.altitude + altitudeDelta),
    };
  });
}

function toOpenSkyFlight(flight: MockFlightState): OpenSkyFlight {
  const velocity_mph = Math.round(flight.velocity * 2.23694);
  return {
    icao24: flight.icao24,
    callsign: flight.callsign,
    origin_country: flight.origin_country,
    latitude: flight.latitude,
    longitude: flight.longitude,
    altitude_m: flight.altitude,
    altitude_ft: Math.round(flight.altitude * 3.28084),
    heading: flight.true_track,
    velocity_ms: flight.velocity,
    velocity_mph,
    on_ground: flight.on_ground,
    last_contact: Math.floor(Date.now() / 1000),
  };
}

export function getMockFlightsInArea(
  minLat: number,
  maxLat: number,
  minLng: number,
  maxLng: number,
): OpenSkyFlight[] {
  ensureMockFlights();
  advanceMockFlights();
  mockActive = true;

  return mockFlights
    .filter(
      (flight) =>
        flight.latitude >= minLat &&
        flight.latitude <= maxLat &&
        flight.longitude >= minLng &&
        flight.longitude <= maxLng,
    )
    .map(toOpenSkyFlight);
}

export function getMockFlightPath(
  icao24: string,
): [number, number][] | null {
  ensureMockFlights();
  const flight = mockFlights.find(
    (candidate) => candidate.icao24.toLowerCase() === icao24.toLowerCase(),
  );
  if (!flight) return null;
  return buildMockFlightTrail(flight);
}
