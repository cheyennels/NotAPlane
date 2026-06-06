import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { router } from "expo-router";
import { useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
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
      email: email.trim(),
      password,
      options: {
        data: { name },
      },
    });

    if (error) {
      Alert.alert("Sign Up Failed", getAuthErrorMessage(error.message));
    } else if (data.session) {
      router.replace("/(tabs)/map");
    } else {
      Alert.alert(
        "Check your email",
        "We sent a confirmation link to your inbox. Confirm your email, then log in.",
        [{ text: "OK", onPress: () => router.replace("/(auth)") }],
      );
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

        {/* Name */}
        <Text style={styles.label}>NAME</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter full name"
          placeholderTextColor={Colors.muted}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />

        {/* Email */}
        <Text style={styles.label}>EMAIL</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter email"
          placeholderTextColor={Colors.muted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        {/* Password */}
        <Text style={styles.label}>PASSWORD</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter password"
          placeholderTextColor={Colors.muted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <Text style={styles.hint}>
          *password must be 7 characters with a special character
        </Text>

        {/* Confirm Password */}
        <Text style={styles.label}>CONFIRM PASSWORD</Text>
        <TextInput
          style={styles.input}
          placeholder="Confirm password"
          placeholderTextColor={Colors.muted}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />

        {/* Continue button */}
        <TouchableOpacity
          style={[styles.btnPrimary, loading && styles.btnDisabled]}
          onPress={handleSignUp}
          disabled={loading}
        >
          <Text style={styles.btnPrimaryText}>
            {loading ? "Creating account..." : "Continue"}
          </Text>
        </TouchableOpacity>

        {/* Back to login */}
        <TouchableOpacity
          style={styles.btnOutline}
          onPress={() => router.back()}
        >
          <Text style={styles.btnOutlineText}>Back to Login</Text>
        </TouchableOpacity>
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
  label: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: Colors.green,
    letterSpacing: 2,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.black,
    borderWidth: 2,
    borderColor: Colors.white,
    padding: 14,
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.white,
    marginBottom: 16,
  },
  hint: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: Colors.muted,
    marginTop: -10,
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  btnPrimary: {
    backgroundColor: Colors.green,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 12,
  },
  btnPrimaryText: {
    fontFamily: Fonts.display,
    fontSize: 12,
    color: Colors.black,
    letterSpacing: 1,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnOutline: {
    borderWidth: 2,
    borderColor: Colors.white,
    padding: 16,
    alignItems: "center",
  },
  btnOutlineText: {
    fontFamily: Fonts.display,
    fontSize: 12,
    color: Colors.white,
    letterSpacing: 1,
  },
});
