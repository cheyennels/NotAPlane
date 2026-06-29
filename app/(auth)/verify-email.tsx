import Button from "@/components/ui/Button";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { getAuthRedirectUrl } from "@/lib/auth-redirect";
import { notify } from "@/lib/notify";
import { supabase } from "@/lib/supabase";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

export default function VerifyEmailScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [sending, setSending] = useState(false);

  async function handleResend() {
    if (!email) {
      notify("Missing email", "Go back to sign up and try again.");
      return;
    }

    setSending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: getAuthRedirectUrl(),
      },
    });
    setSending(false);

    if (error) {
      notify("Could not resend email", error.message);
      return;
    }

    notify("Email sent", "Check your inbox for a new confirmation link.");
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Check your email</Text>
      <Text style={styles.body}>
        We sent a confirmation link{email ? ` to ${email}` : ""}. Open it to
        activate your account, then come back here and log in.
      </Text>
      <Text style={styles.hint}>
        The link should open NotAPlane directly — not localhost.
      </Text>

      {email ? (
        <Button
          label={sending ? "Sending..." : "Resend confirmation email"}
          variant="outline"
          onPress={handleResend}
          disabled={sending}
          style={styles.resendBtn}
        />
      ) : null}

      <Button
        label="Back to login"
        onPress={() => router.replace("/(auth)" as any)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
    paddingHorizontal: 24,
    paddingTop: 100,
    gap: 16,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 28,
    color: Colors.white,
  },
  body: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.muted,
    lineHeight: 20,
  },
  hint: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.dim,
    lineHeight: 16,
  },
  resendBtn: {
    marginTop: 8,
  },
});
