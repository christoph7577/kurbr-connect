import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Phone, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const springBolt = { type: "spring" as const, stiffness: 400, damping: 30 };

const statuses = [
  { id: "confirmed", label: "CONFIRMED" },
  { id: "dispatched", label: "DISPATCHED" },
  { id: "en_route", label: "EN ROUTE" },
  { id: "arrived", label: "ARRIVED" },
  { id: "completed", label: "COMPLETED" },
];

const TrackingPage = () => {
  const [currentStatus, setCurrentStatus] = useState(2); // en_route
  const [eta, setEta] = useState(847); // seconds
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setEta((prev) => {
        if (prev <= 1) {
          // Simulate arrival
          setCurrentStatus(3);
          setFlash(true);
          setTimeout(() => setFlash(false), 300);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatEta = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <AnimatePresence>
      <motion.div
        className={`min-h-screen flex flex-col transition-colors duration-300 ${
          flash ? 'bg-primary' : 'bg-background'
        }`}
      >
        {/* Header */}
        <nav className="glass">
          <div className="container flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2 text-foreground">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-xs uppercase tracking-widest">Back</span>
            </Link>
            <p className="text-xl font-bold tracking-[-0.06em]">
              KURBR<span className="text-primary">.</span>
            </p>
            <p className="text-xs font-mono text-muted-foreground">JOB-2847</p>
          </div>
        </nav>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
          {/* Big ETA */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={springBolt}
            className="text-center mb-16"
          >
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-4">
              Estimated Arrival
            </p>
            <motion.p
              key={eta}
              initial={{ opacity: 0.7 }}
              animate={{ opacity: 1 }}
              className="text-7xl md:text-9xl font-mono font-bold tracking-tight text-foreground"
            >
              {formatEta(eta)}
            </motion.p>
            <p className="text-sm text-muted-foreground mt-4 font-mono">
              {currentStatus >= 3 ? "HAULER HAS ARRIVED" : "MINUTES REMAINING"}
            </p>
          </motion.div>

          {/* Status Steps */}
          <div className="w-full max-w-md mb-16">
            <div className="flex items-center">
              {statuses.map((s, i) => (
                <div key={s.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-3 h-3 rounded-full transition-colors ${
                        i <= currentStatus ? 'bg-primary' : 'bg-secondary'
                      }`}
                    />
                    <p className={`text-[10px] mt-2 uppercase tracking-widest ${
                      i <= currentStatus ? 'text-primary' : 'text-muted-foreground'
                    }`}>
                      {s.label}
                    </p>
                  </div>
                  {i < statuses.length - 1 && (
                    <div className={`h-px flex-1 mx-1 transition-colors ${
                      i < currentStatus ? 'bg-primary' : 'bg-secondary'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Hauler Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springBolt, delay: 0.2 }}
            className="w-full max-w-md glass p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Your Hauler</p>
                <p className="font-bold">Marcus J.</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-mono text-muted-foreground">UNIT-047</p>
                <p className="text-xs font-mono text-muted-foreground">UT · 4K3 M91</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 gap-2">
                <Phone className="w-4 h-4" /> Call
              </Button>
              <Button variant="outline" className="flex-1 gap-2">
                <MessageSquare className="w-4 h-4" /> Message
              </Button>
            </div>
          </motion.div>

          {/* Cancel */}
          <Button variant="ghost" className="mt-8 text-destructive">
            Cancel Pickup
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default TrackingPage;
