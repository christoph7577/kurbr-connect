import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Truck, Clock, Users, DollarSign, AlertTriangle, 
  CheckCircle, MapPin, MoreHorizontal, Search, Bell,
  LayoutDashboard, Calendar, Settings, LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const springBolt = { type: "spring" as const, stiffness: 400, damping: 30 };

const mockJobs = [
  { id: "JOB-2847", customer: "Sarah Mitchell", address: "1482 S State St, SLC", status: "en_route", hauler: "Marcus J.", eta: "14:02", price: "$210" },
  { id: "JOB-2848", customer: "David Park", address: "742 E 900 S, SLC", status: "confirmed", hauler: "Unassigned", eta: "15:30", price: "$89" },
  { id: "JOB-2849", customer: "Amy Chen", address: "2100 S Highland Dr", status: "completed", hauler: "Tony R.", eta: "—", price: "$340" },
  { id: "JOB-2850", customer: "Robert Jones", address: "560 W 200 N, Provo", status: "dispatched", hauler: "Jake L.", eta: "16:45", price: "$165" },
  { id: "JOB-2851", customer: "Lisa Nguyen", address: "890 E Fort Union", status: "en_route", hauler: "Marcus J.", eta: "17:20", price: "$120" },
  { id: "JOB-2852", customer: "Mike Taylor", address: "1200 W Center St, Orem", status: "confirmed", hauler: "Unassigned", eta: "18:00", price: "$275" },
];

const statusColors: Record<string, string> = {
  confirmed: "text-muted-foreground",
  dispatched: "text-foreground",
  en_route: "text-primary",
  arrived: "text-primary",
  completed: "text-green-500",
};

const AdminPage = () => {
  const [sidebarOpen] = useState(true);
  const [selectedJob, setSelectedJob] = useState(mockJobs[0]);

  const stats = [
    { label: "Active Jobs", value: "12", icon: Truck, change: "+3" },
    { label: "Avg ETA", value: "14:32", icon: Clock, change: "-2m" },
    { label: "Haulers Online", value: "8", icon: Users, change: "+1" },
    { label: "Today Revenue", value: "$2,847", icon: DollarSign, change: "+$420" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      {sidebarOpen && (
        <aside className="w-60 bg-sidebar border-r border-sidebar-border flex flex-col shrink-0">
          <div className="p-6">
            <Link to="/" className="text-xl font-bold tracking-[-0.06em]">
              KURBR<span className="text-primary">.</span>
            </Link>
          </div>
          <nav className="flex-1 px-3">
            {[
              { icon: LayoutDashboard, label: "Dashboard", active: true },
              { icon: Truck, label: "Jobs", active: false },
              { icon: Users, label: "Haulers", active: false },
              { icon: Calendar, label: "Schedule", active: false },
              { icon: Settings, label: "Settings", active: false },
            ].map((item) => (
              <button
                key={item.label}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm mb-1 transition-colors ${
                  item.active 
                    ? 'bg-sidebar-accent text-sidebar-primary' 
                    : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span className="uppercase tracking-widest text-xs">{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="p-3 border-t border-sidebar-border">
            <button className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground">
              <LogOut className="w-4 h-4" />
              <span className="uppercase tracking-widest text-xs">Logout</span>
            </button>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-16 border-b border-border flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                placeholder="Search jobs..."
                className="bg-secondary pl-10 pr-4 py-2 text-sm font-mono outline-none focus:ring-1 focus:ring-primary w-64"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
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
        <div className="flex-1 p-6 overflow-auto">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...springBolt, delay: i * 0.05 }}
                className="border-milled p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <stat.icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-mono text-primary">{stat.change}</span>
                </div>
                <p className="text-2xl font-mono font-bold">{stat.value}</p>
                <p className="text-xs uppercase tracking-widest text-muted-foreground mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-6">
            {/* Job Queue */}
            <div className="col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold uppercase tracking-widest">Active Queue</h3>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-primary" />
                  <span className="text-xs font-mono text-primary">2 UNASSIGNED</span>
                </div>
              </div>

              <div className="border-milled">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-4 text-xs uppercase tracking-widest text-muted-foreground font-normal">Job</th>
                      <th className="text-left p-4 text-xs uppercase tracking-widest text-muted-foreground font-normal">Customer</th>
                      <th className="text-left p-4 text-xs uppercase tracking-widest text-muted-foreground font-normal">Hauler</th>
                      <th className="text-left p-4 text-xs uppercase tracking-widest text-muted-foreground font-normal">Status</th>
                      <th className="text-left p-4 text-xs uppercase tracking-widest text-muted-foreground font-normal">ETA</th>
                      <th className="text-right p-4 text-xs uppercase tracking-widest text-muted-foreground font-normal">Price</th>
                      <th className="p-4"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockJobs.map((job) => (
                      <tr
                        key={job.id}
                        onClick={() => setSelectedJob(job)}
                        className={`border-b border-border cursor-pointer transition-colors hover:bg-secondary/30 ${
                          selectedJob.id === job.id ? 'bg-secondary/20' : ''
                        }`}
                      >
                        <td className="p-4 font-mono text-sm">{job.id}</td>
                        <td className="p-4 text-sm">{job.customer}</td>
                        <td className="p-4 text-sm font-mono">{job.hauler}</td>
                        <td className={`p-4 text-xs font-mono uppercase ${statusColors[job.status]}`}>
                          {job.status.replace("_", " ")}
                        </td>
                        <td className="p-4 font-mono text-sm tabular-nums">{job.eta}</td>
                        <td className="p-4 font-mono text-sm text-right tabular-nums">{job.price}</td>
                        <td className="p-4">
                          <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Job Detail */}
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest mb-4">Job Detail</h3>
              <div className="border-milled p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-lg font-bold">{selectedJob.id}</span>
                  <span className={`text-xs font-mono uppercase ${statusColors[selectedJob.status]}`}>
                    {selectedJob.status.replace("_", " ")}
                  </span>
                </div>

                <div className="border-t border-border pt-4 space-y-3">
                  {[
                    { label: "Customer", value: selectedJob.customer },
                    { label: "Address", value: selectedJob.address },
                    { label: "Hauler", value: selectedJob.hauler },
                    { label: "ETA", value: selectedJob.eta },
                    { label: "Price", value: selectedJob.price },
                  ].map((field) => (
                    <div key={field.label} className="flex justify-between">
                      <span className="text-xs uppercase tracking-widest text-muted-foreground">{field.label}</span>
                      <span className="text-sm font-mono text-right">{field.value}</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-4">
                  <Button variant="default" size="sm" className="flex-1 gap-1">
                    <CheckCircle className="w-3 h-3" /> Assign
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 gap-1">
                    <MapPin className="w-3 h-3" /> Track
                  </Button>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="mt-6 border-milled p-6">
                <h4 className="text-xs uppercase tracking-widest text-muted-foreground mb-4">Today's Performance</h4>
                <div className="space-y-3">
                  {[
                    { label: "Completed", value: "7" },
                    { label: "Avg Handoff", value: "42.4s" },
                    { label: "Customer Rating", value: "4.9" },
                    { label: "Revenue", value: "$2,847" },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between items-center">
                      <span className="text-xs uppercase tracking-widest text-muted-foreground">{item.label}</span>
                      <span className="font-mono text-sm font-bold">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
