import { useSignUp } from "@clerk/expo";
import { Link, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

export default function SignUpScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signUp, errors, fetchStatus } = useSignUp();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");

  const handleSignUp = async () => {
    const { error } = await signUp.password({ emailAddress: email, password });
    if (error) return;
    if (!error) await signUp.verifications.sendEmailCode();
  };

  const handleVerify = async () => {
    await signUp.verifications.verifyEmailCode({ code });
    if (signUp.status === "complete") {
      await signUp.finalize({
        navigate: ({ session, decorateUrl }) => {
          if (session?.currentTask) return;
          const url = decorateUrl("/");
          if (url.startsWith("http")) {
            if (typeof window !== "undefined") window.location.href = url;
          } else {
            router.replace("/(tabs)" as any);
          }
        },
      });
    }
  };

  const isVerifying =
    signUp.status === "missing_requirements" &&
    signUp.unverifiedFields.includes("email_address") &&
    signUp.missingFields.length === 0;

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: {
      flexGrow: 1,
      justifyContent: "center",
      paddingHorizontal: 24,
      paddingTop: insets.top + (Platform.OS === "web" ? 67 : 20),
      paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 40),
    },
    logo: { fontSize: 36, fontFamily: "Inter_700Bold", color: colors.primary, letterSpacing: -2, marginBottom: 8 },
    tagline: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginBottom: 48 },
    heading: { fontSize: 28, fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 32 },
    label: { fontSize: 12, fontFamily: "Inter_500Medium", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 },
    input: {
      backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
      padding: 16, fontSize: 16, fontFamily: "Inter_400Regular", color: colors.foreground, marginBottom: 20,
    },
    button: { backgroundColor: colors.primary, paddingVertical: 18, alignItems: "center", marginTop: 8 },
    buttonDisabled: { opacity: 0.5 },
    buttonText: { fontSize: 16, fontFamily: "Inter_700Bold", color: colors.primaryForeground, letterSpacing: 1 },
    error: { fontSize: 13, color: colors.destructive, fontFamily: "Inter_400Regular", marginBottom: 12, marginTop: -12 },
    footer: { flexDirection: "row", justifyContent: "center", marginTop: 24, gap: 4 },
    footerText: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    footerLink: { fontSize: 14, color: colors.primary, fontFamily: "Inter_600SemiBold" },
    sub: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginBottom: 24 },
  });

  if (isVerifying) {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.logo}>KURBR</Text>
          <Text style={styles.heading}>Verify email</Text>
          <Text style={styles.sub}>Enter the code we sent to {email}</Text>
          <Text style={styles.label}>Verification code</Text>
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            placeholder="000000"
            placeholderTextColor={colors.mutedForeground}
          />
          {errors?.fields?.code && <Text style={styles.error}>{errors.fields.code.message}</Text>}
          <Pressable
            style={({ pressed }) => [styles.button, fetchStatus === "fetching" && styles.buttonDisabled, pressed && { opacity: 0.8 }]}
            onPress={handleVerify}
            disabled={fetchStatus === "fetching"}
          >
            {fetchStatus === "fetching" ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={styles.buttonText}>VERIFY</Text>}
          </Pressable>
          <Pressable onPress={() => signUp.verifications.sendEmailCode()} style={{ marginTop: 16, alignItems: "center" }}>
            <Text style={styles.footerLink}>Resend code</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  const disabled = !email || !password || fetchStatus === "fetching";

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>KURBR</Text>
        <Text style={styles.tagline}>On-demand junk hauling</Text>
        <Text style={styles.heading}>Create account</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          placeholder="you@example.com"
          placeholderTextColor={colors.mutedForeground}
        />
        {errors?.fields?.emailAddress && <Text style={styles.error}>{errors.fields.emailAddress.message}</Text>}

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor={colors.mutedForeground}
        />
        {errors?.fields?.password && <Text style={styles.error}>{errors.fields.password.message}</Text>}

        <Pressable
          style={({ pressed }) => [styles.button, disabled && styles.buttonDisabled, pressed && { opacity: 0.8 }]}
          onPress={handleSignUp}
          disabled={disabled}
        >
          {fetchStatus === "fetching" ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={styles.buttonText}>CREATE ACCOUNT</Text>}
        </Pressable>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <Link href="/(auth)/sign-in" style={styles.footerLink}> Sign in</Link>
        </View>

        <View nativeID="clerk-captcha" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
