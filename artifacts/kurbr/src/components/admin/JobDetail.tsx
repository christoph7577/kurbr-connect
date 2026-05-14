import { useState, useEffect } from "react";
import { CheckCircle, ChevronDown, Loader2, XCircle, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiGet, apiPatch } from "@/lib/apiClient";
import { toast } from "sonner";
import type { Job } from "./JobQueue";

type JobStatus = "pending" | "confirmed" | "dispatched" | "en_route" | "arrived" | "completed" | "cancelled";

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

interface Hauler {
  id: string;
  businessName: string;
  status: string;
}

interface JobDetailProps {
  job: Job;
  onUpdate: () => void;
}

export const JobDetail = ({ job, onUpdate }: JobDetailProps) => {
  const [updating, setUpdating] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showHaulerPicker, setShowHaulerPicker] = useState(false);
  const [haulers, setHaulers] = useState<Hauler[]>([]);
  const [loadingHaulers, setLoadingHaulers] = useState(false);

  const fetchHaulers = async () => {
    setLoadingHaulers(true);
    try {
      const data = await apiGet<any[]>("/haulers?status=approved");
      setHaulers(
        data.map((h) => ({
          id: h.id,
          businessName: h.businessName || h.profileName || "Unnamed Hauler",
          status: h.status,
        }))
      );
    } catch (err) {
      console.error(err);
    }
    setLoadingHaulers(false);
  };

  useEffect(() => {
    fetchHaulers();
  }, []);

  const updateStatus = async (newStatus: JobStatus) => {
    setUpdating(true);
    setShowStatusPicker(false);
    try {
      await apiPatch(`/jobs/${job.dbId}`, { status: newStatus });
      toast.success(`Job ${job.id} → ${newStatus.replace("_", " ").toUpperCase()}`);
      onUpdate();
    } catch (err: any) {
      toast.error("Failed to update status");
      console.error(err);
    }
    setUpdating(false);
  };

  const assignHauler = async (haulerId: string | null) => {
    setUpdating(true);
    setShowHaulerPicker(false);
    try {
      await apiPatch(`/jobs/${job.dbId}`, { haulerId });
      toast.success(haulerId ? `Hauler assigned to ${job.id}` : `Hauler removed from ${job.id}`);
      onUpdate();
    } catch (err: any) {
      toast.error("Failed to assign hauler");
      console.error(err);
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

  const assignedHaulerName = haulers.find((h) => h.id === job.haulerId)?.businessName;

  return (
    <div>
      <h3 className="text-sm font-bold uppercase tracking-widest mb-4">Job Detail</h3>
      <div className="border-milled p-5 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <span className="font-mono text-lg font-bold">{job.id}</span>
          <div className="relative">
            <button
              onClick={() => { setShowStatusPicker(!showStatusPicker); setShowHaulerPicker(false); }}
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
          ].map((field) => (
            <div key={field.label} className="flex justify-between">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">{field.label}</span>
              <span className="text-sm font-mono text-right max-w-[60%] truncate">{field.value}</span>
            </div>
          ))}

          {/* Hauler assignment */}
          <div className="flex justify-between items-center">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Hauler</span>
            <div className="relative">
              <button
                onClick={() => { setShowHaulerPicker(!showHaulerPicker); setShowStatusPicker(false); }}
                className={`text-sm font-mono flex items-center gap-1.5 px-2 py-0.5 transition-colors hover:bg-secondary/50 ${
                  job.haulerId ? "text-foreground" : "text-primary"
                }`}
              >
                {job.haulerId ? (assignedHaulerName || "Assigned") : "Assign"}
                <UserPlus className="w-3 h-3" />
              </button>
              {showHaulerPicker && (
                <div className="absolute right-0 top-full mt-1 z-50 bg-card border-milled shadow-card min-w-[200px] max-h-[240px] overflow-y-auto">
                  {loadingHaulers ? (
                    <div className="p-4 flex justify-center">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : haulers.length === 0 ? (
                    <div className="p-4 text-xs text-muted-foreground font-mono">No approved haulers</div>
                  ) : (
                    <>
                      {haulers.map((h) => (
                        <button
                          key={h.id}
                          onClick={() => assignHauler(h.id)}
                          className={`w-full text-left px-4 py-2.5 text-xs font-mono hover:bg-secondary/50 transition-colors ${
                            h.id === job.haulerId ? "text-primary bg-primary/5" : "text-foreground"
                          }`}
                        >
                          {h.businessName}
                        </button>
                      ))}
                      {job.haulerId && (
                        <button
                          onClick={() => assignHauler(null)}
                          className="w-full text-left px-4 py-2.5 text-xs font-mono uppercase hover:bg-destructive/10 text-destructive border-t border-border"
                        >
                          Unassign
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

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
