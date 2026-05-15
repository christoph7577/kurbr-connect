import { useUser } from "@clerk/expo";
import { useAuth } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useSignOut } from "@/hooks/useSignOut";
import { useGetMyProfile } from "@workspace/api-client-react";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const signOut = useSignOut();
  const { user } = useUser();
  const { data: profile, isLoading } = useGetMyProfile({ query: { enabled: !!isSignedIn } as any });

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + 90 + (Platform.OS === "web" ? 34 : 0);

  // @ts-ignore
  const isAdmin = profile?.role === "admin";
  // @ts-ignore
  const isHauler = profile?.role === "hauler";

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: {
      paddingTop: topPad + 20,
      paddingHorizontal: 24,
      paddingBottom: bottomPad,
    },
    pageTitle: {
      fontSize: 28,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      letterSpacing: -1,
      marginBottom: 32,
    },
    avatarContainer: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 20,
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      marginBottom: 2,
    },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: 0,
      backgroundColor: colors.primary + "30",
      alignItems: "center",
      justifyContent: "center",
    },
    avatarInitial: {
      fontSize: 22,
      fontFamily: "Inter_700Bold",
      color: colors.primary,
    },
    userName: {
      fontSize: 18,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
    },
    userEmail: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginTop: 2,
    },
    roleBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: 6,
    },
    roleDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
    roleText: {
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
      color: colors.primary,
      textTransform: "uppercase",
      letterSpacing: 1,
    },
    menuSection: { marginTop: 24, gap: 2 },
    menuLabel: {
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 1,
      marginBottom: 8,
    },
    menuItem: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      gap: 12,
    },
    menuItemText: {
      flex: 1,
      fontSize: 15,
      fontFamily: "Inter_500Medium",
      color: colors.foreground,
    },
    menuItemDanger: { color: colors.destructive },
    signInContainer: { gap: 12, marginTop: 8 },
    signInTitle: {
      fontSize: 28,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      letterSpacing: -1,
      marginBottom: 8,
    },
    signInSub: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginBottom: 24,
      lineHeight: 22,
    },
    signInBtn: {
      backgroundColor: colors.primary,
      paddingVertical: 18,
      alignItems: "center",
    },
    signInBtnText: {
      fontSize: 16,
      fontFamily: "Inter_700Bold",
      color: colors.primaryForeground,
      letterSpacing: 1,
    },
    signUpBtn: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 18,
      alignItems: "center",
    },
    signUpBtnText: {
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
      letterSpacing: 1,
    },
  });

  if (!isSignedIn) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.pageTitle}>Profile</Text>
          <Text style={styles.signInTitle}>Welcome to{"\n"}KURBR</Text>
          <Text style={styles.signInSub}>
            Sign in to book jobs, track your hauler activity, or manage operations.
          </Text>
          <View style={styles.signInContainer}>
            <Pressable
              style={({ pressed }) => [styles.signInBtn, pressed && { opacity: 0.85 }]}
              onPress={() => router.push("/(auth)/sign-in")}
            >
              <Text style={styles.signInBtnText}>SIGN IN</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.signUpBtn, pressed && { opacity: 0.85 }]}
              onPress={() => router.push("/(auth)/sign-up")}
            >
              <Text style={styles.signUpBtnText}>CREATE ACCOUNT</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    );
  }

  const nameStr = user?.fullName || user?.primaryEmailAddress?.emailAddress || "User";
  const initial = nameStr[0]?.toUpperCase() || "U";

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.pageTitle}>Profile</Text>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarInitial}>{initial}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName}>{nameStr}</Text>
              <Text style={styles.userEmail}>{user?.primaryEmailAddress?.emailAddress}</Text>
              {(isAdmin || isHauler) && (
                <View style={styles.roleBadge}>
                  <View style={styles.roleDot} />
                  <Text style={styles.roleText}>{isAdmin ? "Admin" : "Hauler"}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        <View style={styles.menuSection}>
          {isAdmin && (
            <>
              <Text style={styles.menuLabel}>Admin</Text>
              <Pressable
                style={({ pressed }) => [styles.menuItem, pressed && { opacity: 0.8 }]}
                onPress={() => router.push("/admin-dashboard")}
              >
                <Feather name="grid" size={18} color={colors.primary} />
                <Text style={styles.menuItemText}>Admin Dashboard</Text>
                <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
              </Pressable>
            </>
          )}

          {isHauler && (
            <>
              <Text style={[styles.menuLabel, isAdmin && { marginTop: 20 }]}>Hauler</Text>
              <Pressable
                style={({ pressed }) => [styles.menuItem, pressed && { opacity: 0.8 }]}
                onPress={() => router.push("/hauler-dashboard")}
              >
                <Feather name="truck" size={18} color={colors.primary} />
                <Text style={styles.menuItemText}>My Jobs</Text>
                <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
              </Pressable>
            </>
          )}

          <Text style={[styles.menuLabel, (isAdmin || isHauler) && { marginTop: 20 }]}>Account</Text>
          <Pressable
            style={({ pressed }) => [styles.menuItem, pressed && { opacity: 0.8 }]}
            onPress={() => router.push("/(tabs)/schedule")}
          >
            <Feather name="plus-circle" size={18} color={colors.mutedForeground} />
            <Text style={styles.menuItemText}>Book a job</Text>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.menuItem, pressed && { opacity: 0.8 }]}
            onPress={() => router.push("/(tabs)/track")}
          >
            <Feather name="map-pin" size={18} color={colors.mutedForeground} />
            <Text style={styles.menuItemText}>Track a job</Text>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </Pressable>

          <Text style={[styles.menuLabel, { marginTop: 20 }]}>Session</Text>
          <Pressable
            style={({ pressed }) => [styles.menuItem, pressed && { opacity: 0.8 }]}
            onPress={() => { queryClient.clear(); signOut(); }}
          >
            <Feather name="log-out" size={18} color={colors.destructive} />
            <Text style={[styles.menuItemText, styles.menuItemDanger]}>Sign out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
