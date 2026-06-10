import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { ReactNode, useEffect, useState } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";

const PHONE_WIDTH = 390;
const PHONE_HEIGHT = 844;
const PHONE_BEZEL_HEIGHT = PHONE_HEIGHT + 74;
const DESKTOP_MIN_WIDTH = 768;

type WebPhoneFrameProps = {
  children: ReactNode;
};

export default function WebPhoneFrame({ children }: WebPhoneFrameProps) {
  const { width, height } = useWindowDimensions();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || width < DESKTOP_MIN_WIDTH) {
    return <View style={styles.mobile}>{children}</View>;
  }

  const scale = Math.min(
    1,
    (height - 220) / PHONE_BEZEL_HEIGHT,
    (width - 96) / (PHONE_WIDTH + 24),
  );

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>NOT A PLANE</Text>
        <Text style={styles.subtitle}>
          Report and explore unidentified aerial sightings
        </Text>
      </View>

      <View style={[styles.phoneWrap, { transform: [{ scale }] }]}>
        <View style={styles.bezel}>
          <View style={styles.notch} />
          <View style={styles.screen}>
            <View style={styles.screenInner}>{children}</View>
          </View>
          <View style={styles.homeIndicator} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mobile: {
    flex: 1,
    minHeight: "100vh" as unknown as number,
  },
  page: {
    flex: 1,
    minHeight: "100vh" as unknown as number,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.black,
    paddingVertical: 32,
    paddingHorizontal: 24,
    gap: 28,
    overflow: "auto" as "visible",
  },
  header: {
    alignItems: "center",
    gap: 8,
    maxWidth: 520,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 28,
    color: Colors.green,
    letterSpacing: 2,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.dim,
    textAlign: "center",
    lineHeight: 18,
  },
  phoneWrap: {
    width: PHONE_WIDTH + 24,
  },
  bezel: {
    borderRadius: 44,
    padding: 12,
    backgroundColor: "#2A2A2A",
    borderWidth: 2,
    borderColor: "#444444",
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.45,
    shadowRadius: 48,
    alignItems: "center",
  },
  notch: {
    width: 120,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.black,
    marginBottom: 8,
  },
  screen: {
    width: PHONE_WIDTH,
    height: PHONE_HEIGHT,
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: Colors.surface,
  },
  screenInner: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  homeIndicator: {
    width: 120,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#555555",
    marginTop: 10,
  },
});
