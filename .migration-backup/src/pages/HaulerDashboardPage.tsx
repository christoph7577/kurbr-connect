import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  Loader2, MapPin, Clock, ChevronRight, Navigation, LogOut,
  CheckCircle, Truck, ArrowRight, Phone, User,
} from "lucide-react";
import scrappyDriving from "@/assets/scrappy-driving.png";
import scrappyThumbsup from "@/assets/scrappy-thumbsup.png";

const STATUS_FLOW = ["confirmed", "dispatched", "en_route", "arrived", "completed"] as const;
const STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmed",
  dispatched: "Dispatched",
  en_route: "En Route",
  arrived: "Arrived",
  completed: "Completed",
};
const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-blue-500/20 text-blue-400",
  dispatched: "bg-yellow-500/20 text-yellow-400",
  en_route: "bg-primary/20 text-primary",
  arrived: "bg-green-500/20 text-green-400",
  completed: "bg-muted text-muted-foreground",
};

interface HaulerJob {
  id: string;
  job_number: string;
  address: string;
  customer_name: string | null;
  customer_phone: string | null;
  service_type: string;
  status: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  description: string | null;
  price_cents: number | null;
}

const HaulerDashboardPage = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<HaulerJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<HaulerJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [haulerProfileId, setHaulerProfileId] = useState<string | null>(null);

  const fetchHaulerProfile = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("hauler_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) setHaulerProfileId(data.id);
    return data?.id;
  }, [user]);

  const fetchJobs = useCallback(async (profileId?: string) => {
    const hId = profileId || haulerProfileId;
    if (!hId) return;
    const { data } = await supabase
      .from("jobs")
      .select("id, job_number, address, customer_name, customer_phone, service_type, status, scheduled_date, scheduled_time, description, price_cents")
      .eq("hauler_id", hId)
      .in("status", ["confirmed", "dispatched", "en_route", "arrived"])
      .order("scheduled_date", { ascending: true });
    if (data) {
      setJobs(data);
      if (selectedJob) {
        const updated = data.find((j) => j.id === selectedJob.id);
        if (updated) setSelectedJob(updated);
      }
    }
    setLoading(false);
  }, [haulerProfileId, selectedJob?.id]);

  useEffect(() => {
    fetchHaulerProfile().then((id) => { if (id) fetchJobs(id); else setLoading(false); });
  }, [user]);

  useEffect(() => {
    if (!haulerProfileId) return;
    const channel = supabase
      .channel("hauler-jobs")
      .on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, () => fetchJobs())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [haulerProfileId]);

  const advanceStatus = async (job: HaulerJob) => {
    const idx = STATUS_FLOW.indexOf(job.status as any);
    if (idx < 0 || idx >= STATUS_FLOW.length - 1) return;
    const next = STATUS_FLOW[idx + 1];
    setUpdating(true);
    const { error } = await supabase
      .from("jobs")
      .update({ status: next })
      .eq("id", job.id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Job ${job.job_number} → ${STATUS_LABELS[next]}` });
      fetchJobs();
    }
    setUpdating(false);
  };

  const nextLabel = (status: string) => {
    const idx = STATUS_FLOW.indexOf(status as any);
    if (idx < 0 || idx >= STATUS_FLOW.length - 1) return null;
    return STATUS_LABELS[STATUS_FLOW[idx + 1]];
  };

  const openDirections = (address: string) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!haulerProfileId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <img src={scrappyDriving} alt="Scrappy" className="w-24 h-24 mx-auto" />
          <h2 className="text-xl font-bold font-mono">No hauler profile found</h2>
          <p className="text-muted-foreground text-sm">
            You need to complete hauler onboarding before accessing the dashboard.
          </p>
          <Button onClick={() => navigate("/hauler-onboarding")}>Start Onboarding</Button>
        </div>
      </div>
    );
  }

  // Detail view
  if (selectedJob) {
    const next = nextLabel(selectedJob.status);
    return (
      <div className="min-h-screen bg-background text-foreground">
        <header className="h-14 border-b border-border flex items-center px-4 gap-3">
          <button onClick={() => setSelectedJob(null)} className="text-primary font-mono text-xs uppercase tracking-widest">
            ← Back
          </button>
          <span className="ml-auto font-mono text-sm text-muted-foreground">{selectedJob.job_number}</span>
        </header>

        <div className="p-4 space-y-4 max-w-lg mx-auto">
          <div className="flex items-center justify-between">
            <Badge className={STATUS_COLORS[selectedJob.status]}>
              {STATUS_LABELS[selectedJob.status] || selectedJob.status}
            </Badge>
            {selectedJob.price_cents && (
              <span className="font-mono font-bold text-lg">${(selectedJob.price_cents / 100).toFixed(0)}</span>
            )}
          </div>

          <div className="bg-secondary p-4 space-y-3">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-mono">Address</p>
                <p className="font-medium">{selectedJob.address}</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => openDirections(selectedJob.address)}
            >
              <Navigation className="w-4 h-4 mr-2" /> Get Directions
            </Button>
          </div>

          <div className="bg-secondary p-4 space-y-3">
            {selectedJob.customer_name && (
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-muted-foreground" />
                <span>{selectedJob.customer_name}</span>
              </div>
            )}
            {selectedJob.customer_phone && (
              <a href={`tel:${selectedJob.customer_phone}`} className="flex items-center gap-3 text-primary">
                <Phone className="w-4 h-4" />
                <span>{selectedJob.customer_phone}</span>
              </a>
            )}
            {selectedJob.scheduled_date && (
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>{selectedJob.scheduled_date} {selectedJob.scheduled_time || ""}</span>
              </div>
            )}
          </div>

          {selectedJob.description && (
            <div className="bg-secondary p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-mono mb-1">Notes</p>
              <p className="text-sm">{selectedJob.description}</p>
            </div>
          )}

          <p className="text-xs text-muted-foreground font-mono">Service: {selectedJob.service_type}</p>

          {next && (
            <Button
              className="w-full h-14 text-lg"
              onClick={() => advanceStatus(selectedJob)}
              disabled={updating}
            >
              {updating ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <ArrowRight className="w-5 h-5 mr-2" />}
              Mark as {next}
            </Button>
          )}

          {selectedJob.status === "completed" && (
            <div className="text-center py-4">
              <img src={scrappyThumbsup} alt="Done" className="w-16 h-16 mx-auto mb-2" />
              <p className="text-muted-foreground font-mono text-sm">Job complete!</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Job list
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="h-14 border-b border-border flex items-center justify-between px-4">
        <h1 className="text-lg font-bold tracking-[-0.06em] font-mono">
          KURBR<span className="text-primary">.</span> <span className="text-sm font-normal text-muted-foreground">Hauler</span>
        </h1>
        <button onClick={signOut} className="text-muted-foreground">
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      <div className="p-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <img src={scrappyDriving} alt="Scrappy" className="w-10 h-10" />
          <div>
            <p className="font-mono font-bold">{jobs.length} Active Job{jobs.length !== 1 ? "s" : ""}</p>
            <p className="text-xs text-muted-foreground">Tap a job for details</p>
          </div>
        </div>

        {jobs.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Truck className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground font-mono text-sm">No active jobs right now</p>
            <p className="text-xs text-muted-foreground">New assignments will appear here automatically</p>
          </div>
        ) : (
          <div className="space-y-2">
            {jobs.map((job) => (
              <button
                key={job.id}
                onClick={() => setSelectedJob(job)}
                className="w-full bg-secondary p-4 flex items-center gap-3 text-left hover:bg-muted transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-muted-foreground">{job.job_number}</span>
                    <Badge className={`text-[10px] ${STATUS_COLORS[job.status]}`}>
                      {STATUS_LABELS[job.status] || job.status}
                    </Badge>
                  </div>
                  <p className="font-medium truncate">{job.address}</p>
                  <p className="text-xs text-muted-foreground">{job.service_type} • {job.scheduled_date || "Unscheduled"}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HaulerDashboardPage;
