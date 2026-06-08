import MapboxMap from "@/components/map/MapboxMap";
import { MapSighting } from "@/components/map/types";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../../lib/supabase";

// Only import mapbox-gl on web
let mapboxgl: any = null;
if (Platform.OS === "web") {
  mapboxgl = require("mapbox-gl");
}

type Sighting = MapSighting;

export default function MapScreen() {
  const [sightings, setSightings] = useState<Sighting[]>([]);

  // Hide Mapbox logo on web
  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (mapboxgl) {
      mapboxgl.accessToken = process.env.EXPO_PUBLIC_MAPBOX_TOKEN!;
    }
    if (typeof document !== "undefined") {
      const style = document.createElement("style");
      style.textContent = `
        .mapboxgl-ctrl-logo { display: none !important; }
        .mapboxgl-ctrl-attrib { display: none !important; }
        .mapboxgl-ctrl-bottom-right { display: none !important; }
        .mapboxgl-ctrl-bottom-left { display: none !important; }
      `;
      document.head.appendChild(style);
      return () => {
        document.head.removeChild(style);
      };
    }
  }, []);

  // Fetch sightings from Supabase
  useEffect(() => {
    async function fetchSightings() {
      const { data } = await supabase
        .from("sightings")
        .select("id, latitude, longitude, status");
      if (data) setSightings(data);
    }
    fetchSightings();
  }, []);

  return (
    <View style={styles.container}>
      {Platform.OS === "web" ? (
        <MapboxMap
          style={styles.map}
          sightings={sightings}
          onPinPress={(id: string) =>
            router.push(`/(tabs)/map/sighting/${id}` as any)
          }
        />
      ) : (
        <View style={styles.mapFallback}>
          <Text style={styles.mapFallbackText}>
            Map requires a native build.{"\n"}Use web preview for now.
          </Text>
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
        <TouchableOpacity style={styles.filterBtn}>
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
});
