import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Loader2, Plus, Trash2, X, ShieldCheck, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiGet, apiPatch, apiPost, apiDelete } from "@/lib/apiClient";
import { toast } from "sonner";

type HaulerStatus = "pending" | "approved" | "rejected" | "suspended";

interface HaulerRow {
  id: string;
  userId: string;
  businessName: string;
  vehicleType: string | null;
  vehiclePlate: string | null;
  licenseNumber: string | null;
  serviceAreas: string[];
  status: HaulerStatus;
  bgConsent: boolean;
  verified: boolean;
  trainingCompleted: boolean;
  createdAt: string;
  profileName: string | null;
  profileEmail: string | null;
}

const statusColors: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  approved: "bg-green-500/20 text-green-500",
  rejected: "bg-destructive/20 text-destructive",
  suspended: "bg-primary/20 text-primary",
};

const emptyForm = {
  businessName: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  vehicleType: "pickup_truck",
  vehiclePlate: "",
  licenseNumber: "",
  serviceAreas: "",
  status: "approved" as HaulerStatus,
};

export const HaulerManagement = () => {
  const [haulers, setHaulers] = useState<HaulerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<HaulerRow | null>(null);
  const [updating, setUpdating] = useState(false);
  const [filter, setFilter] = useState<HaulerStatus | "all">("all");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);

  const fetchHaulers = async () => {
    try {
      const data = await apiGet<any[]>("/haulers");
      setHaulers(
        data.map((h) => ({
          id: h.id,
          userId: h.userId,
          businessName: h.businessName || h.profileName || "Unnamed",
          vehicleType: h.vehicleType,
          vehiclePlate: h.vehiclePlate,
          licenseNumber: h.licenseNumber,
          serviceAreas: h.serviceAreas || [],
          status: h.status,
          bgConsent: h.backgroundCheckConsent || false,
          verified: h.verified || false,
          trainingCompleted: h.trainingCompleted || false,
          createdAt: h.createdAt,
          profileName: h.profileName || null,
          profileEmail: h.profileEmail || null,
        }))
      );
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchHaulers();
  }, []);

  const updateHaulerStatus = async (haulerId: string, newStatus: HaulerStatus) => {
    setUpdating(true);
    try {
      await apiPatch(`/haulers/${haulerId}`, { status: newStatus });
      toast.success(`Hauler ${newStatus}`);
      fetchHaulers();
      if (selected?.id === haulerId) {
        setSelected((prev) => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err: any) {
      toast.error("Failed to update hauler status");
      console.error(err);
    }
    setUpdating(false);
  };

  const toggleVerified = async (haulerId: string, nextVerified: boolean) => {
    setUpdating(true);
    try {
      await apiPatch(`/haulers/${haulerId}`, { verified: nextVerified });
      toast.success(nextVerified ? "Marked as Verified" : "Verification removed");
      fetchHaulers();
      if (selected?.id === haulerId) {
        setSelected((prev) => prev ? { ...prev, verified: nextVerified } : null);
      }
    } catch (err: any) {
      toast.error("Failed to update verification");
      console.error(err);
    }
    setUpdating(false);
  };

  const createHauler = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.businessName.trim() || !form.vehicleType.trim() || !form.vehiclePlate.trim()) {
      toast.error("Business name, vehicle type, and plate are required");
      return;
    }
    setCreating(true);
    try {
      await apiPost("/haulers/admin", {
        businessName: form.businessName.trim(),
        contactName: form.contactName.trim() || undefined,
        contactEmail: form.contactEmail.trim() || undefined,
        contactPhone: form.contactPhone.trim() || undefined,
        vehicleType: form.vehicleType.trim(),
        vehiclePlate: form.vehiclePlate.trim(),
        licenseNumber: form.licenseNumber.trim() || undefined,
        serviceAreas: form.serviceAreas
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        status: form.status,
      });
      toast.success("Hauler added");
      setForm(emptyForm);
      setShowAdd(false);
      fetchHaulers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add hauler");
    }
    setCreating(false);
  };

  const deleteHauler = async (haulerId: string, name: string) => {
    if (!window.confirm(`Permanently delete hauler "${name}"? This cannot be undone.`)) return;
    setUpdating(true);
    try {
      await apiDelete(`/haulers/${haulerId}`);
      toast.success("Hauler deleted");
      if (selected?.id === haulerId) setSelected(null);
      fetchHaulers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete hauler");
    }
    setUpdating(false);
  };

  const filtered = filter === "all" ? haulers : haulers.filter((h) => h.status === filter);
  const pendingCount = haulers.filter((h) => h.status === "pending").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold uppercase tracking-widest">Hauler Management</h2>
          <p className="text-sm text-muted-foreground font-mono mt-1">
            {haulers.length} total · {pendingCount} pending review
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {(["all", "pending", "approved", "rejected", "suspended"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest transition-colors ${
                filter === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
          <Button size="sm" className="gap-1.5 ml-2" onClick={() => setShowAdd(true)}>
            <Plus className="w-3 h-3" /> Add Hauler
          </Button>
        </div>
      </div>

      {/* Add Hauler modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-background/80 flex items-center justify-center p-4" onClick={() => !creating && setShowAdd(false)}>
          <div className="bg-card border-milled w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="text-sm font-bold uppercase tracking-widest">Add Hauler</h3>
              <button onClick={() => !creating && setShowAdd(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={createHauler} className="p-5 space-y-3">
              {[
                { key: "businessName", label: "Business Name *", placeholder: "Smith Hauling LLC", required: true },
                { key: "contactName", label: "Contact Name", placeholder: "John Smith" },
                { key: "contactEmail", label: "Contact Email", placeholder: "john@example.com", type: "email" },
                { key: "contactPhone", label: "Contact Phone", placeholder: "(555) 123-4567", type: "tel" },
                { key: "vehiclePlate", label: "Vehicle Plate *", placeholder: "ABC-1234", required: true },
                { key: "licenseNumber", label: "License Number", placeholder: "D1234567" },
                { key: "serviceAreas", label: "Service Areas (comma-separated)", placeholder: "Portland, Beaverton, Tigard" },
              ].map((f) => (
                <div key={f.key}>
                  <label className="text-xs uppercase tracking-widest text-muted-foreground block mb-1.5 font-mono">{f.label}</label>
                  <input
                    type={f.type || "text"}
                    value={form[f.key as keyof typeof form] as string}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    placeholder={f.placeholder}
                    required={f.required}
                    className="w-full bg-secondary px-3 py-2 text-sm font-mono outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              ))}
              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground block mb-1.5 font-mono">Vehicle Type *</label>
                <select
                  value={form.vehicleType}
                  onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}
                  className="w-full bg-secondary px-3 py-2 text-sm font-mono outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="pickup_truck">Pickup Truck</option>
                  <option value="box_truck">Box Truck</option>
                  <option value="dump_truck">Dump Truck</option>
                  <option value="trailer">Trailer</option>
                  <option value="van">Van</option>
                </select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground block mb-1.5 font-mono">Initial Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as HaulerStatus })}
                  className="w-full bg-secondary px-3 py-2 text-sm font-mono outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="approved">Approved (immediately active)</option>
                  <option value="pending">Pending Review</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              <div className="flex gap-2 pt-3 border-t border-border">
                <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => setShowAdd(false)} disabled={creating}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="flex-1 gap-2" disabled={creating}>
                  {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                  Add Hauler
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="md:grid md:grid-cols-3 md:gap-6">
        {/* List */}
        <div className="col-span-2 space-y-2">
          {filtered.length === 0 ? (
            <div className="border-milled p-8 text-center text-muted-foreground font-mono text-sm">
              No haulers found
            </div>
          ) : (
            filtered.map((h) => (
              <button
                key={h.id}
                onClick={() => setSelected(h)}
                className={`w-full text-left border-milled p-4 transition-colors ${
                  selected?.id === h.id ? "bg-secondary/20 border-primary/40" : "hover:bg-secondary/30"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm">{h.businessName}</span>
                  <span className={`text-[10px] font-mono uppercase px-2 py-0.5 ${statusColors[h.status]}`}>
                    {h.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
                  {h.profileEmail && <span>{h.profileEmail}</span>}
                  {h.vehicleType && <span>{h.vehicleType.replace("_", " ")}</span>}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Detail */}
        {selected && (
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest mb-4">Hauler Detail</h3>
            <div className="border-milled p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold flex items-center gap-2">
                  {selected.businessName}
                  {selected.verified && (
                    <ShieldCheck className="w-4 h-4 text-primary" aria-label="Verified" />
                  )}
                </span>
                <span className={`text-[10px] font-mono uppercase px-2 py-0.5 ${statusColors[selected.status]}`}>
                  {selected.status}
                </span>
              </div>

              <div className="border-t border-border pt-4 space-y-3">
                {[
                  { label: "Name", value: selected.profileName || "—" },
                  { label: "Email", value: selected.profileEmail || "—" },
                  { label: "Vehicle", value: selected.vehicleType?.replace("_", " ").toUpperCase() || "—" },
                  { label: "Plate", value: selected.vehiclePlate || "—" },
                  { label: "License", value: selected.licenseNumber || "—" },
                  { label: "Areas", value: selected.serviceAreas.join(", ") || "—" },
                  { label: "BG Check", value: selected.bgConsent ? "Consented" : "Declined / skipped" },
                  { label: "Verified", value: selected.verified ? "Yes" : "No" },
                  { label: "Training", value: selected.trainingCompleted ? "Complete" : "Incomplete" },
                  { label: "Applied", value: new Date(selected.createdAt).toLocaleDateString() },
                ].map((f) => (
                  <div key={f.label} className="flex justify-between">
                    <span className="text-xs uppercase tracking-widest text-muted-foreground">{f.label}</span>
                    <span className="text-sm font-mono text-right max-w-[60%] truncate">{f.value}</span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-4">
                {selected.status === "pending" && (
                  <>
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full gap-2"
                      onClick={() => updateHaulerStatus(selected.id, "approved")}
                      disabled={updating}
                    >
                      {updating ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                      Approve Hauler
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2 text-destructive hover:bg-destructive/10"
                      onClick={() => updateHaulerStatus(selected.id, "rejected")}
                      disabled={updating}
                    >
                      <XCircle className="w-3 h-3" /> Reject
                    </Button>
                  </>
                )}
                {selected.status === "approved" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 text-destructive hover:bg-destructive/10"
                    onClick={() => updateHaulerStatus(selected.id, "suspended")}
                    disabled={updating}
                  >
                    <XCircle className="w-3 h-3" /> Suspend Hauler
                  </Button>
                )}
                {(selected.status === "rejected" || selected.status === "suspended") && (
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => updateHaulerStatus(selected.id, "approved")}
                    disabled={updating}
                  >
                    {updating ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                    Re-approve Hauler
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => toggleVerified(selected.id, !selected.verified)}
                  disabled={updating}
                >
                  {selected.verified ? (
                    <>
                      <Shield className="w-3 h-3" /> Remove Verified Badge
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3 h-3" /> Mark as Verified
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 text-destructive hover:bg-destructive/10 border-destructive/40"
                  onClick={() => deleteHauler(selected.id, selected.businessName)}
                  disabled={updating}
                >
                  <Trash2 className="w-3 h-3" /> Delete Hauler
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
