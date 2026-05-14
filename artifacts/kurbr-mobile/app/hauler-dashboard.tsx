import { useAuth } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import {
  useGetMyHaulerProfile,
  useListJobs,
  useUpdateJob,
  setAuthTokenGetter,
} from "@workspace/api-client-react";
import { useEffect } from "react";

const STATUS_FLOW = ["confirmed", "dispatched", "en_route", "arrived", "completed"];
const STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmed",
  dispatched: "Dispatched",
  en_route: "En Route",
  arrived: "Arrived",
  completed: "Completed",
};
const STATUS_COLORS: Record<string, string> = {
  confirmed: "#3b82f6",
  dispatched: "#f59e0b",
  en_route: "#ff6600",
  arrived: "#22c55e",
  completed: "#6b7280",
};

export default function HaulerDashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { getToken, isSignedIn } = useAuth();

  useEffect(() => {
    setAuthTokenGetter(() => getToken());
  }, [getToken]);

  const { data: haulerProfile, isLoading: profileLoading } = useGetMyHaulerProfile({
    query: { enabled: !!isSignedIn } as any,
  });

  // @ts-ignore
  const haulerId = haulerProfile?.id;

  const {
    data: jobs,
    isLoading: jobsLoading,
    refetch,
    isRefetching,
  } = useListJobs(
    // @ts-ignore
    { haulerId },
    { query: { enabled: !!haulerId, refetchInterval: 10000 } as any }
  );

  const { mutateAsync: updateJob, isPending: updating } = useUpdateJob();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const handleUpdateStatus = async (jobId: string, currentStatus: string) => {
    const idx = STATUS_FLOW.indexOf(currentStatus);
    if (idx < 0 || idx >= STATUS_FLOW.length - 1) return;
    const nextStatus = STATUS_FLOW[idx + 1];
    Alert.alert(
      "Update status",
      `Mark job as "${STATUS_LABELS[nextStatus]}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              // @ts-ignore
              await updateJob({ id: jobId, data: { status: nextStatus } });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              refetch();
            } catch {
              Alert.alert("Error", "Failed to update status");
            }
          },
        },
      ]
    );
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingTop: topPad + 12,
      paddingHorizontal: 20,
      paddingBottom: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.background,
    },
    backBtn: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    headerTitle: {
      fontSize: 20,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      flex: 1,
    },
    list: { padding: 16, paddingBottom: bottomPad + 20 },
    jobCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 8,
      overflow: "hidden",
    },
    jobCardExpanded: { borderColor: colors.primary },
    jobCardTop: {
      padding: 16,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
    },
    statusDot: { width: 10, height: 10, marginTop: 5 },
    jobCardContent: { flex: 1 },
    jobNum: {
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
      letterSpacing: 1,
      marginBottom: 2,
    },
    jobAddress: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
      marginBottom: 2,
    },
    jobCustomer: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    statusText: {
      fontSize: 11,
      fontFamily: "Inter_700Bold",
      letterSpacing: 0.5,
    },
    jobDetail: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      padding: 16,
      gap: 10,
    },
    detailRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    detailText: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
      flex: 1,
    },
    nextBtn: {
      backgroundColor: colors.primary,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 4,
    },
    nextBtnText: {
      fontSize: 14,
      fontFamily: "Inter_700Bold",
      color: colors.primaryForeground,
      letterSpacing: 0.5,
    },
    completedBadge: {
      paddingVertical: 14,
      alignItems: "center",
      backgroundColor: colors.muted,
      marginTop: 4,
    },
    completedText: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
    },
    empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 40 },
    emptyText: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.mutedForeground, textAlign: "center" },
    loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  });

  if (profileLoading || (jobsLoading && !jobs)) {
    return (
      <View style={[styles.container, styles.loading]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const jobList = (jobs as any[]) || [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color={colors.foreground} />
        </Pressable>
        <Text style={styles.headerTitle}>My Jobs</Text>
        <Feather name="truck" size={22} color={colors.primary} />
      </View>

      <FlatList
        data={jobList}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Feather name="inbox" size={40} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>No jobs assigned</Text>
            <Text style={styles.emptySub}>Jobs assigned to you will appear here</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const isExpanded = selectedJobId === item.id;
          const statusColor = STATUS_COLORS[item.status] || colors.mutedForeground;
          const canAdvance = STATUS_FLOW.indexOf(item.status) < STATUS_FLOW.length - 1;

          return (
            <Pressable
              style={[styles.jobCard, isExpanded && styles.jobCardExpanded]}
              onPress={() => setSelectedJobId(isExpanded ? null : item.id)}
            >
              <View style={styles.jobCardTop}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <View style={styles.jobCardContent}>
                  <Text style={styles.jobNum}>{item.jobNumber}</Text>
                  <Text style={styles.jobAddress} numberOfLines={2}>{item.address}</Text>
                  {item.customerName && <Text style={styles.jobCustomer}>{item.customerName}</Text>}
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}>
                  <Text style={[styles.statusText, { color: statusColor }]}>
                    {STATUS_LABELS[item.status] || item.status}
                  </Text>
                </View>
              </View>

              {isExpanded && (
                <View style={styles.jobDetail}>
                  {item.scheduledDate && (
                    <View style={styles.detailRow}>
                      <Feather name="calendar" size={15} color={colors.mutedForeground} />
                      <Text style={styles.detailText}>
                        {item.scheduledDate} {item.scheduledTime ? `at ${item.scheduledTime}` : ""}
                      </Text>
                    </View>
                  )}
                  {item.customerPhone && (
                    <View style={styles.detailRow}>
                      <Feather name="phone" size={15} color={colors.mutedForeground} />
                      <Text style={styles.detailText}>{item.customerPhone}</Text>
                    </View>
                  )}
                  {item.priceCents && (
                    <View style={styles.detailRow}>
                      <Feather name="dollar-sign" size={15} color={colors.mutedForeground} />
                      <Text style={styles.detailText}>${(item.priceCents / 100).toFixed(0)}</Text>
                    </View>
                  )}
                  {item.description && (
                    <View style={styles.detailRow}>
                      <Feather name="file-text" size={15} color={colors.mutedForeground} />
                      <Text style={styles.detailText}>{item.description}</Text>
                    </View>
                  )}
                  {canAdvance ? (
                    <Pressable
                      style={({ pressed }) => [styles.nextBtn, pressed && { opacity: 0.85 }, updating && { opacity: 0.5 }]}
                      onPress={() => handleUpdateStatus(item.id, item.status)}
                      disabled={updating}
                    >
                      {updating ? (
                        <ActivityIndicator color={colors.primaryForeground} size="small" />
                      ) : (
                        <Text style={styles.nextBtnText}>
                          MARK AS {STATUS_LABELS[STATUS_FLOW[STATUS_FLOW.indexOf(item.status) + 1]]?.toUpperCase()}
                        </Text>
                      )}
                    </Pressable>
                  ) : (
                    <View style={styles.completedBadge}>
                      <Text style={styles.completedText}>Job complete</Text>
                    </View>
                  )}
                </View>
              )}
            </Pressable>
          );
        }}
      />
    </View>
  );
}
