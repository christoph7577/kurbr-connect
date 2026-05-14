import { useSignIn } from "@clerk/expo";
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

export default function SignInScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn, errors, fetchStatus } = useSignIn();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");

  const handleSignIn = async () => {
    const { error } = await signIn.password({ emailAddress: email, password });
    if (error) return;

    if (signIn.status === "complete") {
      await signIn.finalize({
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
    } else if (signIn.status === "needs_client_trust") {
      const emailCodeFactor = signIn.supportedSecondFactors.find(
        (f: any) => f.strategy === "email_code"
      );
      if (emailCodeFactor) await signIn.mfa.sendEmailCode();
    }
  };

  const handleVerify = async () => {
    await signIn.mfa.verifyEmailCode({ code });
    if (signIn.status === "complete") {
      await signIn.finalize({
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

  if (signIn.status === "needs_client_trust") {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.logo}>KURBR</Text>
          <Text style={styles.heading}>Verify email</Text>
          <Text style={styles.sub}>Enter the verification code we sent you</Text>
          <Text style={styles.label}>Code</Text>
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
          <Pressable onPress={() => signIn.mfa.sendEmailCode()} style={{ marginTop: 16, alignItems: "center" }}>
            <Text style={styles.footerLink}>Resend code</Text>
          </Pressable>
          <Pressable onPress={() => signIn.reset()} style={{ marginTop: 8, alignItems: "center" }}>
            <Text style={[styles.footerLink, { color: colors.mutedForeground }]}>Start over</Text>
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
        <Text style={styles.heading}>Sign in</Text>

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
        {errors?.fields?.identifier && <Text style={styles.error}>{errors.fields.identifier.message}</Text>}

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
          onPress={handleSignIn}
          disabled={disabled}
        >
          {fetchStatus === "fetching" ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={styles.buttonText}>SIGN IN</Text>}
        </Pressable>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account?</Text>
          <Link href="/(auth)/sign-up" style={styles.footerLink}> Sign up</Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
