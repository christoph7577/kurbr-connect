import { AlertTriangle, MoreHorizontal } from "lucide-react";

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
}

export const JobQueue = ({ jobs, selectedJob, onSelectJob }: JobQueueProps) => (
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
                <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
