import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function SignUpScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  function validatePassword() {
    if (password.length < 7) {
      Alert.alert(
        "Invalid Password",
        "Password must be at least 7 characters.",
      );
      return false;
    }
    if (!/[^a-zA-Z0-9]/.test(password)) {
      Alert.alert(
        "Invalid Password",
        "Password must contain at least one special character.",
      );
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert("Password Mismatch", "Passwords do not match.");
      return false;
    }
    return true;
  }

  async function handleSignUp() {
    if (!validatePassword()) return;

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });

    if (error) {
      Alert.alert("Sign Up Failed", error.message);
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

    Alert.alert(
      "Account Created!",
      "Welcome to NotAPlane. You can now log in.",
      [{ text: "OK", onPress: () => router.replace("/(auth)") }],
    );
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
          hint="*password must be 7 characters with a special character"
        />

        <FormField
          label="Confirm Password"
          background="dark"
          placeholder="Confirm password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
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
