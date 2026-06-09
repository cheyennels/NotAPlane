import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import ScreenHeader from "@/components/ui/ScreenHeader";
import SectionLabel from "@/components/ui/SectionLabel";
import StatsRow from "@/components/ui/StatsRow";
import ToggleRow from "@/components/ui/ToggleRow";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../../lib/supabase";

function SettingToggle({
  title,
  subtitle,
  defaultValue,
}: {
  title: string;
  subtitle: string;
  defaultValue: boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  return (
    <ToggleRow
      label={title}
      sublabel={subtitle}
      value={value}
      onToggle={() => setValue(!value)}
    />
  );
}

export default function ProfileScreen() {
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [memberSince, setMemberSince] = useState("");
  const [totalReports, setTotalReports] = useState(0);
  const [unresolved, setUnresolved] = useState(0);
  const [corroborations, setCorroborations] = useState(0);
  const [userLocation, setUserLocation] = useState("");
  const [editingLocation, setEditingLocation] = useState(false);
  const [locationInput, setLocationInput] = useState("");
  useEffect(() => {
    fetchUserData();
  }, []);

  async function fetchUserData() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    setUserEmail(user.email || "");
    const date = new Date(user.created_at);
    setMemberSince(
      date.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      }),
    );

    // Get profile data including location
    const { data: profile } = await supabase
      .from("profiles")
      .select("name, location")
      .eq("id", user.id)
      .single();

    if (profile) {
      setUserName(profile.name || user.email?.split("@")[0] || "User");
      setUserLocation(profile.location || "");
    } else {
      setUserName(
        user.user_metadata?.name || user.email?.split("@")[0] || "User",
      );
    }

    // Get sightings stats
    const { data: sightings } = await supabase
      .from("sightings")
      .select("id, status")
      .eq("user_id", user.id);

    if (sightings) {
      setTotalReports(sightings.length);
      setUnresolved(
        sightings.filter(
          (s) => s.status === "unexplained" || s.status === "pending",
        ).length,
      );

      const { count } = await supabase
        .from("corroborations")
        .select("*", { count: "exact", head: true })
        .in(
          "sighting_id",
          sightings.map((s) => s.id),
        );

      setCorroborations(count || 0);
    }
  }
  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/(auth)" as any);
  }

  async function handleSaveLocation() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("profiles")
      .upsert({ id: user.id, location: locationInput });

    setUserLocation(locationInput);
    setEditingLocation(false);
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Profile" subtitle="Account and settings" />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.inner}>
        {/* Profile hero */}
        <View style={styles.profileHero}>
          <View style={styles.avatarWrap}>
            <Image
              source={require("../../../assets/images/alien.png")}
              style={styles.avatarImage}
              resizeMode="contain"
            />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{userName || "Loading..."}</Text>
            <Text style={styles.profileSince}>Member since {memberSince}</Text>
            <TouchableOpacity
              onPress={() => {
                setLocationInput(userLocation);
                setEditingLocation(true);
              }}
            >
              <Text style={styles.profileLocation}>
                {userLocation || "Tap to set location"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <StatsRow
          stats={[
            { label: "TOTAL REPORTS", value: totalReports },
            { label: "UNRESOLVED", value: unresolved },
            { label: "CORROBORATIONS", value: corroborations },
          ]}
        />

        <View style={styles.divider} />

        {/* Notifications */}
        <SectionLabel variant="section" style={styles.sectionLabel}>
          Notifications
        </SectionLabel>
        <SettingToggle
          title="Corroborations"
          subtitle="When someone confirms sightings"
          defaultValue={true}
        />
        <SettingToggle
          title="Nearby Sightings"
          subtitle="New reports within 10 miles"
          defaultValue={true}
        />
        <SettingToggle
          title="Analysis Updates"
          subtitle="When your sighting gets matched"
          defaultValue={false}
        />

        {/* Preferences */}
        <SectionLabel variant="section" style={styles.sectionLabel}>
          Preferences
        </SectionLabel>
        <SettingToggle
          title="Measurement for Distance"
          subtitle="miles"
          defaultValue={true}
        />
      </ScrollView>

      <View style={styles.btnGroup}>
        <Button label="Logout" variant="outline" onPress={handleLogout} />
        <Button
          label="Change Password"
          variant="accent"
          onPress={() => router.push("/(tabs)/profile/change-password" as any)}
        />
        <Button label="Delete Account" variant="danger" />
      </View>
      {editingLocation && (
        <View style={styles.editModal}>
          <Text style={styles.editModalTitle}>Edit Location</Text>
          <FormField
            placeholder="e.g. Minneapolis, MN"
            value={locationInput}
            onChangeText={setLocationInput}
            autoFocus
            containerStyle={styles.editModalInput}
          />
          <Button label="Save" onPress={handleSaveLocation} />
          <Button
            label="Cancel"
            variant="outline"
            onPress={() => setEditingLocation(false)}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  inner: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
    gap: 10,
  },
  scroll: {
    flex: 1,
  },
  profileHero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatarWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: Colors.green,
    backgroundColor: Colors.green,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: 60,
    height: 60,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontFamily: Fonts.display,
    fontSize: 18,
    color: Colors.white,
    letterSpacing: 1,
    marginBottom: 4,
  },
  profileSince: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.muted,
    letterSpacing: 1,
    marginBottom: 4,
  },
  profileLocation: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.green,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  divider: {
    height: 2,
    backgroundColor: Colors.white,
    marginVertical: 4,
  },
  sectionLabel: {
    marginTop: 12,
  },
  btnGroup: {
    gap: 10,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
    backgroundColor: Colors.black,
  },
  editModal: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.black,
    padding: 24,
    justifyContent: "center",
    gap: 12,
    zIndex: 100,
  },
  editModalTitle: {
    fontFamily: Fonts.display,
    fontSize: 18,
    color: Colors.white,
    letterSpacing: 1,
    marginBottom: 8,
  },
  editModalInput: {
    marginBottom: 0,
  },
});
