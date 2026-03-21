import { useState } from "react";
import { CheckCircle, MapPin, ChevronDown, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Job } from "./JobQueue";
import type { Database } from "@/integrations/supabase/types";

type JobStatus = Database["public"]["Enums"]["job_status"];

const statusFlow: JobStatus[] = ["pending", "confirmed", "dispatched", "en_route", "arrived", "completed"];

const statusColors: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  confirmed: "bg-secondary text-foreground",
  dispatched: "bg-secondary text-foreground",
  en_route: "bg-primary/20 text-primary",
  arrived: "bg-primary/20 text-primary",
  completed: "bg-green-500/20 text-green-500",
  cancelled: "bg-destructive/20 text-destructive",
};

interface JobDetailProps {
  job: Job;
  onUpdate: () => void;
}

export const JobDetail = ({ job, onUpdate }: JobDetailProps) => {
  const [updating, setUpdating] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);

  const updateStatus = async (newStatus: JobStatus) => {
    setUpdating(true);
    setShowStatusPicker(false);
    const { error } = await supabase
      .from("jobs")
      .update({ status: newStatus })
      .eq("id", job.dbId);

    if (error) {
      toast.error("Failed to update status");
      console.error(error);
    } else {
      toast.success(`Job ${job.id} → ${newStatus.replace("_", " ").toUpperCase()}`);
      onUpdate();
    }
    setUpdating(false);
  };

  const advanceStatus = () => {
    const currentIdx = statusFlow.indexOf(job.status as JobStatus);
    if (currentIdx < statusFlow.length - 1) {
      updateStatus(statusFlow[currentIdx + 1]);
    }
  };

  const nextStatus = (() => {
    const idx = statusFlow.indexOf(job.status as JobStatus);
    return idx >= 0 && idx < statusFlow.length - 1 ? statusFlow[idx + 1] : null;
  })();

  return (
    <div>
      <h3 className="text-sm font-bold uppercase tracking-widest mb-4">Job Detail</h3>
      <div className="border-milled p-5 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <span className="font-mono text-lg font-bold">{job.id}</span>
          <div className="relative">
            <button
              onClick={() => setShowStatusPicker(!showStatusPicker)}
              className={`text-xs font-mono uppercase px-3 py-1 flex items-center gap-1 ${statusColors[job.status] || "bg-muted text-muted-foreground"}`}
            >
              {job.status.replace("_", " ")}
              <ChevronDown className="w-3 h-3" />
            </button>
            {showStatusPicker && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-card border-milled shadow-card min-w-[160px]">
                {statusFlow.map((s) => (
                  <button
                    key={s}
                    onClick={() => updateStatus(s)}
                    className={`w-full text-left px-4 py-2 text-xs font-mono uppercase hover:bg-secondary/50 transition-colors ${
                      s === job.status ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {s.replace("_", " ")}
                  </button>
                ))}
                <button
                  onClick={() => updateStatus("cancelled")}
                  className="w-full text-left px-4 py-2 text-xs font-mono uppercase hover:bg-destructive/10 text-destructive border-t border-border"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-border pt-4 space-y-3">
          {[
            { label: "Customer", value: job.customer },
            { label: "Address", value: job.address },
            { label: "Phone", value: job.customerPhone || "—" },
            { label: "Email", value: job.customerEmail || "—" },
            { label: "Date", value: job.scheduledDate || "—" },
            { label: "Time", value: job.eta },
            { label: "Price", value: job.price },
            { label: "Hauler", value: job.hauler },
          ].map((field) => (
            <div key={field.label} className="flex justify-between">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">{field.label}</span>
              <span className="text-sm font-mono text-right max-w-[60%] truncate">{field.value}</span>
            </div>
          ))}
          {job.description && (
            <div>
              <span className="text-xs uppercase tracking-widest text-muted-foreground block mb-1">Notes</span>
              <p className="text-sm text-muted-foreground font-mono">{job.description}</p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2 pt-4">
          {nextStatus && job.status !== "cancelled" && (
            <Button
              variant="default"
              size="sm"
              className="w-full gap-2"
              onClick={advanceStatus}
              disabled={updating}
            >
              {updating ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <CheckCircle className="w-3 h-3" />
              )}
              Advance to {nextStatus.replace("_", " ").toUpperCase()}
            </Button>
          )}
          {job.status === "completed" && (
            <div className="text-center py-2">
              <span className="text-xs font-mono text-green-500 uppercase tracking-widest">✓ Job Complete</span>
            </div>
          )}
          {job.status !== "cancelled" && job.status !== "completed" && (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 text-destructive hover:bg-destructive/10"
              onClick={() => updateStatus("cancelled")}
              disabled={updating}
            >
              <XCircle className="w-3 h-3" /> Cancel Job
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
