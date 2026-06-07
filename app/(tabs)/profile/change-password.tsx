import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { router } from "expo-router";
import { useState } from "react";
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../../../lib/supabase";

export default function ChangePasswordScreen() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const requirements = [
    { label: "At least 8 characters", met: newPassword.length >= 8 },
    { label: "One uppercase letter", met: /[A-Z]/.test(newPassword) },
    { label: "One number", met: /[0-9]/.test(newPassword) },
    { label: "One special character", met: /[^a-zA-Z0-9]/.test(newPassword) },
  ];

  const allMet = requirements.every((r) => r.met);
  const passwordsMatch =
    newPassword === confirmPassword && confirmPassword.length > 0;
  const canSubmit = allMet && passwordsMatch && currentPassword.length > 0;

  async function handleChangePassword() {
    if (!canSubmit) return;
    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      setSuccess(true);
    }
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner}>
        {/* Back button */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Change Password</Text>
        </TouchableOpacity>

        {/* Success banner */}
        {success && (
          <View style={styles.successBanner}>
            <Text style={styles.successTitle}>Password Updated!</Text>
            <Text style={styles.successBody}>
              Your password has been changed successfully. You'll need to log in
              again on other devices.
            </Text>
          </View>
        )}

        {/* Current password */}
        <Text style={styles.label}>Current Password</Text>
        <TextInput
          style={styles.input}
          placeholder="enter current password"
          placeholderTextColor={Colors.muted}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
        />

        {/* New password */}
        <Text style={styles.label}>New Password</Text>
        <TextInput
          style={[
            styles.input,
            newPassword.length > 0 && allMet && styles.inputSuccess,
          ]}
          placeholder="enter new password"
          placeholderTextColor={Colors.muted}
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
        />
        <Text style={styles.hint}>
          *password must be 7 characters with a special character
        </Text>

        {/* Confirm new password */}
        <Text style={styles.label}>Confirm New Password</Text>
        <TextInput
          style={[
            styles.input,
            confirmPassword.length > 0 && !passwordsMatch && styles.inputError,
            confirmPassword.length > 0 && passwordsMatch && styles.inputSuccess,
          ]}
          placeholder="re-enter new password"
          placeholderTextColor={Colors.muted}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />
        {confirmPassword.length > 0 && !passwordsMatch && (
          <Text style={styles.errorHint}>*passwords do not match</Text>
        )}

        {/* Password requirements */}
        <Text style={styles.requirementsTitle}>Password Requirements</Text>
        {requirements.map((req) => (
          <Text
            key={req.label}
            style={[styles.requirement, req.met && styles.requirementMet]}
          >
            · {req.label}
          </Text>
        ))}
      </ScrollView>

      {/* Bottom buttons */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.continueBtn, !canSubmit && styles.btnDisabled]}
          onPress={handleChangePassword}
          disabled={!canSubmit || loading}
        >
          <Text style={styles.continueBtnText}>
            {loading ? "Updating..." : success ? "Done" : "Continue"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.forgotBtn} onPress={() => {}}>
          <Text style={styles.forgotBtnText}>Forgot your password?</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  inner: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
    gap: 8,
  },
  backBtn: {
    marginBottom: 16,
  },
  backText: {
    fontFamily: Fonts.display,
    fontSize: 14,
    color: Colors.white,
    letterSpacing: 1,
  },
  successBanner: {
    backgroundColor: "rgba(57,255,20,0.07)",
    borderWidth: 2,
    borderColor: Colors.green,
    padding: 14,
    marginBottom: 8,
  },
  successTitle: {
    fontFamily: Fonts.display,
    fontSize: 12,
    color: Colors.green,
    letterSpacing: 1,
    marginBottom: 6,
  },
  successBody: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.muted,
    lineHeight: 16,
  },
  label: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: Colors.green,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    backgroundColor: Colors.surface2,
    borderWidth: 2,
    borderColor: Colors.white,
    padding: 14,
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.white,
  },
  inputError: {
    borderColor: Colors.red,
  },
  inputSuccess: {
    borderColor: Colors.green,
  },
  hint: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: Colors.muted,
    letterSpacing: 0.5,
    marginTop: 4,
  },
  errorHint: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: Colors.red,
    letterSpacing: 0.5,
    marginTop: 4,
  },
  requirementsTitle: {
    fontFamily: Fonts.display,
    fontSize: 11,
    color: Colors.white,
    letterSpacing: 1,
    marginTop: 12,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  requirement: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.muted,
    letterSpacing: 0.5,
    lineHeight: 18,
  },
  requirementMet: {
    color: Colors.green,
  },
  bottomBar: {
    padding: 16,
    paddingBottom: 32,
    gap: 10,
    backgroundColor: Colors.black,
  },
  continueBtn: {
    backgroundColor: Colors.green,
    padding: 16,
    alignItems: "center",
  },
  continueBtnText: {
    fontFamily: Fonts.display,
    fontSize: 12,
    color: Colors.black,
    letterSpacing: 1,
  },
  btnDisabled: {
    backgroundColor: Colors.muted,
  },
  forgotBtn: {
    borderWidth: 2,
    borderColor: Colors.white,
    padding: 16,
    alignItems: "center",
  },
  forgotBtnText: {
    fontFamily: Fonts.display,
    fontSize: 12,
    color: Colors.white,
    letterSpacing: 1,
  },
});
