import BackButton from "@/components/ui/BackButton";
import BottomActionBar from "@/components/ui/BottomActionBar";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { getAuthRedirectUrl } from "@/lib/auth-redirect";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
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

    // Re-authenticate: verify the current password before allowing a change so
    // a stolen unlocked session can't silently take over the account.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) {
      Alert.alert("Error", "You must be signed in to change your password.");
      setLoading(false);
      return;
    }

    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (reauthError) {
      Alert.alert("Incorrect Password", "Your current password is incorrect.");
      setLoading(false);
      return;
    }

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

  async function handleForgotPassword() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) return;

    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: getAuthRedirectUrl("auth/reset"),
    });
    Alert.alert(
      error ? "Error" : "Check your email",
      error
        ? error.message
        : "We sent a password reset link to your email address.",
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner}>
        <BackButton label="← Change Password" style={styles.backBtn} />

        {/* Success banner */}
        {success && (
          <View style={styles.successBanner}>
            <Text style={styles.successTitle}>Password Updated!</Text>
            <Text style={styles.successBody}>
              Your password has been changed successfully. You&apos;ll need to
              log in again on other devices.
            </Text>
          </View>
        )}

        <FormField
          label="Current Password"
          placeholder="enter current password"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
        />

        <FormField
          label="New Password"
          placeholder="enter new password"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          status={newPassword.length > 0 && allMet ? "success" : "default"}
          hint="*min 8 chars with an uppercase letter, number, and special character"
        />

        <FormField
          label="Confirm New Password"
          placeholder="re-enter new password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          status={
            confirmPassword.length === 0
              ? "default"
              : passwordsMatch
                ? "success"
                : "error"
          }
          errorText={
            confirmPassword.length > 0 && !passwordsMatch
              ? "*passwords do not match"
              : undefined
          }
        />

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

      <BottomActionBar>
        <Button
          label={loading ? "Updating..." : success ? "Done" : "Continue"}
          onPress={handleChangePassword}
          disabled={!canSubmit || loading}
        />
        <Button
          label="Forgot your password?"
          variant="outline"
          onPress={handleForgotPassword}
        />
      </BottomActionBar>
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
  },
  backBtn: {
    marginBottom: 16,
  },
  successBanner: {
    backgroundColor: "rgba(57,255,20,0.07)",
    borderWidth: 2,
    borderColor: Colors.green,
    padding: 14,
    marginBottom: 16,
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
});
