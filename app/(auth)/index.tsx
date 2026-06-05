import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      Alert.alert("Login Failed", error.message);
    } else {
      router.replace("/(tabs)/map");
    }
    setLoading(false);
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

        {/* Forgot password */}
        <TouchableOpacity>
          <Text style={styles.forgotPassword}>Forgot your password?</Text>
        </TouchableOpacity>

        {/* Login button */}
        <TouchableOpacity
          style={[styles.btnPrimary, loading && styles.btnDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.btnPrimaryText}>
            {loading ? "Logging in..." : "Login"}
          </Text>
        </TouchableOpacity>

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
  label: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: Colors.green,
    letterSpacing: 2,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.black,
    borderWidth: 1,
    borderColor: Colors.white,
    padding: 14,
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.white,
    marginBottom: 16,
  },
  forgotPassword: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.muted,
    marginBottom: 24,
  },
  btnPrimary: {
    backgroundColor: Colors.green,
    padding: 16,
    alignItems: "center",
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
