import { getBoundingBox, getFlightsInArea } from './opensky';
import { supabase } from './supabase';

const EXPLAINED_RADIUS_KM = 10;
const PARTIAL_RADIUS_KM = 25;

export async function analyzeSighting(
  sightingId: string,
  latitude: number,
  longitude: number,
  sightedAt: string,
) {
  try {
    console.log('Running analysis for sighting:', sightingId, { latitude, longitude, sightedAt });
    const sightingTime = new Date(sightedAt);
    const now = new Date();
    const ageMinutes = (now.getTime() - sightingTime.getTime()) / 60000;

    let status = 'unexplained';
    let matchedFlight: string | null = null;
    let matchedCelestial: string | null = null;

    // Only check live flight data if sighting was recent (within 2 hours)
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
          const f = closeFlights[0];
          matchedFlight = f.callsign || f.icao24;
        } else {
          status = 'partial';
          const f = airborne[0];
          matchedFlight = f.callsign || f.icao24;
        }
      }
    }

    // Update the sighting in Supabase
    await supabase
      .from('sightings')
      .update({ status, matched_flight: matchedFlight, matched_celestial: matchedCelestial })
      .eq('id', sightingId);

    return { status, matchedFlight, matchedCelestial };
  } catch (err) {
    console.warn('Analysis failed:', err);
    return null;
  }
}