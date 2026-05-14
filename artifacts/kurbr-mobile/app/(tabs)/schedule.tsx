import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { useCreateJob } from "@workspace/api-client-react";

type ServiceType = "residential" | "commercial" | "specialty";

const SERVICES: { id: ServiceType; icon: keyof typeof Feather.glyphMap; label: string; price: number; desc: string }[] = [
  { id: "residential", icon: "home", label: "Residential", price: 18000, desc: "Home cleanouts, furniture, appliances" },
  { id: "commercial", icon: "briefcase", label: "Commercial", price: 25000, desc: "Office & construction debris" },
  { id: "specialty", icon: "star", label: "Specialty", price: 12000, desc: "E-waste, hazardous materials" },
];

const STEPS = ["Service", "Location", "Schedule", "Details", "Confirm"];

export default function ScheduleScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { mutateAsync: createJob, isPending } = useCreateJob();

  const [step, setStep] = useState(0);
  const [service, setService] = useState<ServiceType | null>(null);
  const [address, setAddress] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [trackingToken, setTrackingToken] = useState("");

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + 90 + (Platform.OS === "web" ? 34 : 0);

  const selectedService = SERVICES.find((s) => s.id === service);

  const canNext = () => {
    if (step === 0) return !!service;
    if (step === 1) return address.length > 3;
    if (step === 2) return !!date && !!time;
    if (step === 3) return name.length > 1;
    return true;
  };

  const handleNext = () => {
    if (canNext()) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    }
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleConfirm = async () => {
    if (!service) return;
    try {
      const job = await createJob({
        data: {
          serviceType: service,
          address,
          scheduledDate: date,
          scheduledTime: time,
          description: description || undefined,
          customerName: name,
          customerEmail: email || undefined,
          customerPhone: phone || undefined,
          priceCents: selectedService?.price,
        },
      } as any);
      // @ts-ignore
      setTrackingToken(job.trackingToken || "");
      setSubmitted(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to create booking. Please try again.");
    }
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: {
      paddingTop: topPad + 20,
      paddingHorizontal: 24,
      paddingBottom: bottomPad,
    },
    header: { flexDirection: "row", alignItems: "center", marginBottom: 28, gap: 12 },
    backBtn: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pageTitle: {
      fontSize: 24,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      letterSpacing: -0.5,
    },
    steps: { flexDirection: "row", gap: 4, marginBottom: 32 },
    stepDot: { height: 3, flex: 1 },
    sectionTitle: {
      fontSize: 20,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      marginBottom: 6,
      letterSpacing: -0.5,
    },
    sectionSub: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginBottom: 24,
    },
    serviceCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 20,
      marginBottom: 8,
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
    },
    serviceCardSelected: { borderColor: colors.primary },
    serviceIconBox: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.muted,
    },
    serviceCardContent: { flex: 1 },
    serviceCardLabel: {
      fontSize: 16,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
    },
    serviceCardDesc: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginTop: 2,
    },
    serviceCardPrice: {
      fontSize: 18,
      fontFamily: "Inter_700Bold",
      color: colors.primary,
    },
    label: {
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 1,
      marginBottom: 8,
    },
    input: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
      marginBottom: 20,
    },
    textArea: { minHeight: 80, textAlignVertical: "top" },
    confirmCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 20,
      gap: 12,
      marginBottom: 24,
    },
    confirmRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    confirmKey: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
    confirmVal: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
      flex: 1,
      textAlign: "right",
    },
    totalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 12,
      marginTop: 4,
    },
    totalLabel: { fontSize: 15, fontFamily: "Inter_700Bold", color: colors.foreground },
    totalVal: { fontSize: 20, fontFamily: "Inter_700Bold", color: colors.primary },
    nextBtn: {
      backgroundColor: colors.primary,
      paddingVertical: 18,
      alignItems: "center",
      marginTop: 8,
    },
    nextBtnDisabled: { opacity: 0.4 },
    nextBtnText: {
      fontSize: 16,
      fontFamily: "Inter_700Bold",
      color: colors.primaryForeground,
      letterSpacing: 1,
    },
    successContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
    successIcon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.primary + "20",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 24,
    },
    successTitle: {
      fontSize: 28,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      letterSpacing: -1,
      marginBottom: 8,
      textAlign: "center",
    },
    successSub: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      textAlign: "center",
      marginBottom: 32,
      lineHeight: 22,
    },
    successTrack: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      paddingHorizontal: 32,
      marginBottom: 12,
    },
    successTrackText: {
      fontSize: 15,
      fontFamily: "Inter_700Bold",
      color: colors.primaryForeground,
      letterSpacing: 1,
    },
    successHome: {
      paddingVertical: 16,
      paddingHorizontal: 32,
      borderWidth: 1,
      borderColor: colors.border,
    },
    successHomeText: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
      letterSpacing: 1,
    },
  });

  if (submitted) {
    return (
      <View style={[styles.container, styles.successContainer]}>
        <View style={styles.successIcon}>
          <Feather name="check" size={36} color={colors.primary} />
        </View>
        <Text style={styles.successTitle}>Booking confirmed!</Text>
        <Text style={styles.successSub}>
          Your junk removal has been scheduled. We'll be there on time.
        </Text>
        {trackingToken ? (
          <Pressable
            style={({ pressed }) => [styles.successTrack, pressed && { opacity: 0.8 }]}
            onPress={() => router.push({ pathname: "/(tabs)/track", params: { token: trackingToken } })}
          >
            <Text style={styles.successTrackText}>TRACK MY JOB</Text>
          </Pressable>
        ) : null}
        <Pressable
          style={({ pressed }) => [styles.successHome, pressed && { opacity: 0.8 }]}
          onPress={() => {
            setSubmitted(false);
            setStep(0);
            setService(null);
            setAddress("");
            setDate("");
            setTime("");
            setName("");
            setEmail("");
            setPhone("");
            setDescription("");
            router.push("/(tabs)");
          }}
        >
          <Text style={styles.successHomeText}>BACK HOME</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          {step > 0 && (
            <Pressable style={styles.backBtn} onPress={handleBack}>
              <Feather name="arrow-left" size={18} color={colors.foreground} />
            </Pressable>
          )}
          <Text style={styles.pageTitle}>{STEPS[step]}</Text>
        </View>

        <View style={styles.steps}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={[
                styles.stepDot,
                { backgroundColor: i <= step ? colors.primary : colors.border },
              ]}
            />
          ))}
        </View>

        {step === 0 && (
          <>
            <Text style={styles.sectionTitle}>Select service</Text>
            <Text style={styles.sectionSub}>What type of junk do you need hauled?</Text>
            {SERVICES.map((s) => (
              <Pressable
                key={s.id}
                style={({ pressed }) => [
                  styles.serviceCard,
                  service === s.id && styles.serviceCardSelected,
                  pressed && { opacity: 0.85 },
                ]}
                onPress={() => setService(s.id)}
              >
                <View style={[styles.serviceIconBox, service === s.id && { backgroundColor: colors.primary + "20" }]}>
                  <Feather name={s.icon} size={20} color={service === s.id ? colors.primary : colors.mutedForeground} />
                </View>
                <View style={styles.serviceCardContent}>
                  <Text style={styles.serviceCardLabel}>{s.label}</Text>
                  <Text style={styles.serviceCardDesc}>{s.desc}</Text>
                </View>
                <Text style={styles.serviceCardPrice}>${(s.price / 100).toFixed(0)}+</Text>
              </Pressable>
            ))}
          </>
        )}

        {step === 1 && (
          <>
            <Text style={styles.sectionTitle}>Location</Text>
            <Text style={styles.sectionSub}>Where should we pick up?</Text>
            <Text style={styles.label}>Street address</Text>
            <TextInput
              style={styles.input}
              value={address}
              onChangeText={setAddress}
              placeholder="123 Main St, City, State"
              placeholderTextColor={colors.mutedForeground}
              autoComplete="street-address"
            />
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.sectionTitle}>Schedule</Text>
            <Text style={styles.sectionSub}>When should we arrive?</Text>
            <Text style={styles.label}>Date</Text>
            <TextInput
              style={styles.input}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numbers-and-punctuation"
            />
            <Text style={styles.label}>Preferred time</Text>
            <TextInput
              style={styles.input}
              value={time}
              onChangeText={setTime}
              placeholder="e.g. 9:00 AM"
              placeholderTextColor={colors.mutedForeground}
            />
          </>
        )}

        {step === 3 && (
          <>
            <Text style={styles.sectionTitle}>Your details</Text>
            <Text style={styles.sectionSub}>So we can confirm your booking</Text>
            <Text style={styles.label}>Full name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Jane Smith"
              placeholderTextColor={colors.mutedForeground}
              autoComplete="name"
            />
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="jane@example.com"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Text style={styles.label}>Phone</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="(555) 000-0000"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="phone-pad"
            />
            <Text style={styles.label}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe what needs hauling..."
              placeholderTextColor={colors.mutedForeground}
              multiline
            />
          </>
        )}

        {step === 4 && (
          <>
            <Text style={styles.sectionTitle}>Confirm booking</Text>
            <Text style={styles.sectionSub}>Review your details</Text>
            <View style={styles.confirmCard}>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmKey}>Service</Text>
                <Text style={styles.confirmVal}>{selectedService?.label}</Text>
              </View>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmKey}>Address</Text>
                <Text style={styles.confirmVal} numberOfLines={2}>{address}</Text>
              </View>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmKey}>Date</Text>
                <Text style={styles.confirmVal}>{date}</Text>
              </View>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmKey}>Time</Text>
                <Text style={styles.confirmVal}>{time}</Text>
              </View>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmKey}>Name</Text>
                <Text style={styles.confirmVal}>{name}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Estimated total</Text>
                <Text style={styles.totalVal}>${((selectedService?.price || 0) / 100).toFixed(0)}+</Text>
              </View>
            </View>
          </>
        )}

        {step < STEPS.length - 1 ? (
          <Pressable
            style={({ pressed }) => [styles.nextBtn, !canNext() && styles.nextBtnDisabled, pressed && { opacity: 0.85 }]}
            onPress={handleNext}
            disabled={!canNext()}
          >
            <Text style={styles.nextBtnText}>CONTINUE</Text>
          </Pressable>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.nextBtn, isPending && styles.nextBtnDisabled, pressed && { opacity: 0.85 }]}
            onPress={handleConfirm}
            disabled={isPending}
          >
            {isPending ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={styles.nextBtnText}>CONFIRM BOOKING</Text>
            )}
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}
