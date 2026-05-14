import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Loader2, MapPin, User, Phone, Truck, CheckCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { apiGet, apiPatch } from "@/lib/apiClient";
import { toast } from "sonner";
import { AdminSidebar, type AdminView } from "@/components/admin/AdminSidebar";

const springBolt = { type: "spring" as const, stiffness: 400, damping: 30 };

interface Job {
  id: string;
  jobNumber: string;
  serviceType: string;
  address: string;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  status: string;
  haulerId: string | null;
  photos: string[] | null;
  priceCents: number | null;
  aiEstimate: {
    estimated_volume?: string;
    item_list?: string[];
    difficulty_score?: number;
    price_min?: number;
    price_max?: number;
    price_estimated?: number;
  } | null;
  scheduledDate: string | null;
  scheduledTime: string | null;
  createdAt: string;
}

interface Hauler {
  id: string;
  businessName: string | null;
  vehicleType: string | null;
  serviceAreas: string[] | null;
  status: string;
  profileName: string | null;
}

function countAreaMatch(hauler: Hauler, address: string): number {
  if (!hauler.serviceAreas || hauler.serviceAreas.length === 0) return 0;
  const lowerAddr = address.toLowerCase();
  return hauler.serviceAreas.filter((area) => lowerAddr.includes(area.toLowerCase())).length;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400",
  confirmed: "bg-blue-500/20 text-blue-400",
  dispatched: "bg-primary/20 text-primary",
  en_route: "bg-primary/20 text-primary",
  arrived: "bg-green-500/20 text-green-400",
  completed: "bg-green-600/20 text-green-500",
  cancelled: "bg-destructive/20 text-destructive",
};

const DispatchDashboard = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [haulers, setHaulers] = useState<Hauler[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState<AdminView>("dispatch");

  const fetchData = useCallback(async () => {
    try {
      const [jobsData, haulersData] = await Promise.all([
        apiGet<Job[]>("/jobs?status=pending"),
        apiGet<Hauler[]>("/haulers?status=approved"),
      ]);
      // Include pending + confirmed; filter explicitly so no other statuses can appear
      const confirmedData = await apiGet<Job[]>("/jobs?status=confirmed").catch(() => []);
      const DISPATCHABLE = new Set(["pending", "confirmed"]);
      const allPending = [...jobsData, ...confirmedData]
        .filter((j) => DISPATCHABLE.has(j.status))
        .filter((j, i, arr) => arr.findIndex((x) => x.id === j.id) === i);
      setJobs(allPending.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setHaulers(haulersData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const assignHauler = async (job: Job, haulerId: string) => {
    setAssigning(job.id);
    try {
      await apiPatch(`/jobs/${job.id}`, { haulerId, status: "dispatched" });
      toast.success(`Job ${job.jobNumber} dispatched`);
      setSelectedJob(null);
      await fetchData();
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to assign hauler");
    } finally {
      setAssigning(null);
    }
  };

  const sortedHaulers = (job: Job) =>
    [...haulers].sort((a, b) => countAreaMatch(b, job.address) - countAreaMatch(a, job.address));

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <AdminSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeView={activeView}
        onChangeView={setActiveView}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 md:h-16 border-b border-border flex items-center justify-between px-4 md:px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden">
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <h1 className="text-sm font-bold uppercase tracking-widest">Dispatch Queue</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-muted-foreground">{jobs.length} unassigned</span>
            <button
              onClick={fetchData}
              className="text-xs uppercase tracking-widest text-primary font-mono hover:underline"
            >
              Refresh
            </button>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-6 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-20">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <p className="text-lg font-bold font-mono">All caught up!</p>
              <p className="text-muted-foreground text-sm mt-1">No pending or confirmed jobs to dispatch.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {jobs.map((job) => {
                const sorted = sortedHaulers(job);
                return (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={springBolt}
                    className="border-milled overflow-hidden"
                  >
                    {/* Photo strip */}
                    {job.photos && job.photos.length > 0 && (
                      <div className="flex gap-0.5 h-28">
                        {job.photos.slice(0, 3).map((url, i) => (
                          <div key={i} className="flex-1 overflow-hidden bg-secondary">
                            <img src={url} alt="" className="w-full h-full object-cover" />
                          </div>
                        ))}
                        {job.photos.length > 3 && (
                          <div className="w-10 bg-secondary flex items-center justify-center">
                            <span className="text-xs font-mono text-muted-foreground">+{job.photos.length - 3}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="p-4 space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-mono text-sm font-bold">{job.jobNumber}</p>
                          <p className="text-xs text-muted-foreground uppercase tracking-widest">{job.serviceType}</p>
                        </div>
                        <span className={`text-[10px] font-mono uppercase px-2 py-0.5 ${statusColors[job.status] || "bg-muted text-muted-foreground"}`}>
                          {job.status}
                        </span>
                      </div>

                      {/* Customer info */}
                      <div className="space-y-1">
                        {job.customerName && (
                          <div className="flex items-center gap-2 text-sm">
                            <User className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span className="font-mono truncate">{job.customerName}</span>
                          </div>
                        )}
                        {job.customerPhone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-3 h-3 text-muted-foreground shrink-0" />
                            <a href={`tel:${job.customerPhone}`} className="font-mono text-primary hover:underline">
                              {job.customerPhone}
                            </a>
                          </div>
                        )}
                        <div className="flex items-start gap-2 text-sm">
                          <MapPin className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                          <span className="font-mono text-xs text-muted-foreground leading-relaxed">{job.address}</span>
                        </div>
                      </div>

                      {/* Pricing */}
                      <div className="flex items-center justify-between py-2 border-t border-border">
                        <div>
                          {job.aiEstimate?.estimated_volume && (
                            <p className="text-xs font-mono text-muted-foreground">{job.aiEstimate.estimated_volume}</p>
                          )}
                          {job.scheduledDate && (
                            <p className="text-xs font-mono text-muted-foreground">{job.scheduledDate} · {job.scheduledTime}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-sm font-bold text-primary">
                            {job.priceCents ? `$${(job.priceCents / 100).toFixed(0)}` : "—"}
                          </p>
                          {job.aiEstimate?.price_min && job.aiEstimate.price_max && (
                            <p className="text-xs font-mono text-muted-foreground">
                              ${(job.aiEstimate.price_min / 100).toFixed(0)}–${(job.aiEstimate.price_max / 100).toFixed(0)}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Hauler assignment */}
                      <div className="space-y-2">
                        <p className="text-xs uppercase tracking-widest text-muted-foreground">Assign Hauler</p>
                        {sorted.length === 0 ? (
                          <p className="text-xs font-mono text-muted-foreground">No approved haulers available</p>
                        ) : (
                          <div className="space-y-1 max-h-40 overflow-y-auto">
                            {sorted.map((h) => {
                              const matchCount = countAreaMatch(h, job.address);
                              return (
                                <button
                                  key={h.id}
                                  onClick={() => assignHauler(job, h.id)}
                                  disabled={assigning === job.id}
                                  className="w-full flex items-center justify-between p-2 text-left hover:bg-secondary/50 transition-colors group"
                                >
                                  <div className="flex items-center gap-2">
                                    <Truck className="w-3 h-3 text-muted-foreground" />
                                    <div>
                                      <p className="text-xs font-mono font-bold">{h.businessName || h.profileName || "Unnamed Hauler"}</p>
                                      <p className="text-[10px] text-muted-foreground font-mono">{h.vehicleType || "Unknown vehicle"}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {matchCount > 0 && (
                                      <span className="text-[10px] font-mono text-primary bg-primary/10 px-1.5 py-0.5">
                                        {matchCount} match
                                      </span>
                                    )}
                                    <span className="text-[10px] font-mono uppercase tracking-widest text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                      {assigning === job.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Assign →"}
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DispatchDashboard;
