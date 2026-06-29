import { functionAuthHeaders, functionUrl } from './edgeFetch';
import { getBoundingBox, getFlightsInArea } from './opensky';
import { findBestSatelliteMatch } from './satellites';
import { supabase } from './supabase';

const EXPLAINED_RADIUS_KM = 10;
const PARTIAL_RADIUS_KM = 25;

// Moon excluded — it's almost never a convincing UFO explanation.
const CELESTIAL_BODIES = ['venus', 'jupiter', 'mars', 'saturn'];

// If cloud cover exceeds this threshold, nothing in the sky is visible.
const OVERCAST_THRESHOLD_PCT = 75;

// Brightest stars (magnitude ≤ 1) that people genuinely mistake for unusual objects.
// RA in decimal hours, Dec in degrees, J2000 epoch.
const BRIGHT_STARS = [
  { name: 'Sirius',    ra: 6.7525,  dec: -16.716, magnitude: -1.46 },
  { name: 'Canopus',  ra: 6.3992,  dec: -52.696, magnitude: -0.74 },
  { name: 'Arcturus', ra: 14.2612, dec:  19.182, magnitude: -0.05 },
  { name: 'Vega',     ra: 18.6157, dec:  38.784, magnitude:  0.03 },
  { name: 'Capella',  ra: 5.2782,  dec:  45.998, magnitude:  0.08 },
  { name: 'Rigel',    ra: 5.2423,  dec:  -8.202, magnitude:  0.12 },
  { name: 'Procyon',  ra: 7.6552,  dec:   5.225, magnitude:  0.38 },
  { name: 'Betelgeuse', ra: 5.9195, dec:  7.407, magnitude:  0.50 },
  { name: 'Altair',   ra: 19.8463, dec:   8.868, magnitude:  0.76 },
  { name: 'Aldebaran',ra: 4.5987,  dec:  16.509, magnitude:  0.87 },
  { name: 'Antares',  ra: 16.4901, dec: -26.432, magnitude:  0.96 },
  { name: 'Spica',    ra: 13.4199, dec: -11.161, magnitude:  1.04 },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseSightedAt(sightedAt: string): Date {
  // Handle "JUNE 8, 2026 20:57" format
  const match = sightedAt.match(/(\w+)\s+(\d+),\s+(\d{4})\s+(\d{2}):(\d{2})/);
  if (match) {
    const [, month, day, year, hour, minute] = match;
    return new Date(`${month} ${day}, ${year} ${hour}:${minute}:00`);
  }
  return new Date(sightedAt);
}

function toRad(deg: number) { return (deg * Math.PI) / 180; }
function toDeg(rad: number) { return (rad * 180) / Math.PI; }

// ── Cloud cover ───────────────────────────────────────────────────────────────

async function getCloudCoverPercent(
  latitude: number,
  longitude: number,
  sightingTime: Date,
): Promise<number | null> {
  try {
    const date = sightingTime.toISOString().split('T')[0];
    const daysDiff = (Date.now() - sightingTime.getTime()) / 86_400_000;

    let url: string;
    if (daysDiff <= 7) {
      const params = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        hourly: 'cloud_cover',
        timezone: 'auto',
        past_days: '7',
        forecast_days: '1',
      });
      url = `https://api.open-meteo.com/v1/forecast?${params}`;
    } else {
      const params = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        hourly: 'cloud_cover',
        timezone: 'auto',
        start_date: date,
        end_date: date,
      });
      url = `https://archive-api.open-meteo.com/v1/archive?${params}`;
    }

    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    const times: string[] = data?.hourly?.time ?? [];
    const coverages: number[] = data?.hourly?.cloud_cover ?? [];
    if (times.length === 0) return null;

    const sightingMs = sightingTime.getTime();
    let bestIdx = 0;
    let bestDiff = Infinity;
    for (let i = 0; i < times.length; i++) {
      const diff = Math.abs(new Date(times[i]).getTime() - sightingMs);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIdx = i;
      }
    }

    return coverages[bestIdx] ?? null;
  } catch {
    return null;
  }
}

// ── Planet matching (Astronomy API) ──────────────────────────────────────────

async function checkPlanetMatch(
  latitude: number,
  longitude: number,
  sightingTime: Date,
  minAltitude: number,
): Promise<string | null> {
  try {
    const date = sightingTime.toISOString().split('T')[0];
    const time = sightingTime.toTimeString().slice(0, 8);

    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      elevation: '0',
      from_date: date,
      to_date: date,
      time,
    });

    const response = await fetch(functionUrl('astronomy-proxy', params), {
      headers: await functionAuthHeaders(),
    });

    if (!response.ok) {
      console.warn('Astronomy API error:', response.status, await response.text());
      return null;
    }

    const data = await response.json();
    const rows = data?.data?.table?.rows ?? [];

    // Use sun altitude to tighten the threshold during daylight.
    let sunAltitude = -90;
    const sunRow = rows.find((r: any) => r?.entry?.id?.toLowerCase() === 'sun');
    if (sunRow) {
      const sunAlt = sunRow?.cells?.[0]?.position?.horizontal?.altitude?.degrees;
      if (sunAlt !== undefined) sunAltitude = parseFloat(sunAlt);
    }
    const effectiveMin = sunAltitude > -6 ? 40 : minAltitude;

    let best: { name: string; altitude: number } | null = null;

    for (const row of rows) {
      const bodyId = row?.entry?.id?.toLowerCase();
      if (!CELESTIAL_BODIES.includes(bodyId)) continue;

      const cell = row?.cells?.[0];
      const altDeg = cell?.position?.horizontal?.altitude?.degrees;
      const magnitude = cell?.extraInfo?.magnitude;

      if (altDeg === undefined) continue;
      const alt = parseFloat(altDeg);
      if (alt < effectiveMin) continue;
      if (magnitude === undefined || parseFloat(magnitude) > -1) continue;

      if (!best || alt > best.altitude) {
        best = { name: row.entry.name, altitude: alt };
      }
    }

    return best?.name ?? null;
  } catch (err) {
    console.warn('Planet check failed:', err);
    return null;
  }
}

// ── Star matching (local computation, no API) ─────────────────────────────────

function starAltitudeDeg(
  raHours: number,
  decDeg: number,
  observerLatDeg: number,
  observerLngDeg: number,
  date: Date,
): number {
  const JD = date.getTime() / 86_400_000 + 2_440_587.5;
  const T = (JD - 2_451_545.0) / 36_525;
  let GMST =
    280.46061837 +
    360.98564736629 * (JD - 2_451_545.0) +
    T * T * 0.000387933 -
    (T * T * T) / 38_710_000;
  GMST = ((GMST % 360) + 360) % 360;
  const LST = ((GMST + observerLngDeg) % 360 + 360) % 360;

  const HA = ((LST - raHours * 15) % 360 + 360) % 360;
  const sinAlt =
    Math.sin(toRad(decDeg)) * Math.sin(toRad(observerLatDeg)) +
    Math.cos(toRad(decDeg)) * Math.cos(toRad(observerLatDeg)) * Math.cos(toRad(HA));
  return toDeg(Math.asin(sinAlt));
}

function checkStarMatch(
  latitude: number,
  longitude: number,
  sightingTime: Date,
  minAltitude: number,
): string | null {
  let best: { name: string; altitude: number } | null = null;

  for (const star of BRIGHT_STARS) {
    const alt = starAltitudeDeg(star.ra, star.dec, latitude, longitude, sightingTime);
    if (alt < minAltitude) continue;
    if (!best || alt > best.altitude) {
      best = { name: star.name, altitude: alt };
    }
  }

  return best?.name ?? null;
}

// ── Main exports ──────────────────────────────────────────────────────────────

export type SightingAnalysis = {
  status: string;
  matchedFlight: string | null;
  matchedCelestial: string | null;
  matchedSatellite: string | null;
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
    let matchedSatellite: string | null = null;

    // Check live flight data if sighting was recent (within 2 hours).
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
          f.longitude <= closeBox.maxLng,
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

    // Check sky objects if still unexplained, but only when sky is clear enough.
    if (status === 'unexplained') {
      const cloudCover = await getCloudCoverPercent(latitude, longitude, sightingTime);
      const skyIsClear = cloudCover === null || cloudCover < OVERCAST_THRESHOLD_PCT;

      if (skyIsClear) {
        const minAlt = 20;
        matchedCelestial =
          (await checkPlanetMatch(latitude, longitude, sightingTime, minAlt)) ??
          checkStarMatch(latitude, longitude, sightingTime, minAlt);

        if (matchedCelestial) {
          status = 'explained';
        } else {
          matchedSatellite = await findBestSatelliteMatch(
            latitude,
            longitude,
            sightingTime,
            10,
          );
          if (matchedSatellite) status = 'explained';
        }
      }
    }

    return { status, matchedFlight, matchedCelestial, matchedSatellite };
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
  if (__DEV__) {
    console.log('Running analysis for sighting:', sightingId, { latitude, longitude, sightedAt });
  }

  const analysis = await computeSightingAnalysis(latitude, longitude, sightedAt);
  if (!analysis) return null;

  const { status, matchedFlight, matchedCelestial, matchedSatellite } = analysis;

  const { error: updateError } = await supabase
    .from('sightings')
    .update({
      status,
      matched_flight: matchedFlight,
      matched_celestial: matchedCelestial,
      matched_satellite: matchedSatellite,
    })
    .eq('id', sightingId);

  if (updateError) {
    console.error('Failed to update sighting:', updateError);
  } else if (__DEV__) {
    console.log('Sighting updated successfully:', sightingId, status);
  }

  if (__DEV__) {
    console.log('Analysis complete:', { sightingId, status, matchedFlight, matchedCelestial, matchedSatellite });
  }
  return analysis;
}
