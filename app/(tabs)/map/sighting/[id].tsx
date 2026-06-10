import BackButton from "@/components/ui/BackButton";
import BottomActionBar from "@/components/ui/BottomActionBar";
import Button from "@/components/ui/Button";
import { LoadingView } from "@/components/ui/StateViews";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { getStatusColor, getStatusLabel } from "@/lib/status";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../../../lib/supabase";

type Sighting = {
  id: string;
  user_id: string;
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
  matched_satellite: string | null;
  photo_urls: string[];
  created_at: string;
};

export default function SightingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [sighting, setSighting] = useState<Sighting | null>(null);
  const [loading, setLoading] = useState(true);
  const [corroborated, setCorroborated] = useState(false);
  const [corroborationCount, setCorroborationCount] = useState(0);
  const [isOwnReport, setIsOwnReport] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSighting() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

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
        setIsOwnReport(Boolean(user && data.user_id === user.id));
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
      if (!user) return;

      const { data } = await supabase
        .from("corroborations")
        .select("id")
        .eq("sighting_id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      setCorroborated(!!data);
    }

    fetchSighting();
    fetchCorroborations();
  }, [id]);

  async function handleCorroborate() {
    if (isOwnReport) return;

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
    return <LoadingView />;
  }

  if (!sighting) return null;

  const matchTitle = sighting.matched_flight
    ? sighting.matched_flight.toUpperCase()
    : sighting.matched_satellite
      ? sighting.matched_satellite.toUpperCase()
      : sighting.matched_celestial
        ? sighting.matched_celestial.toUpperCase()
        : "NO FLIGHTS OR CELESTIAL BODIES";

  const statusColor = getStatusColor(sighting.status);

  const corroborateLabel = isOwnReport
    ? `Your Report${corroborationCount > 0 ? ` · ${corroborationCount} corroborations` : ""}`
    : corroborated
      ? `✓ Corroborated · ${corroborationCount}`
      : `Corroborate Report${corroborationCount > 0 ? ` · ${corroborationCount}` : ""}`;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner}>
        <BackButton style={styles.backBtn} />

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
          {getStatusLabel(sighting.status).toUpperCase()}
        </Text>

        {/* Description */}
        {sighting.description ? (
          <Text style={styles.description}>{`"${sighting.description}"`}</Text>
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
              <TouchableOpacity key={index} onPress={() => setLightboxUrl(url)} activeOpacity={0.8}>
                <Image source={{ uri: url }} style={styles.photo} resizeMode="cover" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Lightbox */}
        <Modal
          visible={lightboxUrl !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setLightboxUrl(null)}
          statusBarTranslucent
        >
          <Pressable style={styles.lightboxBackdrop} onPress={() => setLightboxUrl(null)}>
            <Pressable onPress={() => {}} style={styles.lightboxContent}>
              {lightboxUrl && (
                <Image
                  source={{ uri: lightboxUrl }}
                  style={styles.lightboxImage}
                  resizeMode="contain"
                />
              )}
            </Pressable>
            <TouchableOpacity style={styles.lightboxClose} onPress={() => setLightboxUrl(null)}>
              <Text style={styles.lightboxCloseText}>✕</Text>
            </TouchableOpacity>
          </Pressable>
        </Modal>
      </ScrollView>

      <BottomActionBar style={styles.bottomBar}>
        <Button
          label={corroborateLabel}
          variant={corroborated ? "tint" : "primary"}
          disabled={isOwnReport}
          onPress={handleCorroborate}
        />
        <Button label="Close" variant="outline" onPress={() => router.back()} />
      </BottomActionBar>
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
    if (Platform.OS !== "web" || !containerRef?.current) return;

    let map: any = null;
    let cancelled = false;

    // Dynamically import mapbox-gl so it's never bundled on native
    import("mapbox-gl").then((mod) => {
      const mapboxgl = mod.default ?? mod;
      if (cancelled || !containerRef.current) return;

      mapboxgl.accessToken = process.env.EXPO_PUBLIC_MAPBOX_TOKEN!;

      map = new mapboxgl.Map({
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
    });

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [latitude, longitude, status]);

  if (Platform.OS !== "web") return null;

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
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
    paddingBottom: 16,
  },
  lightboxBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  lightboxContent: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  lightboxImage: {
    width: "100%",
    height: "100%",
  },
  lightboxClose: {
    position: "absolute",
    top: 52,
    right: 20,
    width: 36,
    height: 36,
    backgroundColor: "rgba(30,30,30,0.9)",
    borderWidth: 1,
    borderColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  lightboxCloseText: {
    fontFamily: Fonts.mono,
    fontSize: 14,
    color: Colors.white,
  },
});
