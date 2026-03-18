import { CheckCircle, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Job } from "./JobQueue";

const statusColors: Record<string, string> = {
  confirmed: "text-muted-foreground",
  dispatched: "text-foreground",
  en_route: "text-primary",
  arrived: "text-primary",
  completed: "text-green-500",
};

interface JobDetailProps {
  job: Job;
}

export const JobDetail = ({ job }: JobDetailProps) => (
  <div>
    <h3 className="text-sm font-bold uppercase tracking-widest mb-4">Job Detail</h3>
    <div className="border-milled p-5 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-lg font-bold">{job.id}</span>
        <span className={`text-xs font-mono uppercase ${statusColors[job.status]}`}>
          {job.status.replace("_", " ")}
        </span>
      </div>

      <div className="border-t border-border pt-4 space-y-3">
        {[
          { label: "Customer", value: job.customer },
          { label: "Address", value: job.address },
          { label: "Hauler", value: job.hauler },
          { label: "ETA", value: job.eta },
          { label: "Price", value: job.price },
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
    <div className="mt-4 md:mt-6 border-milled p-5 md:p-6">
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
);
