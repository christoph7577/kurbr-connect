import { Link } from "react-router-dom";
import { LayoutDashboard, Truck, Users, Calendar, Settings, LogOut, X } from "lucide-react";

interface AdminSidebarProps {
  open: boolean;
  onClose: () => void;
}

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: Truck, label: "Jobs", active: false },
  { icon: Users, label: "Haulers", active: false },
  { icon: Calendar, label: "Schedule", active: false },
  { icon: Settings, label: "Settings", active: false },
];

export const AdminSidebar = ({ open, onClose }: AdminSidebarProps) => {
  if (!open) return null;

  return (
    <>
      {/* Mobile overlay */}
      <div className="fixed inset-0 bg-background/80 z-40 md:hidden" onClick={onClose} />

      <aside className="fixed md:relative z-50 w-60 bg-sidebar border-r border-sidebar-border flex flex-col shrink-0 h-full">
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
              key={item.label}
              onClick={onClose}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm mb-1 transition-colors ${
                item.active
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
          <button className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground">
            <LogOut className="w-4 h-4" />
            <span className="uppercase tracking-widest text-xs">Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};
