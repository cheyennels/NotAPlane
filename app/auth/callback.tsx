import { LoadingView } from "@/components/ui/StateViews";
import { supabase } from "@/lib/supabase";
import { router } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";

export default function AuthCallbackScreen() {
  useEffect(() => {
    let cancelled = false;

    async function finishAuth() {
      if (Platform.OS === "web" && typeof window !== "undefined") {
        const code = new URLSearchParams(window.location.search).get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.warn("Auth callback exchange failed:", error.message);
          }
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (cancelled) return;

      if (session) {
        router.replace("/(tabs)/map");
        return;
      }

      router.replace("/(auth)/verify-email");
    }

    void finishAuth();

    return () => {
      cancelled = true;
    };
  }, []);

  return <LoadingView />;
}
