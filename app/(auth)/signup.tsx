import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";
import { getAuthRedirectUrl } from "@/lib/auth-redirect";
import { notify } from "@/lib/notify";
import { validatePassword } from "@/lib/password";
import { supabase } from "../../lib/supabase";

export default function SignUpScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
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

  function checkPassword() {
    const passwordError = validatePassword(password);
    if (passwordError) {
      notify("Invalid Password", passwordError);
      return false;
    }
    if (password !== confirmPassword) {
      notify("Password Mismatch", "Passwords do not match.");
      return false;
    }
    return true;
  }

  async function handleSignUp() {
    if (!checkPassword()) return;

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { name },
        emailRedirectTo: getAuthRedirectUrl(),
      },
    });

    if (error) {
      notify("Sign Up Failed", error.message);
      setLoading(false);
      return;
    }

    // Create profile row
    if (data.user) {
      await supabase.from("profiles").insert({
        id: data.user.id,
        name,
        location: "",
      });
    }

    if (data.session) {
      router.replace("/(tabs)/map" as any);
    } else {
      router.replace({
        pathname: "/(auth)/verify-email",
        params: { email: email.trim() },
      } as any);
    }
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.inner}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <Text style={styles.title}>User Info</Text>
        <Text style={styles.subtitle}>
          Please fill out fields to create an account
        </Text>

        <FormField
          label="Name"
          background="dark"
          placeholder="Enter full name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />

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
          status={passwordStatus}
          statusIcon
          errorText={password.length > 0 && passwordError ? passwordError : undefined}
          hint="*min 8 chars with an uppercase letter, number, and special character"
        />

        <FormField
          label="Confirm Password"
          background="dark"
          placeholder="Confirm password"
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
          label={loading ? "Creating account..." : "Continue"}
          onPress={handleSignUp}
          disabled={loading}
          style={styles.continueBtn}
        />
        <Button
          label="Back to Login"
          variant="outline"
          onPress={() => router.back()}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  inner: {
    paddingHorizontal: 24,
    paddingTop: 100,
    paddingBottom: 48,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 28,
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
  continueBtn: {
    marginTop: 8,
    marginBottom: 12,
  },
});
