import { useAuth, useUser } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { useCreateHauler, setAuthTokenGetter } from "@workspace/api-client-react";
import { useEffect } from "react";

const STEPS = ["Info", "Vehicle", "Areas", "Submit"];
const VEHICLE_TYPES = ["Pickup Truck", "Box Truck", "Cargo Van", "Flatbed"];

export default function HaulerOnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { getToken } = useAuth();
  const { user } = useUser();
  const { mutateAsync: createHauler, isPending } = useCreateHauler();

  useEffect(() => {
    setAuthTokenGetter(() => getToken());
  }, [getToken]);

  const [step, setStep] = useState(0);
  const [businessName, setBusinessName] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [areaInput, setAreaInput] = useState("");
  const [serviceAreas, setServiceAreas] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const canNext = () => {
    if (step === 0) return businessName.length > 1;
    if (step === 1) return !!vehicleType && vehiclePlate.length > 1;
    if (step === 2) return serviceAreas.length > 0;
    return true;
  };

  const addArea = () => {
    const trimmed = areaInput.trim();
    if (trimmed && !serviceAreas.includes(trimmed)) {
      setServiceAreas((a) => [...a, trimmed]);
    }
    setAreaInput("");
  };

  const handleSubmit = async () => {
    const userId = user?.id || `pending_${user?.primaryEmailAddress?.emailAddress}_${Date.now()}`;
    try {
      await createHauler({
        data: {
          userId,
          businessName,
          vehicleType,
          vehiclePlate,
          licenseNumber: licenseNumber || undefined,
          serviceAreas,
          backgroundCheckConsent: true,
          trainingCompleted: false,
        },
      } as any);
      setSubmitted(true);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to submit application");
    }
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: {
      paddingTop: topPad + 20,
      paddingHorizontal: 24,
      paddingBottom: bottomPad + 100,
    },
    header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 28 },
    backBtn: {
      width: 36, height: 36,
      alignItems: "center", justifyContent: "center",
      backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    },
    title: { fontSize: 24, fontFamily: "Inter_700Bold", color: colors.foreground, letterSpacing: -0.5 },
    steps: { flexDirection: "row", gap: 4, marginBottom: 32 },
    stepDot: { height: 3, flex: 1 },
    sectionTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 6, letterSpacing: -0.5 },
    sectionSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginBottom: 24 },
    label: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 },
    input: {
      backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
      padding: 16, fontSize: 15, fontFamily: "Inter_400Regular", color: colors.foreground, marginBottom: 20,
    },
    vehicleCard: {
      backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
      padding: 14, marginBottom: 8, flexDirection: "row", alignItems: "center", gap: 12,
    },
    vehicleCardSelected: { borderColor: colors.primary },
    vehicleCardText: { fontSize: 15, fontFamily: "Inter_500Medium", color: colors.foreground },
    areaInputRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
    areaInput: {
      flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
      padding: 16, fontSize: 15, fontFamily: "Inter_400Regular", color: colors.foreground,
    },
    addBtn: { backgroundColor: colors.primary, paddingHorizontal: 18, alignItems: "center", justifyContent: "center" },
    areaChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 },
    areaChip: {
      flexDirection: "row", alignItems: "center", gap: 6,
      backgroundColor: colors.card, borderWidth: 1, borderColor: colors.primary,
      paddingHorizontal: 12, paddingVertical: 6,
    },
    areaChipText: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.primary },
    nextBtn: { backgroundColor: colors.primary, paddingVertical: 18, alignItems: "center", marginTop: 8 },
    nextBtnDisabled: { opacity: 0.4 },
    nextBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: colors.primaryForeground, letterSpacing: 1 },
    success: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
    successIcon: {
      width: 72, height: 72, borderRadius: 36,
      backgroundColor: colors.primary + "20", alignItems: "center", justifyContent: "center", marginBottom: 24,
    },
    successTitle: { fontSize: 28, fontFamily: "Inter_700Bold", color: colors.foreground, letterSpacing: -1, marginBottom: 8, textAlign: "center" },
    successSub: { fontSize: 15, fontFamily: "Inter_400Regular", color: colors.mutedForeground, textAlign: "center", marginBottom: 32, lineHeight: 22 },
    successBtn: { backgroundColor: colors.primary, paddingVertical: 16, paddingHorizontal: 32 },
    successBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: colors.primaryForeground, letterSpacing: 1 },
  });

  if (submitted) {
    return (
      <View style={[styles.container, styles.success]}>
        <View style={styles.successIcon}>
          <Feather name="check" size={36} color={colors.primary} />
        </View>
        <Text style={styles.successTitle}>Application submitted!</Text>
        <Text style={styles.successSub}>We'll review your application and get back to you shortly. Welcome to the KURBR team.</Text>
        <Pressable style={({ pressed }) => [styles.successBtn, pressed && { opacity: 0.8 }]} onPress={() => router.replace("/(tabs)")}>
          <Text style={styles.successBtnText}>BACK HOME</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          {step > 0 ? (
            <Pressable style={styles.backBtn} onPress={() => setStep((s) => s - 1)}>
              <Feather name="arrow-left" size={18} color={colors.foreground} />
            </Pressable>
          ) : (
            <Pressable style={styles.backBtn} onPress={() => router.back()}>
              <Feather name="x" size={18} color={colors.foreground} />
            </Pressable>
          )}
          <Text style={styles.title}>Become a Hauler</Text>
        </View>

        <View style={styles.steps}>
          {STEPS.map((_, i) => (
            <View key={i} style={[styles.stepDot, { backgroundColor: i <= step ? colors.primary : colors.border }]} />
          ))}
        </View>

        {step === 0 && (
          <>
            <Text style={styles.sectionTitle}>Business info</Text>
            <Text style={styles.sectionSub}>Tell us about yourself</Text>
            <Text style={styles.label}>Business name *</Text>
            <TextInput style={styles.input} value={businessName} onChangeText={setBusinessName} placeholder="Acme Hauling Co." placeholderTextColor={colors.mutedForeground} />
          </>
        )}

        {step === 1 && (
          <>
            <Text style={styles.sectionTitle}>Your vehicle</Text>
            <Text style={styles.sectionSub}>What do you haul with?</Text>
            {VEHICLE_TYPES.map((v) => (
              <Pressable
                key={v}
                style={[styles.vehicleCard, vehicleType === v && styles.vehicleCardSelected]}
                onPress={() => setVehicleType(v)}
              >
                <Feather name="truck" size={18} color={vehicleType === v ? colors.primary : colors.mutedForeground} />
                <Text style={[styles.vehicleCardText, vehicleType === v && { color: colors.primary }]}>{v}</Text>
              </Pressable>
            ))}
            <Text style={[styles.label, { marginTop: 16 }]}>License plate *</Text>
            <TextInput style={styles.input} value={vehiclePlate} onChangeText={setVehiclePlate} placeholder="ABC-1234" placeholderTextColor={colors.mutedForeground} autoCapitalize="characters" />
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.sectionTitle}>Service areas</Text>
            <Text style={styles.sectionSub}>Where will you be hauling?</Text>
            <View style={styles.areaInputRow}>
              <TextInput style={styles.areaInput} value={areaInput} onChangeText={setAreaInput} placeholder="City or zip code" placeholderTextColor={colors.mutedForeground} onSubmitEditing={addArea} />
              <Pressable style={styles.addBtn} onPress={addArea}>
                <Feather name="plus" size={20} color={colors.primaryForeground} />
              </Pressable>
            </View>
            {serviceAreas.length > 0 && (
              <View style={styles.areaChips}>
                {serviceAreas.map((a) => (
                  <Pressable key={a} style={styles.areaChip} onPress={() => setServiceAreas((arr) => arr.filter((x) => x !== a))}>
                    <Text style={styles.areaChipText}>{a}</Text>
                    <Feather name="x" size={12} color={colors.primary} />
                  </Pressable>
                ))}
              </View>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <Text style={styles.sectionTitle}>Ready to submit?</Text>
            <Text style={styles.sectionSub}>We'll review your application and contact you within 24 hours.</Text>
          </>
        )}

        {step < STEPS.length - 1 ? (
          <Pressable
            style={[styles.nextBtn, !canNext() && styles.nextBtnDisabled]}
            onPress={() => canNext() && setStep((s) => s + 1)}
            disabled={!canNext()}
          >
            <Text style={styles.nextBtnText}>CONTINUE</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.nextBtn, isPending && styles.nextBtnDisabled]}
            onPress={handleSubmit}
            disabled={isPending}
          >
            {isPending ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={styles.nextBtnText}>SUBMIT APPLICATION</Text>}
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
