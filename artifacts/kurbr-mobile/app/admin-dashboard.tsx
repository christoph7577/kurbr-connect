import { useAuth } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
  useGetJobStats,
  useListJobs,
  setAuthTokenGetter,
} from "@workspace/api-client-react";

const STATUS_COLORS: Record<string, string> = {
  confirmed: "#3b82f6",
  dispatched: "#f59e0b",
  en_route: "#ff6600",
  arrived: "#22c55e",
  completed: "#6b7280",
  cancelled: "#ef4444",
};

export default function AdminDashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { getToken } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  useEffect(() => {
    setAuthTokenGetter(() => getToken());
  }, [getToken]);

  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useGetJobStats({ query: { refetchInterval: 10000 } as any });

  const {
    data: jobs,
    isLoading: jobsLoading,
    refetch: refetchJobs,
    isRefetching,
  } = useListJobs(
    // @ts-ignore
    statusFilter ? { status: statusFilter } : {},
    { query: { refetchInterval: 10000 } as any }
  );

  const refetch = () => { refetchStats(); refetchJobs(); };

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

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
    statsRow: {
      flexDirection: "row",
      gap: 8,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 8,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      alignItems: "center",
    },
    statValue: {
      fontSize: 24,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      marginBottom: 2,
    },
    statLabel: {
      fontSize: 10,
      fontFamily: "Inter_500Medium",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      textAlign: "center",
    },
    filterRow: {
      flexDirection: "row",
      paddingHorizontal: 16,
      paddingBottom: 12,
      gap: 6,
    },
    filterChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    filterChipActive: { borderColor: colors.primary, backgroundColor: colors.primary + "15" },
    filterChipText: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
      color: colors.mutedForeground,
    },
    filterChipTextActive: { color: colors.primary },
    list: { paddingHorizontal: 16, paddingBottom: bottomPad + 20 },
    jobCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 6,
      padding: 14,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
    },
    statusDot: { width: 8, height: 8, marginTop: 6 },
    jobContent: { flex: 1 },
    jobNum: {
      fontSize: 10,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
      letterSpacing: 1,
      marginBottom: 2,
    },
    jobAddress: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
      marginBottom: 2,
    },
    jobMeta: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 3 },
    statusText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
    loading: { flex: 1, alignItems: "center", justifyContent: "center" },
    empty: { padding: 40, alignItems: "center", gap: 10 },
    emptyText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    emptySub: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground },
  });

  const FILTERS = [null, "confirmed", "dispatched", "en_route", "arrived", "completed"];
  const FILTER_LABELS: Record<string, string> = {
    confirmed: "Confirmed",
    dispatched: "Dispatched",
    en_route: "En Route",
    arrived: "Arrived",
    completed: "Done",
  };

  const jobList = (jobs as any[]) || [];
  // @ts-ignore
  const statsData = stats as any;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color={colors.foreground} />
        </Pressable>
        <Text style={styles.headerTitle}>Admin</Text>
        <Feather name="grid" size={22} color={colors.primary} />
      </View>

      {statsLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
      ) : statsData ? (
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{statsData.active ?? 0}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: "#f59e0b" }]}>{statsData.unassigned ?? 0}</Text>
            <Text style={styles.statLabel}>Unassigned</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: "#22c55e" }]}>{statsData.completed ?? 0}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>${Math.round((statsData.todayRevenueCents ?? 0) / 100)}</Text>
            <Text style={styles.statLabel}>Revenue</Text>
          </View>
        </View>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
        <View style={styles.filterRow}>
          {FILTERS.map((f) => (
            <Pressable
              key={f ?? "all"}
              style={[styles.filterChip, statusFilter === f && styles.filterChipActive]}
              onPress={() => setStatusFilter(f)}
            >
              <Text style={[styles.filterChipText, statusFilter === f && styles.filterChipTextActive]}>
                {f === null ? "All" : FILTER_LABELS[f] || f}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <FlatList
        data={jobList}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
        }
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Feather name="inbox" size={36} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>No jobs found</Text>
            <Text style={styles.emptySub}>Try changing the filter</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const statusColor = STATUS_COLORS[item.status] || colors.mutedForeground;
          return (
            <View style={styles.jobCard}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <View style={styles.jobContent}>
                <Text style={styles.jobNum}>{item.jobNumber}</Text>
                <Text style={styles.jobAddress} numberOfLines={1}>{item.address}</Text>
                <Text style={styles.jobMeta}>
                  {item.customerName || "Unknown"} {item.haulerId ? "· Assigned" : "· Unassigned"}
                  {item.priceCents ? ` · $${(item.priceCents / 100).toFixed(0)}` : ""}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}>
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {item.status?.replace("_", " ").toUpperCase()}
                </Text>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}
