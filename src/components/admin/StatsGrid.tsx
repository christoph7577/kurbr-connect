import { motion } from "framer-motion";
import { Truck, Clock, Users, DollarSign } from "lucide-react";

const springBolt = { type: "spring" as const, stiffness: 400, damping: 30 };

const stats = [
  { label: "Active Jobs", value: "12", icon: Truck, change: "+3" },
  { label: "Avg ETA", value: "14:32", icon: Clock, change: "-2m" },
  { label: "Haulers Online", value: "8", icon: Users, change: "+1" },
  { label: "Today Revenue", value: "$2,847", icon: DollarSign, change: "+$420" },
];

export const StatsGrid = () => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
    {stats.map((stat, i) => (
      <motion.div
        key={stat.label}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springBolt, delay: i * 0.05 }}
        className="border-milled p-4 md:p-5"
      >
        <div className="flex items-center justify-between mb-2 md:mb-3">
          <stat.icon className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-mono text-primary">{stat.change}</span>
        </div>
        <p className="text-xl md:text-2xl font-mono font-bold">{stat.value}</p>
        <p className="text-[10px] md:text-xs uppercase tracking-widest text-muted-foreground mt-1">{stat.label}</p>
      </motion.div>
    ))}
  </div>
);
