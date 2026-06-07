import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { router } from "expo-router";
import { useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../../lib/supabase";

function ToggleRow({
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
    <View style={styles.toggleRow}>
      <View style={styles.toggleInfo}>
        <Text style={styles.toggleTitle}>{title}</Text>
        <Text style={styles.toggleSubtitle}>{subtitle}</Text>
      </View>
      <TouchableOpacity
        style={[styles.toggle, value && styles.toggleActive]}
        onPress={() => setValue(!value)}
      >
        <View style={[styles.toggleKnob, value && styles.toggleKnobActive]} />
      </TouchableOpacity>
    </View>
  );
}

export default function ProfileScreen() {
  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/(auth)" as any);
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <Text style={styles.headerSub}>Account and settings</Text>
      </View>

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
            <Text style={styles.profileName}>Cheyenne S.</Text>
            <Text style={styles.profileSince}>Member since July 2026</Text>
            <Text style={styles.profileLocation}>Minneapolis, MN</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>TOTAL REPORTS</Text>
            <Text style={styles.statVal}>7</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>UNRESOLVED</Text>
            <Text style={styles.statVal}>3</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>CORROBORATIONS</Text>
            <Text style={styles.statVal}>12</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Notifications */}
        <Text style={styles.sectionLabel}>Notifications</Text>
        <ToggleRow
          title="Corroborations"
          subtitle="When someone confirms sightings"
          defaultValue={true}
        />
        <ToggleRow
          title="Nearby Sightings"
          subtitle="New reports within 10 miles"
          defaultValue={true}
        />
        <ToggleRow
          title="Analysis Updates"
          subtitle="When your sighting gets matched"
          defaultValue={false}
        />

        {/* Preferences */}
        <Text style={styles.sectionLabel}>Preferences</Text>
        <ToggleRow
          title="Measurement for Distance"
          subtitle="miles"
          defaultValue={true}
        />
      </ScrollView>

      <View style={styles.btnGroup}>
        <TouchableOpacity style={styles.btnOutline} onPress={handleLogout}>
          <Text style={styles.btnOutlineText}>Logout</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btnGreen}
          onPress={() => router.push("/(tabs)/profile/change-password" as any)}
        >
          <Text style={styles.btnGreenText}>Change Password</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnDanger}>
          <Text style={styles.btnDangerText}>Delete Account</Text>
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
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerTitle: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: Colors.white,
    letterSpacing: 1,
    marginBottom: 4,
  },
  headerSub: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.muted,
    letterSpacing: 1,
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
  statsRow: {
    flexDirection: "row",
    gap: 0,
  },
  statCard: {
    flex: 1,
    padding: 12,
  },
  statLabel: {
    fontFamily: Fonts.mono,
    fontSize: 8,
    color: Colors.green,
    letterSpacing: 1,
    marginBottom: 6,
    lineHeight: 13,
    textTransform: "uppercase",
  },
  statVal: {
    fontFamily: Fonts.display,
    fontSize: 24,
    color: Colors.white,
    letterSpacing: 1,
  },
  divider: {
    height: 2,
    backgroundColor: Colors.white,
    marginVertical: 4,
  },
  sectionLabel: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.green,
    textTransform: "uppercase",
    marginTop: 12,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    gap: 12,
  },
  toggleInfo: {
    flex: 1,
  },
  toggleTitle: {
    fontFamily: Fonts.display,
    fontSize: 10,
    color: Colors.white,
    letterSpacing: 0.5,
    marginBottom: 3,
    textTransform: "uppercase",
  },
  toggleSubtitle: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: Colors.muted,
    letterSpacing: 0.5,
  },
  toggle: {
    width: 44,
    height: 24,
    backgroundColor: Colors.surface2,
    borderWidth: 2,
    borderColor: Colors.white,
    justifyContent: "center",
    padding: 2,
    flexShrink: 0,
  },
  toggleActive: {
    backgroundColor: Colors.green,
    borderColor: Colors.green,
  },
  toggleKnob: {
    width: 16,
    height: 16,
    backgroundColor: Colors.white,
    alignSelf: "flex-start",
  },
  toggleKnobActive: {
    backgroundColor: Colors.black,
    alignSelf: "flex-end",
  },
  btnGroup: {
    gap: 10,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
    backgroundColor: Colors.black,
  },
  btnOutline: {
    borderWidth: 2,
    borderColor: Colors.white,
    padding: 16,
    alignItems: "center",
  },
  btnOutlineText: {
    fontFamily: Fonts.display,
    fontSize: 12,
    color: Colors.white,
    letterSpacing: 1,
  },
  btnGreen: {
    backgroundColor: Colors.darkGreen,
    borderWidth: 2,
    borderColor: Colors.green,
    padding: 16,
    alignItems: "center",
  },
  btnGreenText: {
    fontFamily: Fonts.display,
    fontSize: 12,
    color: Colors.green,
    letterSpacing: 1,
  },
  btnDanger: {
    borderWidth: 2,
    borderColor: Colors.red,
    padding: 16,
    alignItems: "center",
  },
  btnDangerText: {
    fontFamily: Fonts.display,
    fontSize: 12,
    color: Colors.red,
    letterSpacing: 1,
  },
});
