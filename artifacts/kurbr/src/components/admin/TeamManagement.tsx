import { useEffect, useState } from "react";
import { Loader2, Plus, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiGet, apiPost, apiDelete } from "@/lib/apiClient";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface AdminUser {
  id: string;
  email: string | null;
  fullName: string | null;
  createdAt: number | string;
}

export const TeamManagement = () => {
  const { userId: currentUserId } = useAuth();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [email, setEmail] = useState("");

  const fetchAdmins = async () => {
    try {
      const data = await apiGet<AdminUser[]>("/profile/admins");
      setAdmins(data);
    } catch (err) {
      toast.error((err as Error).message || "Failed to load team");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const addAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!normalized || !normalized.includes("@")) {
      toast.error("Enter a valid email");
      return;
    }
    setAdding(true);
    try {
      await apiPost("/profile/admins", { email: normalized });
      toast.success(`${normalized} is now an admin. Ask them to sign out and back in.`);
      setEmail("");
      await fetchAdmins();
    } catch (err) {
      toast.error((err as Error).message || "Failed to add admin");
    } finally {
      setAdding(false);
    }
  };

  const removeAdmin = async (admin: AdminUser) => {
    if (!confirm(`Remove admin access for ${admin.email ?? admin.id}?`)) return;
    setRemoving(admin.id);
    try {
      await apiDelete(`/profile/admins/${admin.id}`);
      toast.success("Admin access removed");
      await fetchAdmins();
    } catch (err) {
      toast.error((err as Error).message || "Failed to remove admin");
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-bold tracking-tight">Team & Admin Access</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Admins can view all jobs, dispatch haulers, and manage the team. To add a teammate:
          have them sign up at the regular signup page first, then enter their email below.
        </p>
      </div>

      <form onSubmit={addAdmin} className="border-milled p-4 space-y-3">
        <div className="flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-primary" />
          <span className="text-xs uppercase tracking-widest font-mono">Promote teammate to admin</span>
        </div>
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teammate@example.com"
            autoComplete="email"
            className="flex-1 bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
            disabled={adding}
          />
          <Button type="submit" disabled={adding || !email.trim()} className="gap-2">
            {adding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            Add admin
          </Button>
        </div>
        <p className="text-xs text-muted-foreground font-mono">
          The user must already have a KURBR account. After promotion, they need to sign out
          and back in for the new role to take effect.
        </p>
      </form>

      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs uppercase tracking-widest text-muted-foreground font-mono">
            Current admins {admins.length > 0 && `(${admins.length})`}
          </span>
        </div>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : admins.length === 0 ? (
          <p className="text-sm text-muted-foreground font-mono py-4">No admins found.</p>
        ) : (
          <div className="border-milled divide-y divide-border">
            {admins.map((a) => {
              const isSelf = currentUserId === a.id;
              return (
                <div key={a.id} className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-mono truncate">{a.email ?? "—"}</p>
                      {a.fullName && (
                        <p className="text-xs text-muted-foreground truncate">{a.fullName}</p>
                      )}
                    </div>
                    {isSelf && (
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 bg-primary/10 text-primary shrink-0">
                        You
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => removeAdmin(a)}
                    disabled={isSelf || removing === a.id}
                    className="p-1.5 hover:bg-destructive/20 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
                    title={isSelf ? "You can't remove yourself" : "Remove admin"}
                  >
                    {removing === a.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-milled p-4 bg-secondary/20">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-2">How team login works</p>
        <ol className="text-sm space-y-1.5 list-decimal pl-5">
          <li>Teammate visits <span className="font-mono text-primary">/signup</span> and creates a normal account with their work email.</li>
          <li>You enter that email above and click <span className="font-mono">Add admin</span>.</li>
          <li>They sign out and back in at <span className="font-mono text-primary">/login</span> — they'll now see the admin dashboard.</li>
        </ol>
      </div>
    </div>
  );
};
