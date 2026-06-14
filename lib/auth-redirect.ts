import * as Linking from "expo-linking";
import { Platform } from "react-native";

/** URL Supabase should redirect to after email confirmation. */
export function getAuthRedirectUrl(path = "auth/callback"): string {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return `${window.location.origin}/${path}`;
  }

  return Linking.createURL(path);
}
