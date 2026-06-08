import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../../../../lib/supabase";

// Only import mapbox on web
let mapboxgl: any = null;
if (Platform.OS === "web") {
  mapboxgl = require("mapbox-gl");
}

type Sighting = {
  id: string;
  sighted_at: string;
  duration: string;
  latitude: number;
  longitude: number;
  description: string;
  shape: string;
  colors: string[];
  sound: string;
  direction: string;
  altitude: string;
  movement: string;
  speed: string;
  status: string;
  matched_flight: string | null;
  matched_celestial: string | null;
  photo_urls: string[];
  created_at: string;
};

function getStatusColor(status: string) {
  switch (status) {
    case "explained":
      return Colors.blue;
    case "partial":
      return Colors.yellow;
    case "unexplained":
      return Colors.red;
    default:
      return Colors.green;
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "explained":
      return "EXPLAINED";
    case "partial":
      return "PARTIAL MATCH";
    case "unexplained":
      return "UNEXPLAINED";
    default:
      return "PENDING";
  }
}

export default function SightingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [sighting, setSighting] = useState<Sighting | null>(null);
  const [loading, setLoading] = useState(true);
  const [corroborated, setCorroborated] = useState(false);
  const [corroborationCount, setCorroborationCount] = useState(0);

  useEffect(() => {
    fetchSighting();
    fetchCorroborations();
  }, [id]);

  async function fetchSighting() {
    const { data, error } = await supabase
      .from("sightings")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      Alert.alert("Error", "Could not load sighting.");
      router.back();
    } else {
      setSighting(data);
    }
    setLoading(false);
  }

  async function fetchCorroborations() {
    const { count } = await supabase
      .from("corroborations")
      .select("*", { count: "exact", head: true })
      .eq("sighting_id", id);

    setCorroborationCount(count || 0);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("corroborations")
        .select("id")
        .eq("sighting_id", id)
        .eq("user_id", user.id)
        .single();
      setCorroborated(!!data);
    }
  }

  async function handleCorroborate() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    if (corroborated) {
      await supabase
        .from("corroborations")
        .delete()
        .eq("sighting_id", id)
        .eq("user_id", user.id);
      setCorroborated(false);
      setCorroborationCount((prev) => prev - 1);
    } else {
      await supabase
        .from("corroborations")
        .insert({ sighting_id: id, user_id: user.id });
      setCorroborated(true);
      setCorroborationCount((prev) => prev + 1);
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={Colors.green} size="large" />
      </View>
    );
  }

  if (!sighting) return null;

  const matchTitle = sighting.matched_flight
    ? sighting.matched_flight.toUpperCase()
    : sighting.matched_celestial
      ? sighting.matched_celestial.toUpperCase()
      : "NO FLIGHTS OR CELESTIAL BODIES";

  const statusColor = getStatusColor(sighting.status);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner}>
        {/* Back button */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        {/* Header */}
        <Text style={styles.title}>Sighting Report</Text>
        <Text style={styles.date}>{sighting.sighted_at}</Text>

        {/* Mini map */}
        {Platform.OS === "web" && (
          <View style={styles.miniMapContainer}>
            <MiniMap
              latitude={sighting.latitude}
              longitude={sighting.longitude}
              status={sighting.status}
            />
          </View>
        )}

        {/* Match title + status */}
        <Text style={[styles.matchTitle, { color: statusColor }]}>
          {matchTitle}
        </Text>
        <Text style={styles.statusLabel}>
          {getStatusLabel(sighting.status)}
        </Text>

        {/* Description */}
        {sighting.description ? (
          <Text style={styles.description}>"{sighting.description}"</Text>
        ) : null}

        {/* Details as plain text */}
        {sighting.direction || sighting.altitude ? (
          <Text style={styles.detailLine}>
            Traveling {sighting.direction?.toLowerCase()},{" "}
            {sighting.altitude?.toLowerCase()} altitude
          </Text>
        ) : null}

        {sighting.colors?.length > 0 || sighting.shape || sighting.sound ? (
          <Text style={styles.detailLine}>
            {[
              sighting.colors?.join(", "),
              sighting.shape,
              sighting.sound?.toLowerCase(),
            ]
              .filter(Boolean)
              .join(", ")}
          </Text>
        ) : null}

        {/* Coordinates */}
        <Text style={styles.coordText}>{sighting.latitude.toFixed(4)} • N</Text>
        <Text style={styles.coordText}>
          {Math.abs(sighting.longitude).toFixed(4)} • W
        </Text>

        {/* Photos */}
        {sighting.photo_urls?.length > 0 && (
          <View style={styles.photoGrid}>
            {sighting.photo_urls.map((url, index) => (
              <Image
                key={index}
                source={{ uri: url }}
                style={styles.photo}
                resizeMode="cover"
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Bottom buttons */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.corroborateBtn,
            corroborated && styles.corroborateBtnActive,
          ]}
          onPress={handleCorroborate}
        >
          <Text
            style={[
              styles.corroborateBtnText,
              corroborated && styles.corroborateBtnTextActive,
            ]}
          >
            {corroborated
              ? `✓ Corroborated · ${corroborationCount}`
              : `Corroborate Report${corroborationCount > 0 ? ` · ${corroborationCount}` : ""}`}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Text style={styles.closeBtnText}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Mini map component for web
function MiniMap({
  latitude,
  longitude,
  status,
}: {
  latitude: number;
  longitude: number;
  status: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef?.current || !mapboxgl) return;

    mapboxgl.accessToken = process.env.EXPO_PUBLIC_MAPBOX_TOKEN!;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [longitude, latitude],
      zoom: 11,
      interactive: false,
      attributionControl: false,
    });

    // Add pin
    const el = document.createElement("div");
    el.style.width = "14px";
    el.style.height = "14px";
    el.style.borderRadius = "50%";
    el.style.backgroundColor = getStatusColor(status);
    el.style.border = `2px solid ${Colors.black}`;
    el.style.boxShadow = `0 0 8px ${getStatusColor(status)}`;

    new mapboxgl.Marker({ element: el })
      .setLngLat([longitude, latitude])
      .addTo(map);

    // Hide controls
    map.on("load", () => {
      const ctrl = containerRef.current?.querySelectorAll(
        ".mapboxgl-ctrl-logo, .mapboxgl-ctrl-attrib, .mapboxgl-ctrl-bottom-right, .mapboxgl-ctrl-bottom-left",
      );
      ctrl?.forEach((el) => ((el as HTMLElement).style.display = "none"));
    });

    return () => map.remove();
  }, [latitude, longitude, status]);

  if (Platform.OS !== "web") return null;

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.black,
    alignItems: "center",
    justifyContent: "center",
  },
  inner: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
    gap: 12,
  },
  backBtn: {
    marginBottom: 4,
  },
  backText: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.muted,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: Colors.white,
    letterSpacing: 1,
  },
  date: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.muted,
    letterSpacing: 1,
  },
  miniMapContainer: {
    height: 200,
    borderWidth: 2,
    borderColor: Colors.white,
    overflow: "hidden",
  },
  matchTitle: {
    fontFamily: Fonts.display,
    fontSize: 13,
    letterSpacing: 1,
    marginTop: 4,
  },
  statusLabel: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.white,
    letterSpacing: 1,
  },
  description: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.white,
    lineHeight: 18,
  },
  detailLine: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.white,
    lineHeight: 18,
  },
  coordText: {
    fontFamily: Fonts.display,
    fontSize: 12,
    color: Colors.green,
    letterSpacing: 1,
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 4,
  },
  photo: {
    width: 160,
    height: 160,
  },
  bottomBar: {
    padding: 16,
    paddingBottom: 16,
    gap: 10,
  },
  corroborateBtn: {
    backgroundColor: Colors.green,
    borderWidth: 2,
    borderColor: Colors.green,
    padding: 16,
    alignItems: "center",
  },
  corroborateBtnActive: {
    backgroundColor: "rgba(57,255,20,0.1)",
    borderColor: Colors.green,
  },
  corroborateBtnText: {
    fontFamily: Fonts.display,
    fontSize: 12,
    color: Colors.black,
    letterSpacing: 1,
  },
  corroborateBtnTextActive: {
    color: Colors.green,
  },
  closeBtn: {
    borderWidth: 2,
    borderColor: Colors.white,
    padding: 16,
    alignItems: "center",
  },
  closeBtnText: {
    fontFamily: Fonts.display,
    fontSize: 12,
    color: Colors.white,
    letterSpacing: 1,
  },
});
