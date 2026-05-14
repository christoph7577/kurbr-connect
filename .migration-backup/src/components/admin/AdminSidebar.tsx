import { Link } from "react-router-dom";
import { LayoutDashboard, Truck, Users, LogOut, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export type AdminView = "dashboard" | "haulers";

interface AdminSidebarProps {
  open: boolean;
  onClose: () => void;
  activeView: AdminView;
  onChangeView: (view: AdminView) => void;
}

const navItems: { icon: typeof LayoutDashboard; label: string; view: AdminView }[] = [
  { icon: LayoutDashboard, label: "Dashboard", view: "dashboard" },
  { icon: Users, label: "Haulers", view: "haulers" },
];

export const AdminSidebar = ({ open, onClose, activeView, onChangeView }: AdminSidebarProps) => {
  const { signOut } = useAuth();

  const handleNav = (view: AdminView) => {
    onChangeView(view);
    onClose();
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && <div className="fixed inset-0 bg-background/80 z-40 md:hidden" onClick={onClose} />}

      <aside className={`${open ? "fixed" : "hidden"} md:relative md:flex z-50 w-60 bg-sidebar border-r border-sidebar-border flex-col shrink-0 h-full`}>
        <div className="p-6 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold tracking-[-0.06em]">
            KURBR<span className="text-primary">.</span>
          </Link>
          <button onClick={onClose} className="md:hidden text-sidebar-foreground/60">
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 px-3">
          {navItems.map((item) => (
            <button
              key={item.view}
              onClick={() => handleNav(item.view)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm mb-1 transition-colors ${
                activeView === item.view
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              }`}
            >
              <item.icon className="w-4 h-4" />
              <span className="uppercase tracking-widest text-xs">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground"
          >
            <LogOut className="w-4 h-4" />
            <span className="uppercase tracking-widest text-xs">Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};
