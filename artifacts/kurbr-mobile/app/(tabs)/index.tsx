import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const SERVICES = [
  { id: "residential", icon: "home" as const, label: "Residential", desc: "Home cleanouts, furniture, appliances", price: "$180" },
  { id: "commercial", icon: "briefcase" as const, label: "Commercial", desc: "Office & construction debris", price: "$250" },
  { id: "specialty", icon: "star" as const, label: "Specialty", desc: "E-waste, hazardous materials", price: "$120" },
];

const HOW_IT_WORKS = [
  { step: "01", icon: "calendar" as const, title: "Book Online", desc: "Schedule a pickup in under 2 minutes" },
  { step: "02", icon: "truck" as const, title: "We Show Up", desc: "Professional haulers arrive on time" },
  { step: "03", icon: "check-circle" as const, title: "Done & Clean", desc: "We haul it all away, you relax" },
];

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + 90 + (Platform.OS === "web" ? 34 : 0);

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { paddingBottom: bottomPad },
    header: {
      paddingTop: topPad + 20,
      paddingHorizontal: 24,
      paddingBottom: 20,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    logo: {
      fontSize: 28,
      fontFamily: "Inter_700Bold",
      color: colors.primary,
      letterSpacing: -2,
    },
    hero: {
      marginHorizontal: 24,
      marginBottom: 32,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 28,
    },
    heroBadge: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16,
      gap: 6,
    },
    heroBadgeDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.primary,
    },
    heroBadgeText: {
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
      color: colors.primary,
      textTransform: "uppercase",
      letterSpacing: 1.5,
    },
    heroTitle: {
      fontSize: 32,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      letterSpacing: -1,
      marginBottom: 10,
      lineHeight: 38,
    },
    heroOrange: { color: colors.primary },
    heroSub: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginBottom: 24,
      lineHeight: 22,
    },
    ctaBtn: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "center",
      gap: 8,
    },
    ctaBtnText: {
      fontSize: 16,
      fontFamily: "Inter_700Bold",
      color: colors.primaryForeground,
      letterSpacing: 1,
    },
    sectionLabel: {
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 1.5,
      marginHorizontal: 24,
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 22,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      marginHorizontal: 24,
      marginBottom: 16,
      letterSpacing: -0.5,
    },
    servicesRow: {
      flexDirection: "row",
      gap: 12,
      paddingHorizontal: 24,
      marginBottom: 40,
    },
    serviceCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
    },
    serviceIconBox: {
      width: 36,
      height: 36,
      backgroundColor: colors.muted,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },
    serviceLabel: {
      fontSize: 13,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      marginBottom: 4,
    },
    serviceDesc: {
      fontSize: 11,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginBottom: 8,
      lineHeight: 16,
    },
    servicePrice: {
      fontSize: 16,
      fontFamily: "Inter_700Bold",
      color: colors.primary,
    },
    stepsContainer: {
      paddingHorizontal: 24,
      marginBottom: 40,
      gap: 2,
    },
    step: {
      flexDirection: "row",
      alignItems: "flex-start",
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 16,
    },
    stepNum: {
      fontSize: 11,
      fontFamily: "Inter_700Bold",
      color: colors.primary,
      letterSpacing: 1,
      width: 24,
    },
    stepContent: { flex: 1 },
    stepTitle: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
      marginBottom: 2,
    },
    stepDesc: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
    bottomCta: {
      marginHorizontal: 24,
      backgroundColor: colors.primary,
      paddingVertical: 18,
      alignItems: "center",
    },
    bottomCtaText: {
      fontSize: 16,
      fontFamily: "Inter_700Bold",
      color: colors.primaryForeground,
      letterSpacing: 1,
    },
  });

  return (
    <View style={styles.container}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.logo}>KURBR</Text>
          <Feather name="truck" size={24} color={colors.primary} />
        </View>

        <View style={styles.hero}>
          <View style={styles.heroBadge}>
            <View style={styles.heroBadgeDot} />
            <Text style={styles.heroBadgeText}>Available now</Text>
          </View>
          <Text style={styles.heroTitle}>
            Junk hauled,<Text style={styles.heroOrange}>{"\n"}fast.</Text>
          </Text>
          <Text style={styles.heroSub}>
            Professional junk removal on demand. Book in minutes, we handle the rest.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.ctaBtn, pressed && { opacity: 0.85 }]}
            onPress={() => router.push("/(tabs)/schedule")}
          >
            <Text style={styles.ctaBtnText}>BOOK NOW</Text>
            <Feather name="arrow-right" size={18} color={colors.primaryForeground} />
          </Pressable>
        </View>

        <Text style={styles.sectionLabel}>Services</Text>
        <View style={styles.servicesRow}>
          {SERVICES.map((s) => (
            <Pressable
              key={s.id}
              style={({ pressed }) => [styles.serviceCard, pressed && { opacity: 0.8 }]}
              onPress={() => router.push("/(tabs)/schedule")}
            >
              <View style={styles.serviceIconBox}>
                <Feather name={s.icon} size={18} color={colors.primary} />
              </View>
              <Text style={styles.serviceLabel}>{s.label}</Text>
              <Text style={styles.serviceDesc}>{s.desc}</Text>
              <Text style={styles.servicePrice}>{s.price}+</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionLabel}>How it works</Text>
        <View style={styles.stepsContainer}>
          {HOW_IT_WORKS.map((h) => (
            <View key={h.step} style={styles.step}>
              <Text style={styles.stepNum}>{h.step}</Text>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>{h.title}</Text>
                <Text style={styles.stepDesc}>{h.desc}</Text>
              </View>
              <Feather name={h.icon} size={20} color={colors.mutedForeground} />
            </View>
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [styles.bottomCta, pressed && { opacity: 0.85 }]}
          onPress={() => router.push("/(tabs)/schedule")}
        >
          <Text style={styles.bottomCtaText}>SCHEDULE A PICKUP</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
