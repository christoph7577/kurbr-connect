import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, Download } from "lucide-react";
import { apiGet } from "@/lib/apiClient";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type TabKey = "jobs" | "haulers" | "leads";

interface JobRow {
  id: string;
  jobNumber: string;
  status: string;
  serviceType: string;
  address: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  priceCents: number | null;
  scheduledDate: string | null;
  scheduledTime: string | null;
  createdAt: string;
}
interface HaulerRow {
  id: string; userId: string; businessName: string | null;
  vehicleType: string | null; vehiclePlate: string | null;
  status: string; profileName: string | null; profileEmail: string | null;
  createdAt: string;
}
interface LeadRow {
  id: string; name: string | null; phone: string; email: string | null;
  location: string | null; source: string | null; status: string;
  lastCalledAt: string | null; calls: unknown[]; createdAt: string;
}

const csvEscape = (v: unknown): string => {
  if (v == null) return "";
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]!);
  const lines = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => csvEscape(r[h])).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const DataExplorer = () => {
  const [tab, setTab] = useState<TabKey>("jobs");
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [haulers, setHaulers] = useState<HaulerRow[]>([]);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [j, h, l] = await Promise.all([
        apiGet<JobRow[]>("/jobs"),
        apiGet<HaulerRow[]>("/haulers"),
        apiGet<LeadRow[]>("/leads"),
      ]);
      setJobs(j); setHaulers(h); setLeads(l);
    } catch (err) {
      toast.error((err as Error).message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const filteredJobs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter((j) =>
      [j.jobNumber, j.status, j.serviceType, j.address, j.customerName, j.customerEmail, j.customerPhone]
        .some((v) => v?.toLowerCase().includes(q)),
    );
  }, [jobs, query]);
  const filteredHaulers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return haulers;
    return haulers.filter((h) =>
      [h.businessName, h.profileName, h.profileEmail, h.vehicleType, h.vehiclePlate, h.status]
        .some((v) => v?.toLowerCase().includes(q)),
    );
  }, [haulers, query]);
  const filteredLeads = useMemo(() => {
    const q = query.trim().toLowerCase();
    const qd = q.replace(/\D+/g, "");
    if (!q) return leads;
    return leads.filter((l) =>
      [l.name, l.email, l.location, l.source, l.status].some((v) => v?.toLowerCase().includes(q)) ||
      (qd.length >= 3 && l.phone.replace(/\D+/g, "").includes(qd)),
    );
  }, [leads, query]);

  const exportCurrent = () => {
    if (tab === "jobs") {
      downloadCsv("jobs.csv", filteredJobs.map((j) => ({
        jobNumber: j.jobNumber, status: j.status, service: j.serviceType,
        address: j.address, customerName: j.customerName, customerEmail: j.customerEmail,
        customerPhone: j.customerPhone, priceUsd: j.priceCents ? (j.priceCents / 100).toFixed(2) : "",
        scheduledDate: j.scheduledDate, scheduledTime: j.scheduledTime, createdAt: j.createdAt,
      })));
    } else if (tab === "haulers") {
      downloadCsv("haulers.csv", filteredHaulers.map((h) => ({
        businessName: h.businessName, contactName: h.profileName, contactEmail: h.profileEmail,
        vehicleType: h.vehicleType, vehiclePlate: h.vehiclePlate, status: h.status, createdAt: h.createdAt,
      })));
    } else {
      downloadCsv("hauler_leads.csv", filteredLeads.map((l) => ({
        name: l.name, phone: l.phone, email: l.email, location: l.location, source: l.source,
        status: l.status, callCount: l.calls.length, lastCalledAt: l.lastCalledAt, createdAt: l.createdAt,
      })));
    }
  };

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "jobs", label: "Jobs", count: jobs.length },
    { key: "haulers", label: "Haulers", count: haulers.length },
    { key: "leads", label: "Hauler leads", count: leads.length },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Data</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Live view of every submission. Search, filter, and export to CSV.
          </p>
        </div>
        <Button onClick={exportCurrent} variant="outline" className="gap-2">
          <Download className="w-3 h-3" /> Export CSV
        </Button>
      </div>

      <div className="flex items-center gap-1 border-b border-border">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-xs font-mono uppercase border-b-2 -mb-px transition-colors ${
              tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}>
            {t.label} <span className="text-muted-foreground">({t.count})</span>
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          className="w-full bg-background border border-border pl-8 pr-3 py-2 text-sm font-mono focus:outline-none focus:border-primary" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : tab === "jobs" ? (
        <DataTable rows={filteredJobs} columns={[
          { key: "jobNumber", label: "Job #" },
          { key: "status", label: "Status" },
          { key: "serviceType", label: "Service" },
          { key: "customerName", label: "Customer" },
          { key: "customerPhone", label: "Phone" },
          { key: "address", label: "Address" },
          { key: "priceCents", label: "Price", render: (v) => v ? `$${((v as number) / 100).toFixed(2)}` : "—" },
          { key: "createdAt", label: "Created", render: (v) => new Date(v as string).toLocaleDateString() },
        ]} />
      ) : tab === "haulers" ? (
        <DataTable rows={filteredHaulers} columns={[
          { key: "businessName", label: "Business" },
          { key: "profileName", label: "Contact" },
          { key: "profileEmail", label: "Email" },
          { key: "vehicleType", label: "Vehicle" },
          { key: "vehiclePlate", label: "Plate" },
          { key: "status", label: "Status" },
          { key: "createdAt", label: "Created", render: (v) => new Date(v as string).toLocaleDateString() },
        ]} />
      ) : (
        <DataTable rows={filteredLeads} columns={[
          { key: "name", label: "Name" },
          { key: "phone", label: "Phone" },
          { key: "location", label: "Area" },
          { key: "source", label: "Source" },
          { key: "status", label: "Status" },
          { key: "calls", label: "Calls", render: (v) => String((v as unknown[]).length) },
          { key: "lastCalledAt", label: "Last call", render: (v) => v ? new Date(v as string).toLocaleDateString() : "—" },
          { key: "createdAt", label: "Created", render: (v) => new Date(v as string).toLocaleDateString() },
        ]} />
      )}
    </div>
  );
};

interface Column<T> {
  key: keyof T;
  label: string;
  render?: (v: T[keyof T]) => React.ReactNode;
}

function DataTable<T extends { id: string }>({ rows, columns }: { rows: T[]; columns: Column<T>[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground font-mono py-12 text-center">No records found.</p>;
  }
  return (
    <div className="border-milled overflow-x-auto">
      <table className="w-full text-xs font-mono">
        <thead className="bg-secondary/50">
          <tr>
            {columns.map((c) => (
              <th key={String(c.key)} className="text-left p-2 uppercase text-muted-foreground font-normal whitespace-nowrap">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-border hover:bg-secondary/30">
              {columns.map((c) => {
                const v = r[c.key];
                return (
                  <td key={String(c.key)} className="p-2 whitespace-nowrap max-w-[240px] truncate" title={typeof v === "string" ? v : ""}>
                    {c.render ? c.render(v) : (v == null || v === "" ? <span className="text-muted-foreground">—</span> : String(v))}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
