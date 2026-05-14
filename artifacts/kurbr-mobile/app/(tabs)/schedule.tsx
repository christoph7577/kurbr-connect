import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
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
import {
  useCreateJob,
  useEstimateJobPrice,
  uploadJobPhotos,
  type AiEstimate,
  type JobInputAiEstimate,
  type Job,
} from "@workspace/api-client-react";

type ServiceType = "residential" | "commercial" | "specialty";

const SERVICES: {
  id: ServiceType;
  icon: keyof typeof Feather.glyphMap;
  label: string;
  price: number;
  desc: string;
}[] = [
  {
    id: "residential",
    icon: "home",
    label: "Residential",
    price: 18000,
    desc: "Home cleanouts, furniture, appliances",
  },
  {
    id: "commercial",
    icon: "briefcase",
    label: "Commercial",
    price: 25000,
    desc: "Office & construction debris",
  },
  {
    id: "specialty",
    icon: "star",
    label: "Specialty",
    price: 12000,
    desc: "E-waste, hazardous materials",
  },
];

const STEPS = ["Service", "Photos", "Estimate", "Location", "Schedule", "Details", "Confirm"];

export default function ScheduleScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { mutateAsync: createJob, isPending } = useCreateJob();
  const { mutateAsync: estimatePrice, isPending: isEstimating } = useEstimateJobPrice();

  const [step, setStep] = useState(0);
  const [service, setService] = useState<ServiceType | null>(null);
  const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [estimate, setEstimate] = useState<AiEstimate | null>(null);
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
  const finalPrice = estimate ? estimate.price_estimated : (selectedService?.price ?? 0);

  const canNext = () => {
    if (step === 0) return !!service;
    if (step === 1) return true;
    if (step === 2) return true;
    if (step === 3) return address.length > 3;
    if (step === 4) return !!date && !!time;
    if (step === 5) return name.length > 1;
    return true;
  };

  const pickPhotos = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        "Allow access to your photo library to upload photos of your junk."
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 5,
      quality: 0.7,
    });
    if (!result.canceled) {
      setPhotos((prev) => [...prev, ...result.assets].slice(0, 5));
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        "Allow camera access to photograph your junk."
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled && result.assets[0]) {
      setPhotos((prev) => [...prev, result.assets[0]].slice(0, 5));
    }
  };

  const uploadAndEstimate = async () => {
    if (photos.length === 0) {
      setStep(2);
      return;
    }
    setIsUploadingPhotos(true);
    try {
      const formData = new FormData();
      for (const photo of photos) {
        const filename = photo.uri.split("/").pop() ?? "photo.jpg";
        const ext = /\.(\w+)$/.exec(filename)?.[1] ?? "jpg";
        const type = `image/${ext}`;
        // FormData.append in React Native expects { uri, name, type } for files
        formData.append("photos", { uri: photo.uri, name: filename, type } as unknown as Blob);
      }
      const uploadResult = await uploadJobPhotos({ body: formData });
      const urls = uploadResult.urls;
      setPhotoUrls(urls);

      if (urls.length > 0 && service) {
        const estResult = await estimatePrice({
          data: {
            photoUrls: urls,
            serviceType: service,
            description: description || undefined,
          },
        });
        setEstimate(estResult);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep(2);
    } catch {
      Alert.alert(
        "Upload failed",
        "Could not upload photos. You can still continue without an AI estimate.",
        [
          { text: "Try again", style: "cancel" },
          {
            text: "Skip photos",
            onPress: () => {
              setPhotos([]);
              setPhotoUrls([]);
              setEstimate(null);
              setStep(2);
            },
          },
        ]
      );
    } finally {
      setIsUploadingPhotos(false);
    }
  };

  const handleNext = () => {
    if (!canNext()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step === 1) {
      uploadAndEstimate();
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleConfirm = async () => {
    if (!service) return;
    try {
      const job: Job = await createJob({
        data: {
          serviceType: service,
          address,
          scheduledDate: date,
          scheduledTime: time,
          description: description || undefined,
          customerName: name,
          customerEmail: email || undefined,
          customerPhone: phone || undefined,
          priceCents: finalPrice,
          photos: photoUrls.length > 0 ? photoUrls : undefined,
          // AiEstimate is structurally compatible with JobInputAiEstimate ({ [key: string]: unknown })
          // but lacks an explicit index signature; cast through unknown as TypeScript recommends.
          aiEstimate: estimate ? (estimate as unknown as JobInputAiEstimate) : undefined,
        },
      });
      setTrackingToken(job.trackingToken ?? "");
      setSubmitted(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to create booking. Please try again.";
      Alert.alert("Error", msg);
    }
  };

  const resetForm = () => {
    setSubmitted(false);
    setStep(0);
    setService(null);
    setPhotos([]);
    setPhotoUrls([]);
    setEstimate(null);
    setAddress("");
    setDate("");
    setTime("");
    setName("");
    setEmail("");
    setPhone("");
    setDescription("");
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
    photoActionRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
    photoActionBtn: {
      flex: 1,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      alignItems: "center",
      gap: 8,
    },
    photoActionText: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
    },
    photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
    photoThumb: { width: 80, height: 80, backgroundColor: colors.card },
    photoRemoveBtn: {
      position: "absolute",
      top: 4,
      right: 4,
      backgroundColor: colors.background + "cc",
      borderRadius: 10,
      width: 20,
      height: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    photoCountText: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginBottom: 12,
    },
    skipText: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: colors.mutedForeground,
      textAlign: "center",
      marginTop: 12,
      textDecorationLine: "underline",
    },
    estimateCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.primary,
      padding: 20,
      marginBottom: 20,
    },
    estimateHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 16,
    },
    estimateBadge: {
      fontSize: 10,
      fontFamily: "Inter_700Bold",
      color: colors.primary,
      backgroundColor: colors.primary + "20",
      paddingHorizontal: 8,
      paddingVertical: 3,
      letterSpacing: 1,
      textTransform: "uppercase",
    },
    estimatePriceRow: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: 8,
      marginBottom: 16,
    },
    estimatePrice: {
      fontSize: 36,
      fontFamily: "Inter_700Bold",
      color: colors.primary,
      letterSpacing: -1,
    },
    estimatePriceLabel: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
    estimateRange: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginBottom: 16,
    },
    estimateRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    estimateKey: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
    estimateVal: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
      flex: 1,
      textAlign: "right",
      marginLeft: 12,
    },
    estimateItemList: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginTop: 4,
    },
    estimateItem: {
      backgroundColor: colors.muted,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    estimateItemText: {
      fontSize: 11,
      fontFamily: "Inter_500Medium",
      color: colors.foreground,
    },
    noEstimateCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 20,
      alignItems: "center",
      gap: 10,
      marginBottom: 20,
    },
    noEstimateText: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
    },
    noEstimateSub: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      textAlign: "center",
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
      alignItems: "baseline",
    },
    totalLabel: { fontSize: 15, fontFamily: "Inter_700Bold", color: colors.foreground },
    totalVal: { fontSize: 20, fontFamily: "Inter_700Bold", color: colors.primary },
    aiTag: {
      fontSize: 10,
      fontFamily: "Inter_600SemiBold",
      color: colors.primary,
      backgroundColor: colors.primary + "20",
      paddingHorizontal: 6,
      paddingVertical: 2,
      marginLeft: 6,
    },
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
            onPress={() =>
              router.push({ pathname: "/(tabs)/track", params: { token: trackingToken } })
            }
          >
            <Text style={styles.successTrackText}>TRACK MY JOB</Text>
          </Pressable>
        ) : null}
        <Pressable
          style={({ pressed }) => [styles.successHome, pressed && { opacity: 0.8 }]}
          onPress={() => {
            resetForm();
            router.push("/(tabs)");
          }}
        >
          <Text style={styles.successHomeText}>BACK HOME</Text>
        </Pressable>
      </View>
    );
  }

  const isLoading = isUploadingPhotos || isEstimating;

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
                <View
                  style={[
                    styles.serviceIconBox,
                    service === s.id && { backgroundColor: colors.primary + "20" },
                  ]}
                >
                  <Feather
                    name={s.icon}
                    size={20}
                    color={service === s.id ? colors.primary : colors.mutedForeground}
                  />
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
            <Text style={styles.sectionTitle}>Add photos</Text>
            <Text style={styles.sectionSub}>
              Photos help us give you an accurate AI-powered estimate. Up to 5 photos.
            </Text>

            <View style={styles.photoActionRow}>
              <Pressable
                style={({ pressed }) => [styles.photoActionBtn, pressed && { opacity: 0.8 }]}
                onPress={takePhoto}
                disabled={photos.length >= 5}
              >
                <Feather name="camera" size={22} color={colors.primary} />
                <Text style={styles.photoActionText}>Take photo</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.photoActionBtn, pressed && { opacity: 0.8 }]}
                onPress={pickPhotos}
                disabled={photos.length >= 5}
              >
                <Feather name="image" size={22} color={colors.primary} />
                <Text style={styles.photoActionText}>Camera roll</Text>
              </Pressable>
            </View>

            {photos.length > 0 && (
              <>
                <Text style={styles.photoCountText}>
                  {photos.length} photo{photos.length !== 1 ? "s" : ""} selected
                </Text>
                <View style={styles.photoGrid}>
                  {photos.map((p, i) => (
                    <View key={i} style={{ position: "relative" }}>
                      <Image
                        source={{ uri: p.uri }}
                        style={styles.photoThumb}
                        contentFit="cover"
                      />
                      <Pressable
                        style={styles.photoRemoveBtn}
                        onPress={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                      >
                        <Feather name="x" size={12} color={colors.foreground} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              </>
            )}

            <Text style={styles.label}>Notes for estimate (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe what needs hauling — helps the AI estimate accurately…"
              placeholderTextColor={colors.mutedForeground}
              multiline
            />
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.sectionTitle}>AI Estimate</Text>
            <Text style={styles.sectionSub}>
              {estimate
                ? "Here's our AI-powered estimate based on your photos."
                : "No photos uploaded — we'll use standard pricing."}
            </Text>

            {estimate ? (
              <View style={styles.estimateCard}>
                <View style={styles.estimateHeader}>
                  <Text style={styles.estimateBadge}>AI Estimate</Text>
                </View>
                <View style={styles.estimatePriceRow}>
                  <Text style={styles.estimatePrice}>
                    ${(estimate.price_estimated / 100).toFixed(0)}
                  </Text>
                  <Text style={styles.estimatePriceLabel}>estimated</Text>
                </View>
                <Text style={styles.estimateRange}>
                  Range: ${(estimate.price_min / 100).toFixed(0)} – ${(estimate.price_max / 100).toFixed(0)}
                </Text>
                <View style={styles.estimateRow}>
                  <Text style={styles.estimateKey}>Volume</Text>
                  <Text style={styles.estimateVal}>{estimate.estimated_volume}</Text>
                </View>
                <View style={styles.estimateRow}>
                  <Text style={styles.estimateKey}>Difficulty</Text>
                  <Text style={styles.estimateVal}>{estimate.difficulty_score}/10</Text>
                </View>
                {estimate.item_list.length > 0 && (
                  <View
                    style={[
                      styles.estimateRow,
                      { flexDirection: "column", alignItems: "flex-start" },
                    ]}
                  >
                    <Text style={[styles.estimateKey, { marginBottom: 8 }]}>Items detected</Text>
                    <View style={styles.estimateItemList}>
                      {estimate.item_list.map((item, i) => (
                        <View key={i} style={styles.estimateItem}>
                          <Text style={styles.estimateItemText}>{item}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.noEstimateCard}>
                <Feather name="dollar-sign" size={28} color={colors.mutedForeground} />
                <Text style={styles.noEstimateText}>Standard pricing</Text>
                <Text style={styles.noEstimateSub}>
                  ${((selectedService?.price ?? 0) / 100).toFixed(0)}+ for{" "}
                  {selectedService?.label} service.{"\n"}Add photos for an AI estimate.
                </Text>
              </View>
            )}
          </>
        )}

        {step === 3 && (
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

        {step === 4 && (
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

        {step === 5 && (
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

        {step === 6 && (
          <>
            <Text style={styles.sectionTitle}>Confirm booking</Text>
            <Text style={styles.sectionSub}>Review your details</Text>
            <View style={styles.confirmCard}>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmKey}>Service</Text>
                <Text style={styles.confirmVal}>{selectedService?.label}</Text>
              </View>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmKey}>Photos</Text>
                <Text style={styles.confirmVal}>
                  {photos.length > 0 ? `${photos.length} uploaded` : "None"}
                </Text>
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
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text style={styles.totalLabel}>Estimate</Text>
                  {estimate && <Text style={styles.aiTag}>AI</Text>}
                </View>
                <Text style={styles.totalVal}>${(finalPrice / 100).toFixed(0)}</Text>
              </View>
            </View>
          </>
        )}

        {step === 1 && isLoading ? (
          <View style={[styles.nextBtn, { flexDirection: "row", gap: 10 }]}>
            <ActivityIndicator color={colors.primaryForeground} size="small" />
            <Text style={styles.nextBtnText}>
              {isUploadingPhotos ? "UPLOADING..." : "ESTIMATING..."}
            </Text>
          </View>
        ) : step < STEPS.length - 1 ? (
          <Pressable
            style={({ pressed }) => [
              styles.nextBtn,
              !canNext() && styles.nextBtnDisabled,
              pressed && { opacity: 0.85 },
            ]}
            onPress={handleNext}
            disabled={!canNext()}
          >
            <Text style={styles.nextBtnText}>
              {step === 1 && photos.length > 0 ? "UPLOAD & ESTIMATE" : "CONTINUE"}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            style={({ pressed }) => [
              styles.nextBtn,
              isPending && styles.nextBtnDisabled,
              pressed && { opacity: 0.85 },
            ]}
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

        {step === 1 && !isLoading && (
          <Pressable
            onPress={() => {
              setPhotos([]);
              setPhotoUrls([]);
              setEstimate(null);
              setStep(2);
            }}
          >
            <Text style={styles.skipText}>Skip — I don't have photos</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}
