import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { notify } from "@/lib/notify";
import { validatePassword } from "@/lib/password";
import { supabase } from "@/lib/supabase";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function ResetPasswordScreen() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Live validation feedback (✓/✗) as the user types.
  const passwordError = validatePassword(password);
  const passwordStatus: "default" | "error" | "success" =
    password.length === 0 ? "default" : passwordError ? "error" : "success";
  const confirmStatus: "default" | "error" | "success" =
    confirmPassword.length === 0
      ? "default"
      : confirmPassword === password
        ? "success"
        : "error";

  useEffect(() => {
    let cancelled = false;

    async function prepare() {
      // The PKCE recovery link carries a `code` on web; exchange it for the
      // short-lived recovery session that authorizes the password update.
      if (Platform.OS === "web" && typeof window !== "undefined") {
        const code = new URLSearchParams(window.location.search).get("code");
        if (code) {
          await supabase.auth.exchangeCodeForSession(code).catch(() => {});
        }
      }
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!cancelled) setReady(Boolean(session));
    }

    void prepare();

    // Native recovery deep links surface as a PASSWORD_RECOVERY event.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  async function handleReset() {
    const passwordError = validatePassword(password);
    if (passwordError) {
      notify("Invalid Password", passwordError);
      return;
    }
    if (password !== confirmPassword) {
      notify("Password Mismatch", "Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      notify("Error", error.message);
      return;
    }

    // Force a fresh login with the new password everywhere.
    await supabase.auth.signOut();
    notify("Password updated", "Please log in with your new password.");
    router.replace("/(auth)");
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>
          {ready
            ? "Choose a new password for your account."
            : "Open this screen from the password reset link in your email."}
        </Text>

        <FormField
          label="New Password"
          background="dark"
          placeholder="Enter new password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          status={passwordStatus}
          statusIcon
          errorText={password.length > 0 && passwordError ? passwordError : undefined}
          hint="*min 8 chars with an uppercase letter, number, and special character"
        />

        <FormField
          label="Confirm Password"
          background="dark"
          placeholder="Re-enter new password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          status={confirmStatus}
          statusIcon
          errorText={
            confirmStatus === "error" ? "Passwords do not match" : undefined
          }
        />

        <Button
          label={loading ? "Updating..." : "Update Password"}
          onPress={handleReset}
          disabled={!ready || loading}
          style={styles.submit}
        />
        <Button
          label="Back to Login"
          variant="outline"
          onPress={() => router.replace("/(auth)")}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 100,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 36,
    color: Colors.white,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.muted,
    marginBottom: 40,
    lineHeight: 20,
  },
  submit: {
    marginTop: 8,
    marginBottom: 12,
  },
});
