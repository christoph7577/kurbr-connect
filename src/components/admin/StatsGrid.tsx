import { motion } from "framer-motion";
import { Truck, Clock, AlertTriangle, DollarSign } from "lucide-react";

const springBolt = { type: "spring" as const, stiffness: 400, damping: 30 };

interface StatsGridProps {
  stats?: {
    activeJobs: string;
    unassigned: string;
    totalJobs: string;
    todayRevenue: string;
  };
}

export const StatsGrid = ({ stats }: StatsGridProps) => {
  const items = [
    { label: "Active Jobs", value: stats?.activeJobs || "0", icon: Truck },
    { label: "Unassigned", value: stats?.unassigned || "0", icon: AlertTriangle },
    { label: "Total Jobs", value: stats?.totalJobs || "0", icon: Clock },
    { label: "Revenue", value: stats?.todayRevenue || "$0", icon: DollarSign },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
      {items.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springBolt, delay: i * 0.05 }}
          className="border-milled p-4 md:p-5"
        >
          <div className="flex items-center justify-between mb-2 md:mb-3">
            <stat.icon className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-xl md:text-2xl font-mono font-bold">{stat.value}</p>
          <p className="text-[10px] md:text-xs uppercase tracking-widest text-muted-foreground mt-1">{stat.label}</p>
        </motion.div>
      ))}
    </div>
  );
};
