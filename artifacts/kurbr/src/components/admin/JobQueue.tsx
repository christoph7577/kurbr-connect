import { useEffect, useRef, useState } from "react";
import { AlertTriangle, MoreHorizontal, Eye, CheckCircle, Trash2 } from "lucide-react";

export interface AiEstimate {
  estimated_volume?: string;
  item_list?: string[];
  difficulty_score?: number;
  reasoning?: string;
  price_min?: number;
  price_max?: number;
  price_estimated?: number;
  price_breakdown?: {
    rate_cents_per_cuyd?: number;
    volume_cuyd?: number;
    difficulty?: number;
    difficulty_multiplier?: number;
    base_cents?: number;
    formula?: string;
  };
}

export interface Job {
  id: string;
  dbId: string;
  customer: string;
  address: string;
  status: string;
  hauler: string;
  haulerId: string | null;
  eta: string;
  price: string;
  priceCents: number | null;
  description: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  scheduledDate: string | null;
  photos: string[] | null;
  aiEstimate: AiEstimate | null;
}

const statusColors: Record<string, string> = {
  pending: "text-muted-foreground",
  confirmed: "text-muted-foreground",
  dispatched: "text-foreground",
  en_route: "text-primary",
  arrived: "text-primary",
  completed: "text-green-500",
  cancelled: "text-destructive",
};

interface JobQueueProps {
  jobs: Job[];
  selectedJob: Job | null;
  onSelectJob: (job: Job) => void;
  onMarkComplete?: (job: Job) => void;
  onDeleteJob?: (job: Job) => void;
}

const RowActions = ({ job, onSelectJob, onMarkComplete, onDeleteJob }: { job: Job } & Pick<JobQueueProps, "onSelectJob" | "onMarkComplete" | "onDeleteJob">) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-1 hover:bg-secondary rounded transition-colors"
        aria-label="Job actions"
      >
        <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-card border-milled shadow-card min-w-[160px]">
          <button
            onClick={() => { setOpen(false); onSelectJob(job); }}
            className="w-full text-left px-3 py-2 text-xs font-mono uppercase hover:bg-secondary/50 flex items-center gap-2"
          >
            <Eye className="w-3 h-3" /> View
          </button>
          {onMarkComplete && !["completed", "cancelled"].includes(job.status) && (
            <button
              onClick={() => { setOpen(false); onMarkComplete(job); }}
              className="w-full text-left px-3 py-2 text-xs font-mono uppercase hover:bg-green-500/10 text-green-500 flex items-center gap-2"
            >
              <CheckCircle className="w-3 h-3" /> Mark Complete
            </button>
          )}
          {onDeleteJob && (
            <button
              onClick={() => { setOpen(false); onDeleteJob(job); }}
              className="w-full text-left px-3 py-2 text-xs font-mono uppercase hover:bg-destructive/10 text-destructive border-t border-border flex items-center gap-2"
            >
              <Trash2 className="w-3 h-3" /> Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export const JobQueue = ({ jobs, selectedJob, onSelectJob, onMarkComplete, onDeleteJob }: JobQueueProps) => (
  <div>
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-bold uppercase tracking-widest">Active Queue</h3>
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-primary" />
        <span className="text-xs font-mono text-primary">
          {jobs.filter((j) => j.hauler === "Unassigned" && !["completed", "cancelled"].includes(j.status)).length} UNASSIGNED
        </span>
      </div>
    </div>

    {/* Mobile: Card layout */}
    <div className="md:hidden space-y-2">
      {jobs.map((job) => (
        <button
          key={job.id}
          onClick={() => onSelectJob(job)}
          className={`w-full text-left border-milled p-4 transition-colors ${
            selectedJob?.id === job.id ? "bg-secondary/20 border-primary/40" : ""
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-sm font-bold">{job.id}</span>
            <span className={`text-[10px] font-mono uppercase ${statusColors[job.status] || "text-muted-foreground"}`}>
              {job.status.replace("_", " ")}
            </span>
          </div>
          <p className="text-sm mb-1">{job.customer}</p>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-mono">{job.hauler}</span>
            <span className="font-mono font-bold text-foreground">{job.price}</span>
          </div>
        </button>
      ))}
    </div>

    {/* Desktop: Table layout */}
    <div className="hidden md:block border-milled">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            {["Job", "Customer", "Hauler", "Status", "ETA", "Price", ""].map((h) => (
              <th
                key={h}
                className={`text-left p-4 text-xs uppercase tracking-widest text-muted-foreground font-normal ${
                  h === "Price" ? "text-right" : ""
                }`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr
              key={job.id}
              onClick={() => onSelectJob(job)}
              className={`border-b border-border cursor-pointer transition-colors hover:bg-secondary/30 ${
                selectedJob?.id === job.id ? "bg-secondary/20" : ""
              }`}
            >
              <td className="p-4 font-mono text-sm">{job.id}</td>
              <td className="p-4 text-sm">{job.customer}</td>
              <td className="p-4 text-sm font-mono">{job.hauler}</td>
              <td className={`p-4 text-xs font-mono uppercase ${statusColors[job.status] || "text-muted-foreground"}`}>
                {job.status.replace("_", " ")}
              </td>
              <td className="p-4 font-mono text-sm tabular-nums">{job.eta}</td>
              <td className="p-4 font-mono text-sm text-right tabular-nums">{job.price}</td>
              <td className="p-4">
                <RowActions job={job} onSelectJob={onSelectJob} onMarkComplete={onMarkComplete} onDeleteJob={onDeleteJob} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
