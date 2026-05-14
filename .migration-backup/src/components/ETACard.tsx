import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export const ETACard = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (d: Date) => {
    return d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  return (
    <div className="border-milled shadow-card bg-card p-8 relative overflow-hidden">
      {/* Milled highlight */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />
      
      <div className="flex items-center justify-between mb-8">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono">Live ETA</p>
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse-orange" />
      </div>

      <motion.p
        key={time.getSeconds()}
        initial={{ opacity: 0.5 }}
        animate={{ opacity: 1 }}
        className="text-6xl md:text-7xl font-mono font-bold tracking-tight text-foreground mb-8"
      >
        {formatTime(time)}
      </motion.p>

      <div className="space-y-4">
        <div className="flex justify-between items-center border-b border-border pb-3">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">Status</span>
          <span className="text-xs font-mono text-primary uppercase">EN ROUTE</span>
        </div>
        <div className="flex justify-between items-center border-b border-border pb-3">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">Hauler</span>
          <span className="text-xs font-mono text-foreground">UNIT-047</span>
        </div>
        <div className="flex justify-between items-center border-b border-border pb-3">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">Distance</span>
          <span className="text-xs font-mono text-foreground">2.4 MI</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">Plate</span>
          <span className="text-xs font-mono text-foreground">UT · 4K3 M91</span>
        </div>
      </div>

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary" />
    </div>
  );
};
