import { useState, useEffect } from "react";
import { CheckCircle, ChevronDown, Loader2, XCircle, UserPlus, Phone, MessageSquare, Trash2, Sparkles, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiGet, apiPatch, apiDelete } from "@/lib/apiClient";
import { toast } from "sonner";
import type { Job } from "./JobQueue";
import { PhotoLightbox } from "./PhotoLightbox";

interface ContactNote {
  id: string;
  jobId: string;
  haulerName: string | null;
  contactType: string;
  note: string | null;
  createdAt: string;
}

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
  onDelete?: () => void;
}

export const JobDetail = ({ job, onUpdate, onDelete }: JobDetailProps) => {
  const [updating, setUpdating] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showHaulerPicker, setShowHaulerPicker] = useState(false);
  const [haulers, setHaulers] = useState<Hauler[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [loadingHaulers, setLoadingHaulers] = useState(false);
  const [contactNotes, setContactNotes] = useState<ContactNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);

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

  const fetchNotes = async () => {
    setLoadingNotes(true);
    try {
      const data = await apiGet<ContactNote[]>(`/jobs/${job.dbId}/notes`);
      setContactNotes(data);
    } catch {
      // notes are supplemental — don't surface fetch errors
    }
    setLoadingNotes(false);
  };

  useEffect(() => {
    fetchHaulers();
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [job.dbId]);

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

  const deleteJob = async () => {
    if (!window.confirm(`Permanently delete ${job.id}? This cannot be undone.`)) return;
    setUpdating(true);
    try {
      await apiDelete(`/jobs/${job.dbId}`);
      toast.success(`${job.id} deleted`);
      onDelete?.();
      onUpdate();
    } catch (err) {
      toast.error("Failed to delete job");
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

        {/* Customer photos */}
        {job.photos && job.photos.length > 0 && (
          <div className="border-t border-border pt-4 mt-2">
            <div className="flex items-center gap-2 mb-3">
              <ImageIcon className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs uppercase tracking-widest text-muted-foreground">
                Customer Photos ({job.photos.length})
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {job.photos.map((url, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setLightboxIndex(i)}
                  className="block aspect-square bg-secondary overflow-hidden hover:opacity-80 transition-opacity cursor-zoom-in"
                  title="Click to enlarge"
                >
                  <img
                    src={url}
                    alt={`Job photo ${i + 1}`}
                    loading="lazy"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const el = e.target as HTMLImageElement;
                      el.style.opacity = "0.3";
                      el.alt = "Failed to load";
                    }}
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* AI pricing breakdown */}
        {job.aiEstimate && (
          <div className="border-t border-border pt-4 mt-2">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-3 h-3 text-primary" />
              <span className="text-xs uppercase tracking-widest text-muted-foreground">AI Pricing Analysis</span>
            </div>
            <div className="bg-secondary/30 p-3 space-y-2">
              <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                {job.aiEstimate.estimated_volume && (
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Volume</div>
                    <div className="text-sm font-mono font-bold">{job.aiEstimate.estimated_volume}</div>
                  </div>
                )}
                {typeof job.aiEstimate.difficulty_score === "number" && (
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Difficulty</div>
                    <div className="text-sm font-mono font-bold">{job.aiEstimate.difficulty_score}/5</div>
                  </div>
                )}
                {typeof job.aiEstimate.price_estimated === "number" && (
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">AI Estimate</div>
                    <div className="text-sm font-mono font-bold text-primary">
                      ${(job.aiEstimate.price_estimated / 100).toFixed(0)}
                    </div>
                  </div>
                )}
                {typeof job.aiEstimate.price_min === "number" && typeof job.aiEstimate.price_max === "number" && (
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Range</div>
                    <div className="text-sm font-mono">
                      ${(job.aiEstimate.price_min / 100).toFixed(0)}–${(job.aiEstimate.price_max / 100).toFixed(0)}
                    </div>
                  </div>
                )}
              </div>
              {job.aiEstimate.item_list && job.aiEstimate.item_list.length > 0 && (
                <div className="pt-2 border-t border-border/40">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono mb-1">Items Detected</div>
                  <p className="text-xs font-mono text-foreground">{job.aiEstimate.item_list.join(", ")}</p>
                </div>
              )}
              {job.aiEstimate.reasoning && (
                <div className="pt-2 border-t border-border/40">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono mb-1">Reasoning</div>
                  <p className="text-xs text-foreground leading-relaxed">{job.aiEstimate.reasoning}</p>
                </div>
              )}
              {job.aiEstimate.price_breakdown?.formula && (
                <div className="pt-2 border-t border-border/40">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono mb-1">Pricing Formula</div>
                  <p className="text-xs font-mono text-foreground bg-background/50 px-2 py-1.5">
                    {job.aiEstimate.price_breakdown.formula}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {lightboxIndex !== null && job.photos && (
          <PhotoLightbox
            photos={job.photos}
            index={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onChange={setLightboxIndex}
          />
        )}

        {/* Contact log */}
        <div className="border-t border-border pt-4 mt-2">
          <span className="text-xs uppercase tracking-widest text-muted-foreground block mb-3">
            Contact Log {contactNotes.length > 0 && `(${contactNotes.length})`}
          </span>
          {loadingNotes ? (
            <div className="flex justify-center py-3">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : contactNotes.length === 0 ? (
            <p className="text-xs text-muted-foreground font-mono">No contact notes yet.</p>
          ) : (
            <div className="space-y-2">
              {contactNotes.map((n) => (
                <div key={n.id} className="bg-secondary/30 px-3 py-2.5 space-y-1">
                  <div className="flex items-center gap-2">
                    {n.contactType === "call" ? (
                      <Phone className="w-3 h-3 text-muted-foreground shrink-0" />
                    ) : (
                      <MessageSquare className="w-3 h-3 text-muted-foreground shrink-0" />
                    )}
                    <span className="text-xs font-mono uppercase tracking-wide text-foreground">
                      {n.contactType === "call" ? "Called" : "Texted"}
                      {n.haulerName ? ` · ${n.haulerName}` : ""}
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {new Date(n.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </span>
                  </div>
                  {n.note && (
                    <p className="text-xs text-muted-foreground font-mono pl-5">{n.note}</p>
                  )}
                </div>
              ))}
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
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2 text-destructive hover:bg-destructive/10 border-destructive/40"
            onClick={deleteJob}
            disabled={updating}
          >
            <Trash2 className="w-3 h-3" /> Delete Job
          </Button>
        </div>
      </div>
    </div>
  );
};
