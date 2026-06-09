import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

/** Full-screen centered loading spinner. */
export function LoadingView() {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={Colors.green} size="large" />
    </View>
  );
}

/** Full-screen centered error message with optional retry. */
export function ErrorView({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.errorText}>{message}</Text>
      {onRetry ? (
        <TouchableOpacity onPress={onRetry}>
          <Text style={styles.retryText}>Tap to retry</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  errorText: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.red,
    textAlign: "center",
  },
  retryText: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.green,
    textAlign: "center",
    textDecorationLine: "underline",
  },
});
