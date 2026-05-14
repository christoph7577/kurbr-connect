import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
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
import { trackJob } from "@workspace/api-client-react";

interface TrackingData {
  jobNumber: string;
  trackingToken: string;
  status: string;
  serviceType: string;
  address: string;
  scheduledDate: string | null;
  scheduledTime: string | null;
  priceCents: number | null;
}

const STATUSES = ["confirmed", "dispatched", "en_route", "arrived", "completed"];
const STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmed",
  dispatched: "Dispatched",
  en_route: "En Route",
  arrived: "Arrived",
  completed: "Completed",
};

function statusIndex(s: string) {
  const i = STATUSES.indexOf(s);
  return i >= 0 ? i : 0;
}

export default function TrackScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ token?: string }>();

  const [token, setToken] = useState(params.token || "");
  const [job, setJob] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + 90 + (Platform.OS === "web" ? 34 : 0);

  const handleTrack = async () => {
    if (!token.trim()) return;
    setLoading(true);
    setNotFound(false);
    setJob(null);
    try {
      // @ts-ignore
      const data = await trackJob(token.trim());
      setJob(data as TrackingData);
    } catch {
      setNotFound(true);
    }
    setLoading(false);
  };

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
      marginBottom: 6,
    },
    pageSub: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginBottom: 32,
    },
    inputRow: { flexDirection: "row", gap: 8, marginBottom: 24 },
    input: {
      flex: 1,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
    },
    trackBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    jobCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 20,
    },
    jobNum: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      color: colors.primary,
      letterSpacing: 1.5,
      textTransform: "uppercase",
      marginBottom: 4,
    },
    jobService: {
      fontSize: 22,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      letterSpacing: -0.5,
      marginBottom: 4,
    },
    jobAddress: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginBottom: 20,
    },
    progressContainer: { marginBottom: 20 },
    progressLabel: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 1,
      marginBottom: 12,
    },
    progressRow: { flexDirection: "row", alignItems: "center" },
    progressStep: { alignItems: "center", flex: 1 },
    progressDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
    },
    progressLine: { flex: 1, height: 2, marginHorizontal: 2 },
    progressStepLabel: {
      fontSize: 9,
      fontFamily: "Inter_500Medium",
      textAlign: "center",
      marginTop: 6,
    },
    statusBadge: {
      alignSelf: "flex-start",
      paddingHorizontal: 12,
      paddingVertical: 6,
      marginTop: 4,
    },
    statusText: {
      fontSize: 13,
      fontFamily: "Inter_700Bold",
      letterSpacing: 1,
    },
    detailRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 14,
      marginTop: 8,
    },
    detailText: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
    },
    notFound: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 24,
      alignItems: "center",
      gap: 12,
    },
    notFoundText: {
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
    },
    notFoundSub: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      textAlign: "center",
    },
  });

  const idx = job ? statusIndex(job.status) : -1;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.pageTitle}>Track Job</Text>
        <Text style={styles.pageSub}>Enter your tracking token to see status</Text>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={token}
            onChangeText={setToken}
            placeholder="Tracking token..."
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={handleTrack}
          />
          <Pressable
            style={({ pressed }) => [styles.trackBtn, pressed && { opacity: 0.8 }]}
            onPress={handleTrack}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.primaryForeground} size="small" />
            ) : (
              <Feather name="search" size={20} color={colors.primaryForeground} />
            )}
          </Pressable>
        </View>

        {notFound && (
          <View style={styles.notFound}>
            <Feather name="alert-circle" size={32} color={colors.mutedForeground} />
            <Text style={styles.notFoundText}>Job not found</Text>
            <Text style={styles.notFoundSub}>Check your tracking token and try again</Text>
          </View>
        )}

        {job && (
          <View style={styles.jobCard}>
            <Text style={styles.jobNum}>{job.jobNumber}</Text>
            <Text style={styles.jobService}>
              {job.serviceType.charAt(0).toUpperCase() + job.serviceType.slice(1)} Removal
            </Text>
            <Text style={styles.jobAddress}>{job.address}</Text>

            <View style={styles.progressContainer}>
              <Text style={styles.progressLabel}>Status</Text>
              <View style={styles.progressRow}>
                {STATUSES.map((s, i) => (
                  <React.Fragment key={s}>
                    <View style={styles.progressStep}>
                      <View
                        style={[
                          styles.progressDot,
                          { backgroundColor: i <= idx ? colors.primary : colors.border },
                        ]}
                      />
                      <Text
                        style={[
                          styles.progressStepLabel,
                          { color: i <= idx ? colors.primary : colors.mutedForeground },
                        ]}
                      >
                        {STATUS_LABELS[s]?.split(" ")[0]}
                      </Text>
                    </View>
                    {i < STATUSES.length - 1 && (
                      <View
                        style={[
                          styles.progressLine,
                          { backgroundColor: i < idx ? colors.primary : colors.border },
                        ]}
                      />
                    )}
                  </React.Fragment>
                ))}
              </View>
            </View>

            <View
              style={[
                styles.statusBadge,
                { backgroundColor: job.status === "completed" ? colors.muted : colors.primary + "20" },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: job.status === "completed" ? colors.mutedForeground : colors.primary },
                ]}
              >
                {STATUS_LABELS[job.status] || job.status.toUpperCase()}
              </Text>
            </View>

            {job.scheduledDate && (
              <View style={styles.detailRow}>
                <Feather name="calendar" size={16} color={colors.mutedForeground} />
                <Text style={styles.detailText}>
                  {job.scheduledDate} {job.scheduledTime ? `at ${job.scheduledTime}` : ""}
                </Text>
              </View>
            )}
            {job.priceCents && (
              <View style={[styles.detailRow, { borderTopWidth: 0, marginTop: 0 }]}>
                <Feather name="dollar-sign" size={16} color={colors.mutedForeground} />
                <Text style={styles.detailText}>${(job.priceCents / 100).toFixed(0)}</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
