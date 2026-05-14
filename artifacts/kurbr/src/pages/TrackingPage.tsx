import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Phone, MessageSquare, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useSearchParams } from "react-router-dom";
import { apiGet } from "@/lib/apiClient";

const springBolt = { type: "spring" as const, stiffness: 400, damping: 30 };

const statuses = [
  { id: "confirmed", label: "CONFIRMED" },
  { id: "dispatched", label: "DISPATCHED" },
  { id: "en_route", label: "EN ROUTE" },
  { id: "arrived", label: "ARRIVED" },
  { id: "completed", label: "COMPLETED" },
];

const statusIndex = (s: string) => {
  const i = statuses.findIndex((st) => st.id === s);
  return i >= 0 ? i : 0;
};

const TrackingPage = () => {
  const [searchParams] = useSearchParams();
  const jobParam = searchParams.get("job");

  const [jobNumber, setJobNumber] = useState(jobParam || "");
  const [job, setJob] = useState<any | null>(null);
  const [loading, setLoading] = useState(!!jobParam);
  const [notFound, setNotFound] = useState(false);

  const fetchJob = async (num: string) => {
    setLoading(true);
    setNotFound(false);
    try {
      const data = await apiGet<any>(`/jobs/by-number/${num.toUpperCase()}`);
      setJob(data);
    } catch {
      setNotFound(true);
      setJob(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (jobParam) fetchJob(jobParam);
  }, [jobParam]);

  // Poll for status updates
  useEffect(() => {
    if (!job) return;
    const interval = setInterval(() => fetchJob(job.jobNumber), 15000);
    return () => clearInterval(interval);
  }, [job?.jobNumber]);

  const currentStatus = job ? statusIndex(job.status) : 0;

  // If no job loaded, show search
  if (!job && !loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <nav className="glass">
          <div className="container flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2 text-foreground">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-xs uppercase tracking-widest">Back</span>
            </Link>
            <p className="text-xl font-bold tracking-[-0.06em]">KURBR<span className="text-primary">.</span></p>
            <div className="w-16" />
          </div>
        </nav>
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <h2 className="text-3xl font-bold mb-2">Track Your Pickup</h2>
          <p className="text-muted-foreground font-mono text-sm mb-8">Enter your job number to see live status</p>
          <div className="w-full max-w-sm space-y-4">
            <div className="relative">
              <Search className="absolute left-0 top-3 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={jobNumber}
                onChange={(e) => setJobNumber(e.target.value)}
                placeholder="JOB-2847"
                className="w-full bg-transparent border-b-2 border-secondary focus:border-primary outline-none transition-colors py-2 pl-6 font-mono uppercase"
              />
            </div>
            {notFound && <p className="text-destructive text-sm font-mono">Job not found. Check the number and try again.</p>}
            <Button variant="default" className="w-full" onClick={() => fetchJob(jobNumber)} disabled={jobNumber.length < 3}>
              Track Job
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div className="min-h-screen flex flex-col bg-background">
        <nav className="glass">
          <div className="container flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2 text-foreground">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-xs uppercase tracking-widest">Back</span>
            </Link>
            <p className="text-xl font-bold tracking-[-0.06em]">KURBR<span className="text-primary">.</span></p>
            <p className="text-xs font-mono text-muted-foreground">{job!.jobNumber}</p>
          </div>
        </nav>

        <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
          {/* Status display */}
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={springBolt} className="text-center mb-16">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-4">Status</p>
            <p className="text-5xl md:text-7xl font-mono font-bold tracking-tight text-foreground uppercase">
              {job!.status.replace("_", " ")}
            </p>
            <p className="text-sm text-muted-foreground mt-4 font-mono">
              {job!.scheduledDate} · {job!.scheduledTime}
            </p>
          </motion.div>

          {/* Status Steps */}
          <div className="w-full max-w-md mb-16">
            <div className="flex items-center">
              {statuses.map((s, i) => (
                <div key={s.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full transition-colors ${i <= currentStatus ? 'bg-primary' : 'bg-secondary'}`} />
                    <p className={`text-[10px] mt-2 uppercase tracking-widest ${i <= currentStatus ? 'text-primary' : 'text-muted-foreground'}`}>{s.label}</p>
                  </div>
                  {i < statuses.length - 1 && (
                    <div className={`h-px flex-1 mx-1 transition-colors ${i < currentStatus ? 'bg-primary' : 'bg-secondary'}`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Job Info */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ...springBolt, delay: 0.2 }} className="w-full max-w-md glass p-6">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-xs uppercase tracking-widest text-muted-foreground">Service</span>
                <span className="font-mono text-sm uppercase">{job!.serviceType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs uppercase tracking-widest text-muted-foreground">Address</span>
                <span className="font-mono text-sm text-right max-w-[200px]">{job!.address}</span>
              </div>
              {job!.priceCents && (
                <div className="flex justify-between">
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">Price</span>
                  <span className="font-mono text-sm font-bold text-primary">${(job!.priceCents / 100).toFixed(0)}</span>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default TrackingPage;
