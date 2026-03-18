import { useState } from "react";
import { Search, Bell, Menu } from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { StatsGrid } from "@/components/admin/StatsGrid";
import { JobQueue, type Job } from "@/components/admin/JobQueue";
import { JobDetail } from "@/components/admin/JobDetail";

const mockJobs: Job[] = [
  { id: "JOB-2847", customer: "Sarah Mitchell", address: "1482 S State St, SLC", status: "en_route", hauler: "Marcus J.", eta: "14:02", price: "$210" },
  { id: "JOB-2848", customer: "David Park", address: "742 E 900 S, SLC", status: "confirmed", hauler: "Unassigned", eta: "15:30", price: "$89" },
  { id: "JOB-2849", customer: "Amy Chen", address: "2100 S Highland Dr", status: "completed", hauler: "Tony R.", eta: "—", price: "$340" },
  { id: "JOB-2850", customer: "Robert Jones", address: "560 W 200 N, Provo", status: "dispatched", hauler: "Jake L.", eta: "16:45", price: "$165" },
  { id: "JOB-2851", customer: "Lisa Nguyen", address: "890 E Fort Union", status: "en_route", hauler: "Marcus J.", eta: "17:20", price: "$120" },
  { id: "JOB-2852", customer: "Mike Taylor", address: "1200 W Center St, Orem", status: "confirmed", hauler: "Unassigned", eta: "18:00", price: "$275" },
];

const AdminPage = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(mockJobs[0]);
  const [showDetail, setShowDetail] = useState(false);

  const handleSelectJob = (job: Job) => {
    setSelectedJob(job);
    setShowDetail(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-14 md:h-16 border-b border-border flex items-center justify-between px-4 md:px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden">
              <Menu className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                placeholder="Search jobs..."
                className="bg-secondary pl-10 pr-4 py-2 text-sm font-mono outline-none focus:ring-1 focus:ring-primary w-64"
              />
            </div>
            <span className="md:hidden text-lg font-bold tracking-[-0.06em]">
              KURBR<span className="text-primary">.</span>
            </span>
          </div>
          <div className="flex items-center gap-3 md:gap-4">
            <button className="relative">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
            </button>
            <div className="w-8 h-8 bg-secondary flex items-center justify-center text-xs font-mono font-bold">
              CC
            </div>
          </div>
        </header>

        {/* Dashboard */}
        <div className="flex-1 p-4 md:p-6 overflow-auto">
          <StatsGrid />

          {/* Mobile: toggle between queue and detail */}
          <div className="md:hidden">
            {showDetail ? (
              <div>
                <button
                  onClick={() => setShowDetail(false)}
                  className="text-xs uppercase tracking-widest text-primary font-mono mb-4 flex items-center gap-1"
                >
                  ← Back to queue
                </button>
                <JobDetail job={selectedJob} />
              </div>
            ) : (
              <JobQueue jobs={mockJobs} selectedJob={selectedJob} onSelectJob={handleSelectJob} />
            )}
          </div>

          {/* Desktop: side by side */}
          <div className="hidden md:grid grid-cols-3 gap-6">
            <div className="col-span-2">
              <JobQueue jobs={mockJobs} selectedJob={selectedJob} onSelectJob={handleSelectJob} />
            </div>
            <JobDetail job={selectedJob} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
