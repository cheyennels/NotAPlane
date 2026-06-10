import { Fonts } from "@/constants/fonts";
import WebPhoneFrame from "@/components/ui/WebPhoneFrame";
import { Colors } from "@/constants/colors";
import { SpaceMono_400Regular } from "@expo-google-fonts/space-mono";
import { Session } from "@supabase/supabase-js";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { Platform } from "react-native";
import "react-native-reanimated";
import "react-native-url-polyfill/auto";
import { supabase } from "../lib/supabase";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);

  const [loaded, error] = useFonts({
    [Fonts.mono]: SpaceMono_400Regular,
    [Fonts.display]: require("../assets/fonts/Silkscreen/Silkscreen-Regular.ttf"),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setInitialized(true);
    });

    // Listen for auth changes (login, logout)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Auth gate — runs whenever session or route changes
  useEffect(() => {
    if (!initialized) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!session && !inAuthGroup) {
      // Not logged in and not on auth screen → send to login
      router.replace("/(auth)");
    } else if (session && inAuthGroup) {
      // Logged in but on auth screen → send to map
      router.replace("/(tabs)/map" as any);
    }
  }, [session, initialized, segments]);

  if (!loaded || !initialized) {
    return null;
  }

  const stack = (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { flex: 1, backgroundColor: Colors.black },
      }}
    >
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="report" />
    </Stack>
  );

  if (Platform.OS === "web") {
    return <WebPhoneFrame>{stack}</WebPhoneFrame>;
  }

  return stack;
}
