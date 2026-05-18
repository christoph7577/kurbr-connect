import { useState, useEffect, useCallback, useRef } from "react";
import { Search, Bell, Menu, Loader2, Download, TrendingUp, ExternalLink, CheckCircle, Mail, Trash2, Trash } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { AdminSidebar, type AdminView } from "@/components/admin/AdminSidebar";
import { JobQueue, type Job, type AiEstimate } from "@/components/admin/JobQueue";
import { JobDetail } from "@/components/admin/JobDetail";
import { HaulerManagement } from "@/components/admin/HaulerManagement";
import { apiGet, apiPatch, apiDelete } from "@/lib/apiClient";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";

const springBolt = { type: "spring" as const, stiffness: 400, damping: 30 };

interface JobStats {
  total: number;
  active: number;
  unassigned: number;
  completed: number;
  todayRevenueCents: number;
  totalRevenueCents: number;
  activeHaulers: number;
  jobsToday: number;
  dailyRevenue: Array<{ date: string; totalCents: number }>;
}

const STATUS_FILTERS = ["all", "pending", "confirmed", "dispatched", "en_route", "arrived", "completed", "cancelled"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const mapJob = (j: Record<string, unknown>): Job => ({
  id: j["jobNumber"] as string,
  dbId: j["id"] as string,
  customer: (j["customerName"] as string) || "Unknown",
  address: j["address"] as string,
  status: j["status"] as string,
  hauler: j["haulerId"] ? "Assigned" : "Unassigned",
  haulerId: (j["haulerId"] as string) || null,
  eta: (j["scheduledTime"] as string) || "—",
  price: j["priceCents"] ? `$${((j["priceCents"] as number) / 100).toFixed(0)}` : "—",
  priceCents: (j["priceCents"] as number) || null,
  description: (j["description"] as string) || null,
  customerEmail: (j["customerEmail"] as string) || null,
  customerPhone: (j["customerPhone"] as string) || null,
  scheduledDate: (j["scheduledDate"] as string) || null,
  photos: Array.isArray(j["photos"]) ? (j["photos"] as string[]) : null,
  aiEstimate: j["aiEstimate"] && typeof j["aiEstimate"] === "object"
    ? (j["aiEstimate"] as AiEstimate)
    : null,
});

function exportCsv(jobs: Job[]) {
  const headers = ["Job #", "Customer", "Address", "Status", "Hauler", "Date", "Time", "Price", "Email", "Phone"];
  const rows = jobs.map((j) => [
    j.id, j.customer, j.address, j.status,
    j.hauler, j.scheduledDate || "", j.eta,
    j.priceCents ? (j.priceCents / 100).toFixed(2) : "",
    j.customerEmail || "", j.customerPhone || "",
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `kurbr-jobs-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const AdminPage = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState<AdminView>(() => {
    const view = new URLSearchParams(window.location.search).get("view") as AdminView;
    return ["dashboard", "haulers"].includes(view) ? view : "dashboard";
  });
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<JobStats | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showChart, setShowChart] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [clearing, setClearing] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showNotifications) return;
    const onClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [showNotifications]);

  const fetchJobs = useCallback(async () => {
    try {
      const [data, statsData] = await Promise.all([
        apiGet<Record<string, unknown>[]>("/jobs"),
        apiGet<JobStats>("/jobs/stats"),
      ]);
      const mapped = data.map(mapJob);
      setJobs(mapped);
      setStats(statsData);
      if (selectedJob) {
        const updated = mapped.find((j) => j.dbId === selectedJob.dbId);
        if (updated) setSelectedJob(updated);
      } else if (mapped.length > 0) {
        setSelectedJob(mapped[0]);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [selectedJob?.dbId]);

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectJob = (job: Job) => {
    setSelectedJob(job);
    setShowDetail(true);
  };

  const handleMarkComplete = async (job: Job) => {
    try {
      await apiPatch(`/jobs/${job.dbId}`, { status: "completed" });
      toast.success(`${job.id} marked complete`);
      await fetchJobs();
    } catch {
      toast.error("Failed to update");
    }
  };

  const handleDeleteJob = async (job: Job) => {
    if (!window.confirm(`Permanently delete ${job.id}? This cannot be undone.`)) return;
    try {
      await apiDelete(`/jobs/${job.dbId}`);
      toast.success(`${job.id} deleted`);
      if (selectedJob?.dbId === job.dbId) {
        setSelectedJob(null);
        setShowDetail(false);
      }
      await fetchJobs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete job");
    }
  };

  const handleClearAllJobs = async () => {
    const count = jobs.length;
    if (count === 0) { toast.info("No jobs to clear"); return; }
    if (!window.confirm(`Permanently delete ALL ${count} jobs? This cannot be undone — use only for testing.`)) return;
    if (!window.confirm(`Final confirmation: wipe ${count} jobs?`)) return;
    setClearing(true);
    try {
      const { deletedCount } = await apiDelete<{ deletedCount: number }>("/jobs");
      toast.success(`Cleared ${deletedCount} jobs`);
      setSelectedJob(null);
      setShowDetail(false);
      await fetchJobs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to clear jobs");
    }
    setClearing(false);
  };

  const filteredJobs = jobs.filter((j) => {
    const matchesStatus = statusFilter === "all" || j.status === statusFilter;
    const matchesSearch = !searchQuery || (
      j.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.address.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return matchesStatus && matchesSearch;
  });

  const chartData = (stats?.dailyRevenue ?? [])
    .map((d) => ({
      date: d.date.slice(5),
      revenue: d.totalCents / 100,
    }));

  const unassignedJobs = jobs.filter((j) => j.hauler === "Unassigned" && !["completed", "cancelled"].includes(j.status));
  const unassignedCount = unassignedJobs.length;

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} activeView={activeView} onChangeView={setActiveView} />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 md:h-16 border-b border-border flex items-center justify-between px-4 md:px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden">
              <Menu className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                placeholder="Search jobs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-secondary pl-10 pr-4 py-2 text-sm font-mono outline-none focus:ring-1 focus:ring-primary w-64"
              />
            </div>
            <span className="md:hidden text-lg font-bold tracking-[-0.06em]">KURBR<span className="text-primary">.</span></span>
          </div>
          <div className="flex items-center gap-3 md:gap-4">
            <button
              onClick={() => exportCsv(filteredJobs)}
              className="hidden md:flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button
              onClick={() => setShowChart((v) => !v)}
              className={`hidden md:flex items-center gap-2 text-xs font-mono uppercase tracking-widest transition-colors ${showChart ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              <TrendingUp className="w-4 h-4" /> Revenue
            </button>
            <button
              onClick={handleClearAllJobs}
              disabled={clearing || jobs.length === 0}
              className="hidden md:flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40 disabled:hover:text-muted-foreground"
              title="Delete all jobs (testing)"
            >
              {clearing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Clear All
            </button>
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifications((v) => !v)}
                className="relative p-1 hover:bg-secondary/50 rounded transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5 text-muted-foreground" />
                {unassignedCount > 0 && <div className="absolute top-0 right-0 w-2 h-2 bg-primary rounded-full" />}
              </button>
              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 z-50 bg-card border-milled shadow-card w-80 max-h-[400px] overflow-y-auto">
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <span className="text-xs font-mono uppercase tracking-widest">Unassigned Jobs</span>
                    <span className="text-xs font-mono text-primary">{unassignedCount}</span>
                  </div>
                  {unassignedCount === 0 ? (
                    <div className="p-6 text-center text-xs font-mono text-muted-foreground">All caught up.</div>
                  ) : (
                    unassignedJobs.slice(0, 10).map((j) => (
                      <button
                        key={j.dbId}
                        onClick={() => { setShowNotifications(false); handleSelectJob(j); }}
                        className="w-full text-left px-4 py-3 hover:bg-secondary/50 border-b border-border last:border-b-0 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-xs font-bold">{j.id}</span>
                          <span className="text-[10px] font-mono uppercase text-primary">{j.status.replace("_", " ")}</span>
                        </div>
                        <p className="text-xs text-foreground truncate">{j.customer}</p>
                        <p className="text-[10px] text-muted-foreground font-mono truncate">{j.address}</p>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <ThemeToggle />
            <div className="w-8 h-8 bg-secondary flex items-center justify-center text-xs font-mono font-bold">CC</div>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-6 overflow-auto">
          {activeView === "haulers" ? (
            <HaulerManagement />
          ) : loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Stats Grid */}
              {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
                  {[
                    { label: "Total Jobs", value: stats.total, mono: stats.total.toString() },
                    { label: "Jobs Today", value: stats.jobsToday, mono: stats.jobsToday.toString() },
                    { label: "Active Haulers", value: stats.activeHaulers, mono: stats.activeHaulers.toString() },
                    {
                      label: "Revenue",
                      value: stats.totalRevenueCents,
                      mono: `$${(stats.totalRevenueCents / 100).toLocaleString()}`,
                    },
                  ].map((s, i) => (
                    <motion.div
                      key={s.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...springBolt, delay: i * 0.05 }}
                      className="border-milled p-4 md:p-5"
                    >
                      <p className="text-xl md:text-2xl font-mono font-bold">{s.mono}</p>
                      <p className="text-[10px] md:text-xs uppercase tracking-widest text-muted-foreground mt-1">{s.label}</p>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Revenue Chart */}
              {showChart && chartData.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="border-milled p-4 mb-6"
                >
                  <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4 font-mono">Revenue — Last 30 Days</p>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <XAxis dataKey="date" tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 0, fontFamily: "var(--font-mono)", fontSize: 12 }}
                        formatter={(v: number) => [`$${v.toFixed(0)}`, "Revenue"]}
                        labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                        cursor={{ fill: "hsl(var(--secondary))" }}
                      />
                      <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={0} />
                    </BarChart>
                  </ResponsiveContainer>
                </motion.div>
              )}

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-4 scrollbar-none">
                {STATUS_FILTERS.map((s) => {
                  const count = s === "all" ? jobs.length : jobs.filter((j) => j.status === s).length;
                  return (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={`flex-none px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest transition-colors whitespace-nowrap ${
                        statusFilter === s
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {s} ({count})
                    </button>
                  );
                })}
                <button
                  onClick={() => exportCsv(filteredJobs)}
                  className="md:hidden flex-none ml-auto flex items-center gap-1 px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest bg-secondary text-muted-foreground"
                >
                  <Download className="w-3 h-3" /> CSV
                </button>
              </div>

              {/* Mobile view */}
              <div className="md:hidden">
                {showDetail && selectedJob ? (
                  <div>
                    <button onClick={() => setShowDetail(false)} className="text-xs uppercase tracking-widest text-primary font-mono mb-4 flex items-center gap-1">
                      ← Back to queue
                    </button>
                    <JobDetail job={selectedJob} onUpdate={fetchJobs} onDelete={() => { setSelectedJob(null); setShowDetail(false); }} />
                  </div>
                ) : (
                  <JobQueue jobs={filteredJobs} selectedJob={selectedJob} onSelectJob={handleSelectJob} onMarkComplete={handleMarkComplete} onDeleteJob={handleDeleteJob} />
                )}
              </div>

              {/* Desktop view */}
              <div className="hidden md:grid grid-cols-3 gap-6">
                <div className="col-span-2">
                  {/* Quick action table */}
                  {filteredJobs.length > 0 ? (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono">{filteredJobs.length} jobs</p>
                      </div>
                      <div className="border-milled divide-y divide-border">
                        {filteredJobs.slice(0, 30).map((job) => (
                          <div
                            key={job.dbId}
                            className={`flex items-center justify-between p-3 group cursor-pointer hover:bg-secondary/20 transition-colors ${selectedJob?.dbId === job.dbId ? "bg-secondary/20" : ""}`}
                            onClick={() => handleSelectJob(job)}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="font-mono text-xs font-bold w-24 shrink-0">{job.id}</span>
                              <span className="text-sm truncate">{job.customer}</span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="font-mono text-xs text-primary">{job.price}</span>
                              <span className={`text-[10px] font-mono uppercase px-2 py-0.5 ${
                                job.status === "completed" ? "bg-green-500/20 text-green-500" :
                                job.status === "cancelled" ? "bg-destructive/20 text-destructive" :
                                job.status.includes("route") || job.status === "dispatched" ? "bg-primary/20 text-primary" :
                                "bg-secondary text-muted-foreground"
                              }`}>
                                {job.status.replace("_", " ")}
                              </span>
                              {/* Quick actions */}
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {job.customerEmail && (
                                  <a
                                    href={`mailto:${job.customerEmail}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-1 hover:bg-secondary rounded transition-colors"
                                    title="Email customer"
                                  >
                                    <Mail className="w-3 h-3 text-muted-foreground" />
                                  </a>
                                )}
                                {!["completed", "cancelled"].includes(job.status) && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleMarkComplete(job); }}
                                    className="p-1 hover:bg-green-500/20 rounded transition-colors"
                                    title="Mark complete"
                                  >
                                    <CheckCircle className="w-3 h-3 text-muted-foreground hover:text-green-500" />
                                  </button>
                                )}
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleSelectJob(job); }}
                                  className="p-1 hover:bg-secondary rounded transition-colors"
                                  title="View details"
                                >
                                  <ExternalLink className="w-3 h-3 text-muted-foreground" />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDeleteJob(job); }}
                                  className="p-1 hover:bg-destructive/20 rounded transition-colors"
                                  title="Delete job"
                                >
                                  <Trash className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {filteredJobs.length > 30 && (
                        <p className="text-xs text-muted-foreground font-mono text-center mt-3">
                          Showing 30 of {filteredJobs.length} jobs
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-20 text-muted-foreground">
                      <p className="font-mono text-sm">No jobs found</p>
                    </div>
                  )}
                </div>
                <div>
                  {selectedJob && <JobDetail job={selectedJob} onUpdate={fetchJobs} onDelete={() => setSelectedJob(null)} />}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
