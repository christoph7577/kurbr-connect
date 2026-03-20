import { useState, useEffect } from "react";
import { Search, Bell, Menu, Loader2 } from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { StatsGrid } from "@/components/admin/StatsGrid";
import { JobQueue, type Job } from "@/components/admin/JobQueue";
import { JobDetail } from "@/components/admin/JobDetail";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

const mapJob = (j: Tables<"jobs">): Job => ({
  id: j.job_number,
  customer: j.customer_name || "Unknown",
  address: j.address,
  status: j.status,
  hauler: "Unassigned",
  eta: j.scheduled_time || "—",
  price: j.price_cents ? `$${(j.price_cents / 100).toFixed(0)}` : "—",
});

const AdminPage = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchJobs = async () => {
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      const mapped = data.map(mapJob);
      setJobs(mapped);
      if (!selectedJob && mapped.length > 0) setSelectedJob(mapped[0]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchJobs();
    // Realtime
    const channel = supabase
      .channel("admin-jobs")
      .on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, () => {
        fetchJobs();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleSelectJob = (job: Job) => {
    setSelectedJob(job);
    setShowDetail(true);
  };

  const filteredJobs = searchQuery
    ? jobs.filter((j) =>
        j.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        j.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        j.address.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : jobs;

  const activeCount = jobs.filter((j) => !["completed", "cancelled"].includes(j.status)).length;
  const unassignedCount = jobs.filter((j) => j.hauler === "Unassigned" && j.status !== "completed").length;
  const todayRevenue = jobs.reduce((sum, j) => {
    const num = parseInt(j.price.replace(/[^0-9]/g, "")) || 0;
    return sum + num;
  }, 0);

  const stats = {
    activeJobs: activeCount.toString(),
    unassigned: unassignedCount.toString(),
    totalJobs: jobs.length.toString(),
    todayRevenue: `$${todayRevenue.toLocaleString()}`,
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

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
            <button className="relative">
              <Bell className="w-5 h-5 text-muted-foreground" />
              {unassignedCount > 0 && <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />}
            </button>
            <div className="w-8 h-8 bg-secondary flex items-center justify-center text-xs font-mono font-bold">CC</div>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-6 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <StatsGrid stats={stats} />

              <div className="md:hidden">
                {showDetail && selectedJob ? (
                  <div>
                    <button onClick={() => setShowDetail(false)} className="text-xs uppercase tracking-widest text-primary font-mono mb-4 flex items-center gap-1">
                      ← Back to queue
                    </button>
                    <JobDetail job={selectedJob} />
                  </div>
                ) : (
                  <JobQueue jobs={filteredJobs} selectedJob={selectedJob} onSelectJob={handleSelectJob} />
                )}
              </div>

              <div className="hidden md:grid grid-cols-3 gap-6">
                <div className="col-span-2">
                  <JobQueue jobs={filteredJobs} selectedJob={selectedJob} onSelectJob={handleSelectJob} />
                </div>
                {selectedJob && <JobDetail job={selectedJob} />}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
