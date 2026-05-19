import { useEffect, useMemo, useState } from "react";
import {
  Loader2, Plus, Phone, X, Copy, Check, Trash2, Search, ExternalLink, Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/apiClient";
import { toast } from "sonner";

type LeadStatus = "new" | "interested" | "not_interested" | "callback" | "onboarded" | "do_not_call";
type CallOutcome =
  | "no_answer" | "voicemail" | "interested" | "not_interested"
  | "callback_requested" | "wrong_number" | "do_not_call";

interface CallLog {
  id: string;
  outcome: CallOutcome;
  notes: string | null;
  nextFollowUpAt: string | null;
  createdAt: string;
}
interface Lead {
  id: string;
  name: string | null;
  phone: string;
  phoneNormalized: string;
  email: string | null;
  location: string | null;
  source: string | null;
  notes: string | null;
  status: LeadStatus;
  onboardingToken: string;
  createdAt: string;
  updatedAt: string;
  calls: CallLog[];
  lastCalledAt: string | null;
}

const statusColors: Record<LeadStatus, string> = {
  new: "bg-muted text-muted-foreground",
  interested: "bg-green-500/20 text-green-500",
  callback: "bg-amber-500/20 text-amber-500",
  not_interested: "bg-secondary text-muted-foreground",
  onboarded: "bg-primary/20 text-primary",
  do_not_call: "bg-destructive/20 text-destructive",
};

const outcomeLabels: Record<CallOutcome, string> = {
  no_answer: "No answer",
  voicemail: "Left voicemail",
  interested: "Interested",
  not_interested: "Not interested",
  callback_requested: "Callback requested",
  wrong_number: "Wrong number",
  do_not_call: "Do not call",
};

const statusLabels: Record<LeadStatus, string> = {
  new: "New",
  interested: "Interested",
  callback: "Callback",
  not_interested: "Not interested",
  onboarded: "Onboarded",
  do_not_call: "Do not call",
};

const emptyForm = { name: "", phone: "", email: "", location: "", source: "", notes: "" };

const formatPhone = (p: string) => {
  const d = p.replace(/\D+/g, "");
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 11 && d[0] === "1") return `+1 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  return p;
};

const formatWhen = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = Date.now();
  const diffH = (now - d.getTime()) / 36e5;
  if (diffH < 1) return "Just now";
  if (diffH < 24) return `${Math.floor(diffH)}h ago`;
  if (diffH < 24 * 7) return `${Math.floor(diffH / 24)}d ago`;
  return d.toLocaleDateString();
};

export const HaulerLeads = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [selected, setSelected] = useState<Lead | null>(null);
  const [copiedFor, setCopiedFor] = useState<string | null>(null);

  const fetchLeads = async () => {
    try {
      const data = await apiGet<Lead[]>("/leads");
      setLeads(data);
      if (selected) {
        const updated = data.find((l) => l.id === selected.id);
        if (updated) setSelected(updated);
      }
    } catch (err) {
      toast.error((err as Error).message || "Failed to load leads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const qDigits = q.replace(/\D+/g, "");
    return leads.filter((l) => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (!q) return true;
      const hay = `${l.name ?? ""} ${l.email ?? ""} ${l.location ?? ""} ${l.notes ?? ""}`.toLowerCase();
      const phoneMatch = qDigits.length >= 3 && l.phoneNormalized.includes(qDigits);
      return hay.includes(q) || phoneMatch;
    });
  }, [leads, query, statusFilter]);

  const onboardingLinkFor = (lead: Lead) =>
    `${window.location.origin}/hauler-onboarding?invite=${lead.onboardingToken}`;

  const copyLink = async (lead: Lead) => {
    try {
      await navigator.clipboard.writeText(onboardingLinkFor(lead));
      setCopiedFor(lead.id);
      toast.success("Onboarding link copied");
      setTimeout(() => setCopiedFor((c) => (c === lead.id ? null : c)), 2000);
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  };

  const addLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.phone.trim()) {
      toast.error("Phone is required");
      return;
    }
    setCreating(true);
    try {
      await apiPost<Lead>("/leads", { ...form });
      toast.success("Lead added");
      setForm(emptyForm);
      setShowAdd(false);
      await fetchLeads();
    } catch (err) {
      toast.error((err as Error).message || "Failed to add lead");
    } finally {
      setCreating(false);
    }
  };

  const removeLead = async (lead: Lead) => {
    if (!confirm(`Delete lead for ${lead.name ?? formatPhone(lead.phone)}? This also removes their call history.`)) return;
    try {
      await apiDelete(`/leads/${lead.id}`);
      toast.success("Lead deleted");
      if (selected?.id === lead.id) setSelected(null);
      await fetchLeads();
    } catch (err) {
      toast.error((err as Error).message || "Failed to delete");
    }
  };

  const updateStatus = async (lead: Lead, status: LeadStatus) => {
    try {
      await apiPatch(`/leads/${lead.id}`, { status });
      await fetchLeads();
    } catch (err) {
      toast.error((err as Error).message || "Failed to update");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Hauler Leads</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Outbound calls to potential haulers. Duplicates blocked by phone number.
          </p>
        </div>
        <Button onClick={() => setShowAdd((s) => !s)} className="gap-2">
          <Plus className="w-3 h-3" /> Add lead
        </Button>
      </div>

      {showAdd && (
        <form onSubmit={addLead} className="border-milled p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input className="bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
              placeholder="Name (optional)" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
              placeholder="Phone (required)" value={form.phone} type="tel"
              onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
            <input className="bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
              placeholder="Email (optional)" value={form.email} type="email"
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input className="bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
              placeholder="City / area" value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })} />
            <input className="bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary md:col-span-2"
              placeholder="Source (yard sign, referral, etc.)" value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })} />
            <textarea className="bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary md:col-span-2"
              placeholder="Notes" rows={2} value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => { setShowAdd(false); setForm(emptyForm); }}>Cancel</Button>
            <Button type="submit" disabled={creating}>
              {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save lead"}
            </Button>
          </div>
        </form>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, phone, notes…"
            className="w-full bg-background border border-border pl-8 pr-3 py-2 text-sm font-mono focus:outline-none focus:border-primary" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as LeadStatus | "all")}
          className="bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary">
          <option value="all">All statuses</option>
          {(Object.keys(statusLabels) as LeadStatus[]).map((s) => (
            <option key={s} value={s}>{statusLabels[s]}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground font-mono py-12 text-center">
          {leads.length === 0 ? "No leads yet. Add one to get started." : "No leads match your filters."}
        </p>
      ) : (
        <div className="border-milled divide-y divide-border">
          {filtered.map((l) => (
            <div key={l.id} className="p-3 flex items-start gap-3 hover:bg-secondary/30 transition-colors">
              <button onClick={() => setSelected(l)} className="flex-1 text-left min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm font-semibold truncate">{l.name ?? "Unnamed"}</span>
                  <span className={`text-[10px] font-mono uppercase px-2 py-0.5 ${statusColors[l.status]}`}>{statusLabels[l.status]}</span>
                  {l.calls.length > 0 && (
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {l.calls.length} call{l.calls.length === 1 ? "" : "s"} · last {formatWhen(l.lastCalledAt)}
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground font-mono mt-1 truncate">
                  <a href={`tel:${l.phone}`} className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                    {formatPhone(l.phone)}
                  </a>
                  {l.location && <span> · {l.location}</span>}
                  {l.source && <span> · {l.source}</span>}
                </div>
              </button>
              <button onClick={() => copyLink(l)} title="Copy onboarding link"
                className="p-2 hover:bg-primary/10 rounded transition-colors">
                {copiedFor === l.id ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
              </button>
              <button onClick={() => removeLead(l)} title="Delete lead"
                className="p-2 hover:bg-destructive/20 rounded transition-colors">
                <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <LeadDetail
          lead={selected}
          onClose={() => setSelected(null)}
          onRefresh={fetchLeads}
          onCopyLink={() => copyLink(selected)}
          onUpdateStatus={(s) => updateStatus(selected, s)}
        />
      )}
    </div>
  );
};

interface LeadDetailProps {
  lead: Lead;
  onClose: () => void;
  onRefresh: () => Promise<void>;
  onCopyLink: () => void;
  onUpdateStatus: (s: LeadStatus) => void;
}

const LeadDetail = ({ lead, onClose, onRefresh, onCopyLink, onUpdateStatus }: LeadDetailProps) => {
  const [outcome, setOutcome] = useState<CallOutcome>("no_answer");
  const [notes, setNotes] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [logging, setLogging] = useState(false);

  const logCall = async (e: React.FormEvent) => {
    e.preventDefault();
    setLogging(true);
    try {
      await apiPost(`/leads/${lead.id}/calls`, {
        outcome,
        notes: notes.trim() || null,
        nextFollowUpAt: followUp ? new Date(followUp).toISOString() : null,
      });
      toast.success("Call logged");
      setOutcome("no_answer");
      setNotes("");
      setFollowUp("");
      await onRefresh();
    } catch (err) {
      toast.error((err as Error).message || "Failed to log call");
    } finally {
      setLogging(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-background/80 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg bg-background border-l border-border overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-border flex items-center justify-between sticky top-0 bg-background z-10">
          <div className="min-w-0">
            <h3 className="font-semibold truncate">{lead.name ?? "Unnamed lead"}</h3>
            <a href={`tel:${lead.phone}`} className="text-xs font-mono text-primary hover:underline">{formatPhone(lead.phone)}</a>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-secondary rounded"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            {lead.email && <div className="col-span-2"><span className="text-muted-foreground">Email:</span> {lead.email}</div>}
            {lead.location && <div><span className="text-muted-foreground">Area:</span> {lead.location}</div>}
            {lead.source && <div><span className="text-muted-foreground">Source:</span> {lead.source}</div>}
            <div><span className="text-muted-foreground">Added:</span> {new Date(lead.createdAt).toLocaleDateString()}</div>
          </div>

          {lead.notes && (
            <div className="border-milled p-3 text-sm whitespace-pre-wrap">{lead.notes}</div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-mono uppercase">Status:</span>
            <select value={lead.status} onChange={(e) => onUpdateStatus(e.target.value as LeadStatus)}
              className="bg-background border border-border px-2 py-1 text-xs font-mono focus:outline-none focus:border-primary">
              {(Object.keys(statusLabels) as LeadStatus[]).map((s) => (
                <option key={s} value={s}>{statusLabels[s]}</option>
              ))}
            </select>
          </div>

          <div className="border-milled p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs uppercase tracking-widest font-mono text-muted-foreground">Onboarding invite</span>
              <Button size="sm" variant="outline" onClick={onCopyLink} className="gap-1 h-7 text-xs">
                <Copy className="w-3 h-3" /> Copy link
              </Button>
            </div>
            <p className="text-[10px] font-mono text-muted-foreground break-all">
              {`${window.location.origin}/hauler-onboarding?invite=${lead.onboardingToken}`}
            </p>
            <p className="text-[10px] font-mono text-muted-foreground">
              When they open this link, the onboarding form pre-fills their info and the lead is automatically marked as onboarded.
            </p>
          </div>

          <form onSubmit={logCall} className="border-milled p-3 space-y-3">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-primary" />
              <span className="text-xs uppercase tracking-widest font-mono">Log a call</span>
            </div>
            <select value={outcome} onChange={(e) => setOutcome(e.target.value as CallOutcome)}
              className="w-full bg-background border border-border px-2 py-2 text-sm font-mono focus:outline-none focus:border-primary">
              {(Object.keys(outcomeLabels) as CallOutcome[]).map((o) => (
                <option key={o} value={o}>{outcomeLabels[o]}</option>
              ))}
            </select>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              placeholder="Notes from the call (optional)"
              className="w-full bg-background border border-border px-2 py-2 text-sm font-mono focus:outline-none focus:border-primary" />
            <label className="block text-[10px] uppercase font-mono text-muted-foreground">Follow up on (optional)</label>
            <input type="datetime-local" value={followUp} onChange={(e) => setFollowUp(e.target.value)}
              className="w-full bg-background border border-border px-2 py-2 text-sm font-mono focus:outline-none focus:border-primary" />
            <Button type="submit" disabled={logging} className="w-full gap-2">
              {logging ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
              Log call
            </Button>
          </form>

          <div>
            <div className="text-xs uppercase tracking-widest font-mono text-muted-foreground mb-2">
              Call history ({lead.calls.length})
            </div>
            {lead.calls.length === 0 ? (
              <p className="text-sm text-muted-foreground font-mono py-3">No calls logged yet.</p>
            ) : (
              <div className="space-y-2">
                {lead.calls.map((c) => (
                  <div key={c.id} className="border-milled p-2 text-xs font-mono space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{outcomeLabels[c.outcome]}</span>
                      <span className="text-muted-foreground">{new Date(c.createdAt).toLocaleString()}</span>
                    </div>
                    {c.notes && <p className="text-muted-foreground whitespace-pre-wrap">{c.notes}</p>}
                    {c.nextFollowUpAt && (
                      <p className="text-amber-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Follow up {new Date(c.nextFollowUpAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {lead.status === "onboarded" && (
            <div className="border-milled p-3 bg-primary/10 text-xs font-mono flex items-center gap-2">
              <ExternalLink className="w-3 h-3 text-primary" />
              This lead has submitted the onboarding form. Review them on the Haulers page.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
