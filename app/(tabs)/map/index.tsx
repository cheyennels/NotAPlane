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
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

type Sighting = MapSighting & {
  created_at: string;
};

export default function MapScreen() {
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [allSightings, setAllSightings] = useState<Sighting[]>([]);
  const [mapZoom, setMapZoom] = useState(CELESTIAL_REFERENCE_ZOOM);
  const { filters } = useFilters();
  // Minneapolis center coordinates
  const MAP_CENTER = { latitude: 44.9778, longitude: -93.265 };

  const { flights, flightTrails, error, usingMock, usingCached } = useNearbyFlights(
    MAP_CENTER.latitude,
    MAP_CENTER.longitude,
    100,
    filters.showFlightPaths,
  );

  const { bodies: celestialBodies, satellites, satellitesLoading } = useNearbyCelestial(
    MAP_CENTER.latitude,
    MAP_CENTER.longitude,
    filters.showCelestial,
    filters.showSatellites,
  );

  const visibleCelestial = [
    ...(filters.showCelestial ? celestialBodies : []),
    ...(filters.showSatellites ? satellites : []),
  ];

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
    }, [fetchSightings]),
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
    (Boolean(error) || usingMock || usingCached || flights.length === 0);

  return (
    <View style={styles.container}>
      <MapboxMap
        style={styles.map}
        sightings={sightings}
        flights={filters.showFlightPaths ? flights : []}
        flightTrails={filters.showFlightPaths ? flightTrails : []}
        celestialBodies={visibleCelestial}
        centerLatitude={MAP_CENTER.latitude}
        centerLongitude={MAP_CENTER.longitude}
        onZoomChange={setMapZoom}
        onPinPress={(id: string) =>
          router.push(`/(tabs)/map/sighting/${id}` as any)
        }
      />
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

      {filters.showFlightPaths && usingMock ? (
        <View style={styles.flightDemo}>
          <Text style={styles.flightDemoText}>Demo flight data</Text>
        </View>
      ) : null}

      {filters.showFlightPaths && usingCached && !usingMock ? (
        <View style={styles.flightCached}>
          <Text style={styles.flightCachedText}>Saved flight data</Text>
        </View>
      ) : null}

      {filters.showFlightPaths && !error && !usingMock && !usingCached && flights.length === 0 ? (
        <View style={styles.flightError}>
          <Text style={styles.flightErrorText}>Loading aircraft…</Text>
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
