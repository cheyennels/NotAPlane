import SkyCompass from "@/components/map/SkyCompass";
import MapboxMap from "@/components/map/MapboxMap";
import { MapSighting } from "@/components/map/types";
import Button from "@/components/ui/Button";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { useFilters } from "@/context/FilterContext";
import { useNearbyCelestial, CELESTIAL_REFERENCE_ZOOM } from "@/hooks/useCelestialData";
import { useNearbyFlights } from "@/hooks/useFlightData";
import { supabase } from "@/lib/supabase";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

type Sighting = MapSighting & {
  created_at: string;
};

// Fallback map center (Minneapolis) used when the account has no saved
// location. Otherwise the map opens on the user's geocoded account location.
const FALLBACK_CENTER = { latitude: 44.9778, longitude: -93.265 };
const CENTER_DEBOUNCE_MS = 600;

export default function MapScreen() {
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [allSightings, setAllSightings] = useState<Sighting[]>([]);
  const [mapZoom, setMapZoom] = useState(CELESTIAL_REFERENCE_ZOOM);
  const { filters } = useFilters();

  // `center` drives the flight/celestial queries and follows the map as the user
  // pans. Debounced so we don't refetch mid-gesture, and rounded to ~1km so tiny
  // nudges don't trigger a new request.
  const [center, setCenter] = useState(FALLBACK_CENTER);
  const centerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The map opens centered on the user's account location (geocoded on save).
  // null until loaded, so we render a spinner rather than flashing Minneapolis.
  const [homeCenter, setHomeCenter] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const homeRef = useRef<{ latitude: number; longitude: number } | null>(null);

  const loadHomeCenter = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    let coords = FALLBACK_CENTER;
    const userId = session?.user?.id;
    if (userId) {
      const { data } = await supabase
        .from("profiles")
        .select("latitude, longitude")
        .eq("id", userId)
        .maybeSingle();
      if (data?.latitude != null && data?.longitude != null) {
        coords = { latitude: data.latitude, longitude: data.longitude };
      }
    }
    const prev = homeRef.current;
    // Only recenter when the account location actually changed, so returning to
    // the map tab after panning elsewhere doesn't yank the view back.
    if (
      prev &&
      prev.latitude === coords.latitude &&
      prev.longitude === coords.longitude
    ) {
      return;
    }
    homeRef.current = coords;
    setHomeCenter(coords);
    setCenter(coords);
  }, []);

  const handleCenterChange = useCallback(
    (next: { latitude: number; longitude: number }) => {
      if (centerTimer.current) clearTimeout(centerTimer.current);
      centerTimer.current = setTimeout(() => {
        const lat = Math.round(next.latitude * 100) / 100;
        const lng = Math.round(next.longitude * 100) / 100;
        setCenter((prev) =>
          prev.latitude === lat && prev.longitude === lng
            ? prev
            : { latitude: lat, longitude: lng },
        );
      }, CENTER_DEBOUNCE_MS);
    },
    [],
  );

  useEffect(
    () => () => {
      if (centerTimer.current) clearTimeout(centerTimer.current);
    },
    [],
  );

  const { flights, flightTrails, loading: flightsLoading, error, usingMock, usingCached } =
    useNearbyFlights(
      center.latitude,
      center.longitude,
      100,
      filters.showFlightPaths,
    );

  const { bodies: celestialBodies, satellites, satellitesLoading } = useNearbyCelestial(
    center.latitude,
    center.longitude,
    filters.showCelestial,
    filters.showSatellites,
  );

  const visibleCelestial = [
    ...(filters.showCelestial ? celestialBodies : []),
    ...(filters.showSatellites ? satellites : []),
  ];

  // Show a "Loading aircraft" notice while a fetch is in flight, but only after a
  // short delay so the fast cached polls (~every 10s) don't flicker it — it
  // appears for the slower fetches (initial load, panning to a new area).
  const [showFlightLoading, setShowFlightLoading] = useState(false);
  useEffect(() => {
    if (!flightsLoading) {
      setShowFlightLoading(false);
      return;
    }
    const timer = setTimeout(() => setShowFlightLoading(true), 400);
    return () => clearTimeout(timer);
  }, [flightsLoading]);

  const fetchSightings = useCallback(async () => {
    // community_sightings is the privacy-safe view: rounded coordinates, no
    // user_id. The base sightings table only returns the viewer's own rows.
    const { data, error } = await supabase
      .from("community_sightings")
      .select("id, latitude, longitude, status, created_at");

    if (error) {
      console.warn("Failed to load sightings:", error.message);
      return;
    }

    setAllSightings(data ?? []);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchSightings();
      void loadHomeCenter();
    }, [fetchSightings, loadHomeCenter]),
  );

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void fetchSightings();
    });

    return () => subscription.unsubscribe();
  }, [fetchSightings]);

  // Apply filters whenever allSightings or filters change
  useEffect(() => {
    let filtered = allSightings;

    // Filter by status
    filtered = filtered.filter((s) => {
      if (s.status === "explained" && !filters.showExplained) return false;
      if (s.status === "partial" && !filters.showPartial) return false;
      if (s.status === "unexplained" && !filters.showUnexplained) return false;
      if (s.status === "pending" && !filters.showPending) return false;
      return true;
    });

    // Filter by time range
    if (filters.timeRange === "week") {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      filtered = filtered.filter((s) => new Date(s.created_at) >= weekAgo);
    }

    setSightings(filtered);
  }, [allSightings, filters]);

  const legendEntries = [
    filters.showExplained && { label: "Explained", color: Colors.blue },
    filters.showPartial && { label: "Partial Match", color: Colors.yellow },
    filters.showUnexplained && { label: "Unexplained", color: Colors.red },
    filters.showPending && { label: "Pending", color: Colors.green },
    filters.showFlightPaths && {
      label: "Flights",
      color: Colors.green,
      icon: "✈",
    },
    filters.showCelestial && { label: "Planets", color: "#FFA500" },
    filters.showCelestial && { label: "Stars", color: "#FFFFFF" },
    filters.showSatellites && { label: "Satellites", color: "#FF69B4" },
  ].filter(Boolean) as { label: string; color: string; icon?: string }[];

  const showFlightStatus =
    filters.showFlightPaths &&
    (Boolean(error) || usingMock || usingCached || showFlightLoading);

  return (
    <View style={styles.container}>
      {homeCenter ? (
        <MapboxMap
          key={`${homeCenter.latitude},${homeCenter.longitude}`}
          style={styles.map}
          sightings={sightings}
          flights={filters.showFlightPaths ? flights : []}
          flightTrails={filters.showFlightPaths ? flightTrails : []}
          celestialBodies={visibleCelestial}
          centerLatitude={homeCenter.latitude}
          centerLongitude={homeCenter.longitude}
          onZoomChange={setMapZoom}
          onCenterChange={handleCenterChange}
          onPinPress={(id: string) =>
            router.push(`/(tabs)/map/sighting/${id}` as any)
          }
        />
      ) : (
        <View style={[styles.map, styles.mapLoading]}>
          <ActivityIndicator color={Colors.green} />
        </View>
      )}
      {visibleCelestial.length > 0 && mapZoom >= CELESTIAL_REFERENCE_ZOOM && (
        <View style={styles.skyCompass}>
          <SkyCompass bodies={visibleCelestial.filter((b) => b.altitude > 5)} />
        </View>
      )}

      {filters.showFlightPaths && error ? (
        <View style={styles.flightError}>
          <Text style={styles.flightErrorText}>{error}</Text>
        </View>
      ) : null}

      {filters.showFlightPaths && usingMock && !showFlightLoading ? (
        <View style={styles.flightDemo}>
          <Text style={styles.flightDemoText}>Demo flight data</Text>
        </View>
      ) : null}

      {filters.showFlightPaths && usingCached && !usingMock && !showFlightLoading ? (
        <View style={styles.flightCached}>
          <Text style={styles.flightCachedText}>Saved flight data</Text>
        </View>
      ) : null}

      {filters.showFlightPaths && showFlightLoading ? (
        <View style={styles.flightLoading}>
          <ActivityIndicator size="small" color={Colors.green} />
          <Text style={styles.flightLoadingText}>Loading aircraft…</Text>
        </View>
      ) : null}

      {filters.showSatellites && satellitesLoading && satellites.length === 0 ? (
        <View
          style={[
            styles.flightError,
            showFlightStatus ? styles.statusBannerOffset : null,
          ]}
        >
          <Text style={styles.flightErrorText}>Loading satellites…</Text>
        </View>
      ) : null}

      {/* Active filter indicator */}
      {(!filters.showExplained ||
        !filters.showPartial ||
        !filters.showUnexplained ||
        !filters.showPending ||
        filters.timeRange === "week" ||
        filters.showFlightPaths ||
        filters.showCelestial ||
        filters.showSatellites) && (
        <View style={styles.filterActive}>
          <Text style={styles.filterActiveText}>● Filters Active</Text>
        </View>
      )}

      {/* Legend — only shows entries for visible layers */}
      {legendEntries.length > 0 && (
        <View style={styles.legend}>
          {legendEntries.map(({ label, color, icon }) => (
            <View key={label} style={styles.legendRow}>
              {icon ? (
                <Text style={[styles.legendIcon, { color }]}>{icon}</Text>
              ) : (
                <View style={[styles.legendDot, { backgroundColor: color }]} />
              )}
              <Text style={styles.legendText}>{label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Bottom buttons */}
      <View style={styles.bottomBar}>
        <Button
          label="Filter"
          variant="outline"
          style={styles.filterBtn}
          onPress={() => router.push("/(tabs)/map/filter" as any)}
        />
        <Button
          label="File Report"
          variant="accent"
          style={styles.fileReportBtn}
          onPress={() => router.push("/report/step-1-when" as any)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  map: {
    flex: 1,
  },
  mapLoading: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.black,
  },
  legend: {
    position: "absolute",
    top: 40,
    right: 16,
    backgroundColor: "rgba(20,20,20,0.92)",
    borderWidth: 2,
    borderColor: Colors.white,
    padding: 12,
    gap: 8,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendIcon: {
    width: 10,
    fontSize: 10,
    lineHeight: 10,
    textAlign: "center",
  },
  legendText: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: Colors.white,
    letterSpacing: 1,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row-reverse",
    gap: 12,
    padding: 16,
    paddingBottom: 16,
  },
  filterBtn: {
    width: "30%",
    padding: 14,
    backgroundColor: Colors.black,
  },
  fileReportBtn: {
    width: "40%",
    padding: 14,
  },
  mapFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.black,
    gap: 12,
  },
  mapFallbackText: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.muted,
    textAlign: "center",
    lineHeight: 18,
    letterSpacing: 1,
  },
  filterActive: {
    position: "absolute",
    top: 40,
    left: 16,
    backgroundColor: "rgba(20,20,20,0.92)",
    borderWidth: 2,
    borderColor: Colors.green,
    padding: 8,
  },
  filterActiveText: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: Colors.green,
    letterSpacing: 1,
  },
  flightError: {
    position: "absolute",
    top: 80,
    left: 16,
    maxWidth: "60%",
    alignSelf: "flex-start",
    backgroundColor: "rgba(20,20,20,0.92)",
    borderWidth: 2,
    borderColor: Colors.yellow,
    padding: 8,
  },
  statusBannerOffset: {
    top: 116,
  },
  flightLoading: {
    position: "absolute",
    top: 80,
    left: 16,
    maxWidth: "60%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(20,20,20,0.92)",
    borderWidth: 2,
    borderColor: Colors.green,
    padding: 8,
  },
  flightLoadingText: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: Colors.green,
    letterSpacing: 0.5,
    lineHeight: 14,
  },
  flightErrorText: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: Colors.yellow,
    letterSpacing: 0.5,
    lineHeight: 14,
  },
  flightDemo: {
    position: "absolute",
    top: 80,
    left: 16,
    maxWidth: "60%",
    alignSelf: "flex-start",
    backgroundColor: "rgba(20,20,20,0.92)",
    borderWidth: 2,
    borderColor: Colors.green,
    padding: 8,
  },
  flightDemoText: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: Colors.green,
    letterSpacing: 0.5,
    lineHeight: 14,
  },
  flightCached: {
    position: "absolute",
    top: 80,
    left: 16,
    maxWidth: "60%",
    alignSelf: "flex-start",
    backgroundColor: "rgba(20,20,20,0.92)",
    borderWidth: 2,
    borderColor: Colors.blue,
    padding: 8,
  },
  flightCachedText: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: Colors.blue,
    letterSpacing: 0.5,
    lineHeight: 14,
  },
  skyCompass: {
    position: "absolute",
    bottom: 90,
    left: 16,
  },
});
