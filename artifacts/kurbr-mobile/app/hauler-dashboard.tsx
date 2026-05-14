import { useAuth } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import React, { useState, useEffect, useRef } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import {
  useGetMyHaulerProfile,
  getGetMyHaulerProfileQueryKey,
  useListJobs,
  getListJobsQueryKey,
  useUpdateJob,
  setAuthTokenGetter,
  type Hauler,
  type Job,
} from "@workspace/api-client-react";

interface MapPreviewProps {
  address: string;
  lat: number | null | undefined;
  lng: number | null | undefined;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}

function MapPreview({ address, lat, lng, onPress, colors }: MapPreviewProps) {
  const hasCoords = lat != null && lng != null;
  const mapUrl = hasCoords
    ? `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=14&size=600x180&markers=${lat},${lng},ltblu`
    : null;
  const [imgError, setImgError] = useState(false);

  if (!hasCoords || !mapUrl || imgError) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
          height: 110,
          backgroundColor: colors.muted,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          marginBottom: 8,
          opacity: pressed ? 0.75 : 1,
        })}
      >
        <Feather name="map-pin" size={22} color={colors.mutedForeground} />
        <Text
          style={{
            fontSize: 12,
            fontFamily: "Inter_400Regular",
            color: colors.mutedForeground,
            textAlign: "center",
            paddingHorizontal: 16,
          }}
          numberOfLines={2}
        >
          {address}
        </Text>
        <Text
          style={{
            fontSize: 11,
            fontFamily: "Inter_600SemiBold",
            color: colors.primary,
            letterSpacing: 0.5,
          }}
        >
          TAP TO NAVIGATE
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        height: 130,
        marginBottom: 8,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: colors.border,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Image
        source={{ uri: mapUrl }}
        style={{ width: "100%", height: "100%" }}
        contentFit="cover"
        transition={300}
        cachePolicy="memory-disk"
        onError={() => setImgError(true)}
      />
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "rgba(0,0,0,0.45)",
          paddingVertical: 5,
          paddingHorizontal: 10,
          flexDirection: "row",
          alignItems: "center",
          gap: 5,
        }}
      >
        <Feather name="navigation" size={12} color="#fff" />
        <Text
          style={{
            fontSize: 11,
            fontFamily: "Inter_600SemiBold",
            color: "#fff",
            letterSpacing: 0.5,
            flex: 1,
          }}
          numberOfLines={1}
        >
          {address}
        </Text>
        <Text
          style={{
            fontSize: 10,
            fontFamily: "Inter_600SemiBold",
            color: "#ff6600",
            letterSpacing: 0.5,
          }}
        >
          TAP TO NAVIGATE
        </Text>
      </View>
    </Pressable>
  );
}

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

type Tab = "jobs" | "earnings";

export default function HaulerDashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { getToken, isSignedIn } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("jobs");
  const longPressActivated = useRef(false);

  useEffect(() => {
    setAuthTokenGetter(() => getToken());
  }, [getToken]);

  const { data: haulerProfile, isLoading: profileLoading } =
    useGetMyHaulerProfile({
      query: {
        queryKey: getGetMyHaulerProfileQueryKey(),
        enabled: !!isSignedIn,
      },
    });

  const haulerId = haulerProfile?.id;
  const listParams = haulerId ? { haulerId } : undefined;

  const {
    data: jobs,
    isLoading: jobsLoading,
    refetch,
    isRefetching,
  } = useListJobs(listParams, {
    query: {
      queryKey: getListJobsQueryKey(listParams),
      enabled: !!haulerId,
      refetchInterval: 10000,
    },
  });

  const { mutateAsync: updateJob, isPending: updating } = useUpdateJob();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const normalizePhone = (phone: string) => phone.replace(/\s+/g, "").trim();

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${normalizePhone(phone)}`).catch(() => {
      Alert.alert("Cannot place call", "Unable to open the phone dialer on this device.");
    });
  };

  const handleText = (phone: string) => {
    Linking.openURL(`sms:${normalizePhone(phone)}`).catch(() => {
      Alert.alert("Cannot open messages", "Unable to open the SMS app on this device.");
    });
  };

  const handleLongPress = (item: Job) => {
    if (!item.customerPhone) return;
    if (selectedJobId === item.id) return;
    longPressActivated.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const name = item.customerName ?? "Customer";
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: name,
          message: item.customerPhone,
          options: ["Cancel", "Call", "Text"],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) handleCall(item.customerPhone!);
          if (buttonIndex === 2) handleText(item.customerPhone!);
        }
      );
    } else {
      Alert.alert(name, item.customerPhone, [
        { text: "Cancel", style: "cancel" },
        { text: "Call", onPress: () => handleCall(item.customerPhone!) },
        { text: "Text", onPress: () => handleText(item.customerPhone!) },
      ]);
    }
  };

  const handleNavigate = (address: string) => {
    const encoded = encodeURIComponent(address);
    const fallback = `https://maps.google.com/?q=${encoded}`;
    let url: string;
    if (Platform.OS === "ios") {
      url = `maps://?q=${encoded}`;
    } else if (Platform.OS === "android") {
      url = `geo:0,0?q=${encoded}`;
    } else {
      url = fallback;
    }
    Linking.openURL(url).catch(() => {
      Linking.openURL(fallback).catch(() => {
        Alert.alert("Cannot open maps", "Unable to launch a maps app on this device.");
      });
    });
  };

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

  const jobList: Job[] = jobs ?? [];
  const completedJobs = jobList.filter((j) => j.status === "completed");
  const activeJobs = jobList.filter((j) => j.status !== "completed");

  const totalEarningsCents = completedJobs.reduce(
    (sum, j) => sum + (j.priceCents ?? 0),
    0
  );

  const now = new Date();
  const thisMonthJobs = completedJobs.filter((j) => {
    const dateStr = j.updatedAt ?? j.scheduledDate;
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const thisMonthEarningsCents = thisMonthJobs.reduce(
    (sum, j) => sum + (j.priceCents ?? 0),
    0
  );

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
    tabBar: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.background,
    },
    tabBtn: {
      flex: 1,
      paddingVertical: 14,
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "center",
      gap: 6,
    },
    tabBtnActive: {
      borderBottomWidth: 2,
      borderBottomColor: colors.primary,
    },
    tabText: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
    },
    tabTextActive: { color: colors.primary },
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
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4 },
    statusText: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
    jobDetail: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      padding: 16,
      gap: 10,
    },
    detailRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    detailText: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
      flex: 1,
    },
    navigateBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      borderWidth: 1,
      borderColor: colors.primary,
      paddingVertical: 12,
      marginTop: 4,
    },
    navigateBtnText: {
      fontSize: 14,
      fontFamily: "Inter_700Bold",
      color: colors.primary,
      letterSpacing: 0.5,
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
    empty: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      padding: 40,
    },
    emptyText: {
      fontSize: 18,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
    },
    emptySub: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      textAlign: "center",
    },
    loading: { flex: 1, alignItems: "center", justifyContent: "center" },
    earningsScroll: { padding: 16, paddingBottom: bottomPad + 40 },
    statRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
    statCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
    },
    statLabel: {
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 1,
      marginBottom: 8,
    },
    statValue: {
      fontSize: 26,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      letterSpacing: -1,
    },
    statValueAccent: { color: colors.primary },
    statSub: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginTop: 4,
    },
    sectionLabel: {
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 1.5,
      marginTop: 24,
      marginBottom: 12,
    },
    earningsJobCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 6,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    earningsJobContent: { flex: 1 },
    earningsJobNum: {
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
      letterSpacing: 1,
      marginBottom: 2,
    },
    earningsJobAddress: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
      marginBottom: 2,
    },
    earningsJobDate: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
    earningsJobPrice: {
      fontSize: 18,
      fontFamily: "Inter_700Bold",
      color: colors.primary,
    },
    earningsEmptyCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 32,
      alignItems: "center",
      gap: 12,
    },
    earningsEmptyText: {
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
    },
    earningsEmptySub: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      textAlign: "center",
    },
    contactBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 4,
    },
    callBtn: {
      backgroundColor: "#22c55e",
    },
    textBtn: {
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: "transparent",
    },
    contactBtnText: {
      fontSize: 12,
      fontFamily: "Inter_700Bold",
      color: "#fff",
      letterSpacing: 0.3,
    },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: 4 },
    totalCard: {
      backgroundColor: colors.primary + "15",
      borderWidth: 1,
      borderColor: colors.primary + "40",
      padding: 20,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    totalLabel: { fontSize: 15, fontFamily: "Inter_700Bold", color: colors.foreground },
    totalValue: {
      fontSize: 28,
      fontFamily: "Inter_700Bold",
      color: colors.primary,
      letterSpacing: -1,
    },
  });

  if (profileLoading || (jobsLoading && !jobs)) {
    return (
      <View style={[styles.container, styles.loading]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const renderJobCard = ({ item }: { item: Job }) => {
    const isExpanded = selectedJobId === item.id;
    const statusColor = STATUS_COLORS[item.status] ?? colors.mutedForeground;
    const canAdvance = STATUS_FLOW.indexOf(item.status) < STATUS_FLOW.length - 1;
    const nextStatus = STATUS_FLOW[STATUS_FLOW.indexOf(item.status) + 1];

    return (
      <Pressable
        style={[styles.jobCard, isExpanded && styles.jobCardExpanded]}
        onPress={() => {
          if (longPressActivated.current) {
            longPressActivated.current = false;
            return;
          }
          setSelectedJobId(isExpanded ? null : item.id);
        }}
        onLongPress={() => handleLongPress(item)}
        delayLongPress={350}
      >
        <View style={styles.jobCardTop}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <View style={styles.jobCardContent}>
            <Text style={styles.jobNum}>{item.jobNumber}</Text>
            <Text style={styles.jobAddress} numberOfLines={2}>{item.address}</Text>
            {item.customerName && (
              <Text style={styles.jobCustomer}>{item.customerName}</Text>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {STATUS_LABELS[item.status] ?? item.status}
            </Text>
          </View>
        </View>

        {isExpanded && (
          <View style={styles.jobDetail}>
            {item.scheduledDate && (
              <View style={styles.detailRow}>
                <Feather name="calendar" size={15} color={colors.mutedForeground} />
                <Text style={styles.detailText}>
                  {item.scheduledDate}
                  {item.scheduledTime ? ` at ${item.scheduledTime}` : ""}
                </Text>
              </View>
            )}
            {item.customerPhone && (
              <View style={styles.detailRow}>
                <Feather name="phone" size={15} color={colors.mutedForeground} />
                <Text style={styles.detailText}>{item.customerPhone}</Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.contactBtn,
                    styles.callBtn,
                    pressed && { opacity: 0.75 },
                  ]}
                  onPress={() => handleCall(item.customerPhone!)}
                >
                  <Feather name="phone-call" size={13} color="#fff" />
                  <Text style={styles.contactBtnText}>Call</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.contactBtn,
                    styles.textBtn,
                    pressed && { opacity: 0.75 },
                  ]}
                  onPress={() => handleText(item.customerPhone!)}
                >
                  <Feather name="message-square" size={13} color={colors.primary} />
                  <Text style={[styles.contactBtnText, { color: colors.primary }]}>Text</Text>
                </Pressable>
              </View>
            )}
            {item.priceCents != null && (
              <View style={styles.detailRow}>
                <Feather name="dollar-sign" size={15} color={colors.mutedForeground} />
                <Text style={styles.detailText}>
                  ${(item.priceCents / 100).toFixed(0)}
                </Text>
              </View>
            )}
            {item.description && (
              <View style={styles.detailRow}>
                <Feather name="file-text" size={15} color={colors.mutedForeground} />
                <Text style={styles.detailText}>{item.description}</Text>
              </View>
            )}
            {item.address && (
              <>
                <MapPreview
                  address={item.address}
                  lat={item.addressLat}
                  lng={item.addressLng}
                  onPress={() => handleNavigate(item.address!)}
                  colors={colors}
                />
                <Pressable
                  style={({ pressed }) => [
                    styles.navigateBtn,
                    pressed && { opacity: 0.75 },
                  ]}
                  onPress={() => handleNavigate(item.address!)}
                >
                  <Feather name="navigation" size={15} color={colors.primary} />
                  <Text style={styles.navigateBtnText}>NAVIGATE</Text>
                </Pressable>
              </>
            )}
            {canAdvance && nextStatus ? (
              <Pressable
                style={({ pressed }) => [
                  styles.nextBtn,
                  pressed && { opacity: 0.85 },
                  updating && { opacity: 0.5 },
                ]}
                onPress={() => handleUpdateStatus(item.id, item.status)}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator color={colors.primaryForeground} size="small" />
                ) : (
                  <Text style={styles.nextBtnText}>
                    MARK AS {STATUS_LABELS[nextStatus]?.toUpperCase()}
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
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color={colors.foreground} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {activeTab === "jobs" ? "My Jobs" : "Earnings"}
        </Text>
        <Feather name="truck" size={22} color={colors.primary} />
      </View>

      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tabBtn, activeTab === "jobs" && styles.tabBtnActive]}
          onPress={() => setActiveTab("jobs")}
        >
          <Feather
            name="briefcase"
            size={16}
            color={activeTab === "jobs" ? colors.primary : colors.mutedForeground}
          />
          <Text style={[styles.tabText, activeTab === "jobs" && styles.tabTextActive]}>
            Jobs{activeJobs.length > 0 ? ` (${activeJobs.length})` : ""}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabBtn, activeTab === "earnings" && styles.tabBtnActive]}
          onPress={() => setActiveTab("earnings")}
        >
          <Feather
            name="dollar-sign"
            size={16}
            color={activeTab === "earnings" ? colors.primary : colors.mutedForeground}
          />
          <Text style={[styles.tabText, activeTab === "earnings" && styles.tabTextActive]}>
            Earnings
          </Text>
        </Pressable>
      </View>

      {activeTab === "jobs" ? (
        <FlatList
          data={jobList}
          keyExtractor={(item) => item.id}
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
          renderItem={renderJobCard}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.earningsScroll}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
        >
          <View style={styles.statRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total earned</Text>
              <Text style={[styles.statValue, styles.statValueAccent]}>
                ${(totalEarningsCents / 100).toFixed(0)}
              </Text>
              <Text style={styles.statSub}>
                {completedJobs.length} job{completedJobs.length !== 1 ? "s" : ""} completed
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>This month</Text>
              <Text style={styles.statValue}>
                ${(thisMonthEarningsCents / 100).toFixed(0)}
              </Text>
              <Text style={styles.statSub}>
                {thisMonthJobs.length} job{thisMonthJobs.length !== 1 ? "s" : ""}
              </Text>
            </View>
          </View>

          <View style={styles.statRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Active jobs</Text>
              <Text style={styles.statValue}>{activeJobs.length}</Text>
              <Text style={styles.statSub}>in progress</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Avg. per job</Text>
              <Text style={styles.statValue}>
                $
                {completedJobs.length > 0
                  ? (totalEarningsCents / completedJobs.length / 100).toFixed(0)
                  : "0"}
              </Text>
              <Text style={styles.statSub}>all time</Text>
            </View>
          </View>

          <Text style={styles.sectionLabel}>Completed jobs</Text>

          {completedJobs.length === 0 ? (
            <View style={styles.earningsEmptyCard}>
              <Feather name="dollar-sign" size={32} color={colors.mutedForeground} />
              <Text style={styles.earningsEmptyText}>No completed jobs yet</Text>
              <Text style={styles.earningsEmptySub}>
                Complete jobs to see your earnings here
              </Text>
            </View>
          ) : (
            <>
              {completedJobs.map((job) => (
                <View key={job.id} style={styles.earningsJobCard}>
                  <View style={styles.earningsJobContent}>
                    <Text style={styles.earningsJobNum}>{job.jobNumber}</Text>
                    <Text style={styles.earningsJobAddress} numberOfLines={1}>
                      {job.address}
                    </Text>
                    {job.scheduledDate && (
                      <Text style={styles.earningsJobDate}>
                        {job.scheduledDate}
                        {job.scheduledTime ? ` · ${job.scheduledTime}` : ""}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.earningsJobPrice}>
                    ${((job.priceCents ?? 0) / 100).toFixed(0)}
                  </Text>
                </View>
              ))}
              <View style={styles.divider} />
              <View style={styles.totalCard}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>
                  ${(totalEarningsCents / 100).toFixed(0)}
                </Text>
              </View>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}
