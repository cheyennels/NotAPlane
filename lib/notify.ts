import { Alert, Platform } from "react-native";

/**
 * Cross-platform alert. React Native's `Alert.alert` is a no-op on
 * react-native-web, so on web we fall back to `window.alert` — otherwise
 * confirmations and errors silently do nothing in the browser.
 */
export function notify(title: string, message?: string) {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      window.alert(message ? `${title}\n\n${message}` : title);
    }
    return;
  }
  Alert.alert(title, message);
}
