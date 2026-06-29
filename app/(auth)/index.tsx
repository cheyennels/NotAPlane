import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { getAuthRedirectUrl } from "@/lib/auth-redirect";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleLogin() {
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      setErrorMessage("Email and password are required.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    if (error) {
      setErrorMessage(getAuthErrorMessage(error.message));
      Alert.alert("Login Failed", getAuthErrorMessage(error.message));
    } else {
      router.replace("/(tabs)/map");
    }
    setLoading(false);
  }

  async function handleForgotPassword() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage('Enter your email above, then tap "Forgot your password?"');
      return;
    }

    setErrorMessage(null);
    const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo: getAuthRedirectUrl("auth/reset"),
    });

    if (error) {
      Alert.alert("Error", getAuthErrorMessage(error.message));
    } else {
      Alert.alert(
        "Check your email",
        "If an account exists for that address, we sent a password reset link.",
      );
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.inner}>
        {/* Title */}
        <Text style={styles.title}>Welcome</Text>
        <Text style={styles.subtitle}>
          Login or sign up to start your journey!
        </Text>

        <FormField
          label="Email"
          background="dark"
          placeholder="Enter email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <FormField
          label="Password"
          background="dark"
          placeholder="Enter password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {/* Forgot password */}
        <TouchableOpacity onPress={handleForgotPassword}>
          <Text style={styles.forgotPassword}>Forgot your password?</Text>
        </TouchableOpacity>

        {/* Login button */}
        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}
        <Button
          label={loading ? "Logging in..." : "Login"}
          onPress={handleLogin}
          disabled={loading}
        />

        <Pressable
          style={styles.signupFooter}
          onPress={() => router.push("/(auth)/signup" as any)}
        >
          {({ hovered, pressed }) => (
            <>
              <Text style={styles.signupLabel}>New here?</Text>
              <Text
                style={[
                  styles.signupLink,
                  (hovered || pressed) && styles.signupLinkHover,
                ]}
              >
                Create an account!
              </Text>
            </>
          )}
        </Pressable>
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
  forgotPassword: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.muted,
    marginBottom: 24,
  },
  errorText: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.red,
    marginBottom: 12,
    lineHeight: 16,
  },
  signupFooter: {
    flexDirection: "row",
    marginTop: "auto",
    paddingBottom: 40,
    alignItems: "center",
  },
  signupLabel: {
    fontFamily: Fonts.display,
    fontSize: 14,
    color: Colors.white,
    marginRight: 4,
  },
  signupLink: {
    fontFamily: Fonts.display,
    fontSize: 14,
    color: Colors.green,
    textAlign: "center",
  },
  signupLinkHover: {
    textDecorationLine: "underline",
  },
});
