import MapboxMap from "@/components/map/MapboxMap";
import { MapSighting } from "@/components/map/types";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { useFilters } from "@/context/FilterContext";
import { useNearbyFlights } from "@/hooks/useFlightData";
import { supabase } from "@/lib/supabase";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Sighting = MapSighting & {
  created_at: string;
};

export default function MapScreen() {
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [allSightings, setAllSightings] = useState<Sighting[]>([]);
  const { filters } = useFilters();
  // Minneapolis center coordinates
  const MAP_CENTER = { latitude: 44.9778, longitude: -93.265 };

  const { flights, flightTrails, error } = useNearbyFlights(
    MAP_CENTER.latitude,
    MAP_CENTER.longitude,
    100,
    true,
  );

  // Fetch all sightings from Supabase
  useEffect(() => {
    async function fetchSightings() {
      const { data } = await supabase
        .from("sightings")
        .select("id, latitude, longitude, status, created_at");
      if (data) setAllSightings(data);
    }
    fetchSightings();
  }, []);

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

  return (
    <View style={styles.container}>
      <MapboxMap
        style={styles.map}
        sightings={sightings}
        flights={filters.showFlightPaths ? flights : []}
        flightTrails={filters.showFlightPaths ? flightTrails : []}
        onPinPress={(id: string) =>
          router.push(`/(tabs)/map/sighting/${id}` as any)
        }
      />

      {filters.showFlightPaths && error ? (
        <View style={styles.flightError}>
          <Text style={styles.flightErrorText}>{error}</Text>
        </View>
      ) : null}

      {filters.showFlightPaths && !error && flights.length === 0 ? (
        <View style={styles.flightError}>
          <Text style={styles.flightErrorText}>
            Loading aircraft… If this persists, OpenSky may be rate-limiting —
            wait a few minutes and refresh.
          </Text>
        </View>
      ) : null}

      {/* Active filter indicator */}
      {(!filters.showExplained ||
        !filters.showPartial ||
        !filters.showUnexplained ||
        !filters.showPending ||
        filters.timeRange === "week" ||
        filters.showFlightPaths) && (
        <View style={styles.filterActive}>
          <Text style={styles.filterActiveText}>● Filters Active</Text>
        </View>
      )}

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: Colors.blue }]} />
          <Text style={styles.legendText}>Explained</Text>
        </View>
        <View style={styles.legendRow}>
          <View
            style={[styles.legendDot, { backgroundColor: Colors.yellow }]}
          />
          <Text style={styles.legendText}>Partial Match</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: Colors.red }]} />
          <Text style={styles.legendText}>Unexplained</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: Colors.green }]} />
          <Text style={styles.legendText}>Pending</Text>
        </View>
      </View>

      {/* Bottom buttons */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.filterBtn}
          onPress={() => router.push("/(tabs)/map/filter" as any)}
        >
          <Text style={styles.filterBtnText}>Filter</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.fileReportBtn}
          onPress={() => router.push("/report/step-1-when" as any)}
        >
          <Text style={styles.fileReportBtnText}>File Report</Text>
        </TouchableOpacity>
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
    borderWidth: 2,
    borderColor: Colors.white,
    padding: 14,
    alignItems: "center",
    backgroundColor: Colors.black,
  },
  filterBtnText: {
    fontFamily: Fonts.display,
    fontSize: 12,
    color: Colors.white,
    letterSpacing: 1,
  },
  fileReportBtn: {
    width: "40%",
    backgroundColor: Colors.darkGreen,
    borderWidth: 2,
    borderColor: Colors.green,
    padding: 14,
    alignItems: "center",
  },
  fileReportBtnText: {
    fontFamily: Fonts.display,
    fontSize: 12,
    color: Colors.green,
    letterSpacing: 1,
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
    right: 16,
    backgroundColor: "rgba(20,20,20,0.92)",
    borderWidth: 2,
    borderColor: Colors.yellow,
    padding: 8,
  },
  flightErrorText: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: Colors.yellow,
    letterSpacing: 0.5,
    lineHeight: 14,
  },
});
