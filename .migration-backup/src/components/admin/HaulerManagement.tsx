import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Loader2, ChevronDown, Truck, MapPin, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type HaulerStatus = Database["public"]["Enums"]["hauler_status"];

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

export const HaulerManagement = () => {
  const [haulers, setHaulers] = useState<HaulerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<HaulerRow | null>(null);
  const [updating, setUpdating] = useState(false);
  const [filter, setFilter] = useState<HaulerStatus | "all">("all");

  const fetchHaulers = async () => {
    const { data, error } = await supabase
      .from("hauler_profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    // Get profile info for all haulers
    const userIds = data.map((h) => h.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

    setHaulers(
      data.map((h) => {
        const profile = profileMap.get(h.user_id);
        return {
          id: h.id,
          userId: h.user_id,
          businessName: h.business_name || profile?.full_name || "Unnamed",
          vehicleType: h.vehicle_type,
          vehiclePlate: h.vehicle_plate,
          licenseNumber: h.license_number,
          serviceAreas: h.service_areas || [],
          status: h.status,
          bgConsent: h.background_check_consent || false,
          trainingCompleted: h.training_completed || false,
          createdAt: h.created_at,
          profileName: profile?.full_name || null,
          profileEmail: profile?.email || null,
        };
      })
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchHaulers();
  }, []);

  const updateHaulerStatus = async (haulerId: string, newStatus: HaulerStatus) => {
    setUpdating(true);
    const { error } = await supabase
      .from("hauler_profiles")
      .update({ status: newStatus })
      .eq("id", haulerId);

    if (error) {
      toast.error("Failed to update hauler status");
      console.error(error);
    } else {
      toast.success(`Hauler ${newStatus}`);
      fetchHaulers();
      if (selected?.id === haulerId) {
        setSelected((prev) => prev ? { ...prev, status: newStatus } : null);
      }
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
        <div className="flex gap-2">
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
        </div>
      </div>

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
              <div className="flex items-center justify-between">
                <span className="font-bold">{selected.businessName}</span>
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
                  { label: "BG Check", value: selected.bgConsent ? "Consented" : "No" },
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
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
