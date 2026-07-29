import Button from "@/components/ui/Button";
import SectionLabel from "@/components/ui/SectionLabel";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { router } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

const FEATURES = [
  {
    title: "Report wizard",
    body: "A 5-step flow — when, where, what, details, review — ends with the app running its own analysis before the report saves.",
  },
  {
    title: "Community map",
    body: "Every sighting appears as a color-coded pin. Optional overlays show live aircraft, planets/stars, and satellites so you can compare a report against what was actually overhead.",
  },
  {
    title: "Automatic analysis",
    body: "On submit, the app checks nearby flights (OpenSky), planets and stars, and satellite positions (CelesTrak + SGP4) to classify a sighting as explained, a partial match, or genuinely unexplained.",
  },
  {
    title: "Sightings & activity",
    body: "A personal log of submitted reports with stats, plus a feed of notifications when other users corroborate something you saw.",
  },
];

const STATUS_COLORS: { label: string; color: string; meaning: string }[] = [
  { label: "Explained", color: Colors.blue, meaning: "Matched to a nearby aircraft, planet, star, or satellite" },
  { label: "Partial match", color: Colors.yellow, meaning: "An aircraft was nearby, just outside the tight-match radius" },
  { label: "Unexplained", color: Colors.red, meaning: "No match found against any data source" },
  { label: "Pending", color: Colors.green, meaning: "Analysis hasn't run yet, or was inconclusive" },
];

const STACK: { label: string; value: string }[] = [
  { label: "Framework", value: "Expo 54, React Native, React 19" },
  { label: "Routing", value: "Expo Router (file-based)" },
  { label: "Backend", value: "Supabase — Auth, Postgres, Storage, Edge Functions" },
  { label: "Maps", value: "Mapbox GL" },
  { label: "Data sources", value: "OpenSky Network, Astronomy API, CelesTrak, Open-Meteo" },
  { label: "Web hosting", value: "Vercel (Expo server output)" },
];

const DESKTOP_MIN_WIDTH = 768;

export default function AboutScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_MIN_WIDTH;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={[styles.column, isDesktop && styles.columnDesktop]}>
        <SectionLabel variant="section" style={styles.eyebrow}>
          Case Study
        </SectionLabel>
        <Text style={styles.title}>Not A Plane</Text>
        <Text style={styles.subtitle}>
          A cross-platform app for reporting and exploring unidentified
          aerial sightings — designed in Figma and built end-to-end in code.
        </Text>

        <Button
          label="View Live Demo"
          onPress={() => router.push("/(auth)" as any)}
          style={styles.ctaButton}
        />

        <Section title="The problem">
          <Body>
            People see things in the sky they can&apos;t explain, but have no
            easy way to check whether it was actually a plane, a planet, or a
            satellite — or to see whether anyone nearby saw the same thing.
            Most reporting is either an unstructured forum post or nothing at
            all.
          </Body>
        </Section>

        <Section title="My role">
          <Body>
            Solo designer and developer. I designed the full experience in
            Figma — the report flow, the map, the retro-terminal visual
            language — then built it myself: Expo Router, a Supabase backend,
            and live integrations with flight, planetary, and satellite data
            to automatically classify each report.
          </Body>
        </Section>

        <Section title="How it works">
          {FEATURES.map((feature) => (
            <View key={feature.title} style={styles.featureRow}>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Body>{feature.body}</Body>
            </View>
          ))}
        </Section>

        <Section title="A design decision worth calling out">
          <Body>
            Every sighting gets a status color the moment it&apos;s analyzed,
            so the map reads at a glance without opening a single report.
          </Body>
          <View style={styles.statusList}>
            {STATUS_COLORS.map((s) => (
              <View key={s.label} style={styles.statusRow}>
                <View
                  style={[styles.statusDot, { backgroundColor: s.color }]}
                />
                <View style={styles.statusTextWrap}>
                  <Text style={styles.statusLabel}>{s.label}</Text>
                  <Text style={styles.statusMeaning}>{s.meaning}</Text>
                </View>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Tech stack">
          <View style={styles.stackList}>
            {STACK.map((row) => (
              <View key={row.label} style={styles.stackRow}>
                <Text style={styles.stackLabel}>{row.label}</Text>
                <Text style={styles.stackValue}>{row.value}</Text>
              </View>
            ))}
          </View>
        </Section>

        <View style={styles.footer}>
          <Button
            label="View Live Demo"
            onPress={() => router.push("/(auth)" as any)}
          />
        </View>
      </View>
    </ScrollView>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <SectionLabel variant="section" style={styles.sectionLabel}>
        {title}
      </SectionLabel>
      {children}
    </View>
  );
}

function Body({ children }: { children: React.ReactNode }) {
  return <Text style={styles.body}>{children}</Text>;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 80,
  },
  column: {
    width: "100%",
    maxWidth: 640,
  },
  columnDesktop: {
    maxWidth: 720,
  },
  eyebrow: {
    marginTop: 0,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 36,
    color: Colors.white,
    letterSpacing: 1,
    marginTop: 4,
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: Fonts.mono,
    fontSize: 13,
    color: Colors.dim,
    lineHeight: 20,
    marginBottom: 28,
  },
  ctaButton: {
    marginBottom: 8,
  },
  section: {
    marginTop: 40,
  },
  sectionLabel: {
    marginTop: 0,
    marginBottom: 10,
  },
  body: {
    fontFamily: Fonts.mono,
    fontSize: 13,
    color: Colors.white,
    lineHeight: 21,
  },
  featureRow: {
    marginBottom: 18,
  },
  featureTitle: {
    fontFamily: Fonts.display,
    fontSize: 14,
    color: Colors.green,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  statusList: {
    marginTop: 16,
    gap: 12,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 5,
  },
  statusTextWrap: {
    flex: 1,
  },
  statusLabel: {
    fontFamily: Fonts.display,
    fontSize: 12,
    color: Colors.white,
    marginBottom: 2,
  },
  statusMeaning: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.dim,
    lineHeight: 17,
  },
  stackList: {
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.surface2,
  },
  stackRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surface2,
    gap: 16,
  },
  stackLabel: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
    width: 110,
  },
  stackValue: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.white,
    flex: 1,
    textAlign: "right",
    lineHeight: 17,
  },
  footer: {
    marginTop: 48,
    alignItems: "center",
  },
});
