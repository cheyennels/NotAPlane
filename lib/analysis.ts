import { getBoundingBox, getFlightsInArea } from './opensky';
import { supabase } from './supabase';

const EXPLAINED_RADIUS_KM = 10;
const PARTIAL_RADIUS_KM = 25;

// Bright celestial objects worth checking
const CELESTIAL_BODIES = ['moon', 'venus', 'jupiter', 'mars', 'saturn'];

function parseSightedAt(sightedAt: string): Date {
  // Handle "JUNE 8, 2026 20:57" format
  const match = sightedAt.match(/(\w+)\s+(\d+),\s+(\d{4})\s+(\d{2}):(\d{2})/);
  if (match) {
    const [, month, day, year, hour, minute] = match;
    return new Date(`${month} ${day}, ${year} ${hour}:${minute}:00`);
  }
  // Fallback to native parsing (ISO strings, etc.)
  return new Date(sightedAt);
}

async function checkCelestialMatch(
  latitude: number,
  longitude: number,
  sightingTime: Date,
): Promise<string | null> {
  try {
    const appId = process.env.EXPO_PUBLIC_ASTRONOMY_APP_ID;
    const appSecret = process.env.EXPO_PUBLIC_ASTRONOMY_APP_SECRET;
    if (!appId || !appSecret) return null;

    const auth = btoa(`${appId}:${appSecret}`);

    const date = sightingTime.toISOString().split('T')[0];
    const time = sightingTime.toTimeString().slice(0, 8); // "HH:MM:SS" instead of "HH:MM"

    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      elevation: '0',
      from_date: date,
      to_date: date,
      time,
    });

    const response = await fetch(
      `https://api.astronomyapi.com/api/v2/bodies/positions?${params}`,
      {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      }
    );

    if (!response.ok) {
        const errorBody = await response.text();
        console.warn('Astronomy API error:', response.status, errorBody);
        return null;
      }

    const data = await response.json();
    const rows = data?.data?.table?.rows ?? [];

    for (const row of rows) {
      const bodyId = row?.entry?.id?.toLowerCase();
      if (!CELESTIAL_BODIES.includes(bodyId)) continue;

      const cell = row?.cells?.[0];
      const altitude = cell?.position?.horizontal?.altitude?.degrees;
      const magnitude = cell?.extraInfo?.magnitude;

      // Visible if above horizon and reasonably bright
      if (altitude !== undefined && parseFloat(altitude) > 5) {
        if (magnitude === undefined || parseFloat(magnitude) < 3) {
          return row.entry.name; // e.g. "Moon", "Venus"
        }
      }
    }

    return null;
  } catch (err) {
    console.warn('Celestial check failed:', err);
    return null;
  }
}

export type SightingAnalysis = {
  status: string;
  matchedFlight: string | null;
  matchedCelestial: string | null;
};

export async function computeSightingAnalysis(
  latitude: number,
  longitude: number,
  sightedAt: string,
): Promise<SightingAnalysis | null> {
  try {
    const sightingTime = parseSightedAt(sightedAt);
    if (isNaN(sightingTime.getTime())) {
      console.warn('Could not parse sightedAt:', sightedAt);
      return null;
    }

    const now = new Date();
    const ageMinutes = (now.getTime() - sightingTime.getTime()) / 60000;

    let status = 'unexplained';
    let matchedFlight: string | null = null;
    let matchedCelestial: string | null = null;

    // Check live flight data if sighting was recent (within 2 hours)
    if (ageMinutes < 120) {
      const box = getBoundingBox(latitude, longitude, PARTIAL_RADIUS_KM);
      const result = await getFlightsInArea(box.minLat, box.maxLat, box.minLng, box.maxLng);
      const airborne = result.flights.filter(f => !f.on_ground);

      if (airborne.length > 0) {
        const closeBox = getBoundingBox(latitude, longitude, EXPLAINED_RADIUS_KM);
        const closeFlights = airborne.filter(f =>
          f.latitude >= closeBox.minLat &&
          f.latitude <= closeBox.maxLat &&
          f.longitude >= closeBox.minLng &&
          f.longitude <= closeBox.maxLng
        );

        if (closeFlights.length > 0) {
          status = 'explained';
          matchedFlight = closeFlights[0].callsign || closeFlights[0].icao24;
        } else {
          status = 'partial';
          matchedFlight = airborne[0].callsign || airborne[0].icao24;
        }
      }
    }

    // Check celestial objects if still unexplained
    if (status === 'unexplained') {
      matchedCelestial = await checkCelestialMatch(latitude, longitude, sightingTime);
      if (matchedCelestial) {
        status = 'explained';
      }
    }

    return { status, matchedFlight, matchedCelestial };
  } catch (err) {
    console.warn('Analysis failed:', err);
    return null;
  }
}

export async function analyzeSighting(
  sightingId: string,
  latitude: number,
  longitude: number,
  sightedAt: string,
) {
  console.log('Running analysis for sighting:', sightingId, { latitude, longitude, sightedAt });

  const analysis = await computeSightingAnalysis(latitude, longitude, sightedAt);
  if (!analysis) return null;

  const { status, matchedFlight, matchedCelestial } = analysis;

  const { error: updateError } = await supabase
    .from('sightings')
    .update({ status, matched_flight: matchedFlight, matched_celestial: matchedCelestial })
    .eq('id', sightingId);

  if (updateError) {
    console.error('Failed to update sighting:', updateError);
  } else {
    console.log('Sighting updated successfully:', sightingId, status);
  }

  console.log('Analysis complete:', { sightingId, status, matchedFlight, matchedCelestial });
  return analysis;
}