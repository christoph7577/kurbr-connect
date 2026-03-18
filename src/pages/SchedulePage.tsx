import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Clock, Camera, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const springBolt = { type: "spring" as const, stiffness: 400, damping: 30 };

type ServiceType = "residential" | "commercial" | "specialty" | null;

const SchedulePage = () => {
  const [step, setStep] = useState(0);
  const [service, setService] = useState<ServiceType>(null);
  const [address, setAddress] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [description, setDescription] = useState("");

  const steps = ["Service", "Location", "Schedule", "Details", "Confirm"];

  const canNext = () => {
    if (step === 0) return !!service;
    if (step === 1) return address.length > 3;
    if (step === 2) return !!date && !!time;
    if (step === 3) return true;
    return true;
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <nav className="border-b border-border">
        <div className="container flex items-center justify-between h-16">
          <Link to="/" className="text-xl font-bold tracking-[-0.06em]">
            KURBR<span className="text-primary">.</span>
          </Link>
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono">Schedule Pickup</p>
        </div>
      </nav>

      <div className="container max-w-2xl py-16">
        {/* Progress */}
        <div className="flex items-center gap-1 mb-16">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-1 flex-1">
              <div className={`h-1 flex-1 transition-colors ${i <= step ? 'bg-primary' : 'bg-secondary'}`} />
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 0: Service */}
          {step === 0 && (
            <motion.div
              key="service"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={springBolt}
            >
              <p className="text-primary font-mono text-sm uppercase tracking-widest mb-4">Step 01</p>
              <h2 className="text-3xl md:text-4xl font-bold mb-10">What are we hauling?</h2>

              <div className="grid gap-3">
                {([
                  { id: "residential" as const, title: "RESIDENTIAL", desc: "Furniture, appliances, yard waste, debris", price: "From $89" },
                  { id: "commercial" as const, title: "COMMERCIAL", desc: "Office equipment, construction materials", price: "Custom" },
                  { id: "specialty" as const, title: "SPECIALTY", desc: "E-waste, donations, hazardous materials", price: "From $120" },
                ]).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setService(s.id)}
                    className={`border-milled p-6 text-left transition-colors ${
                      service === s.id ? 'border-primary bg-primary/5' : 'hover:bg-secondary/50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-sm uppercase tracking-widest mb-1">{s.title}</h3>
                        <p className="text-sm text-muted-foreground">{s.desc}</p>
                      </div>
                      <span className="font-mono text-primary text-sm">{s.price}</span>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 1: Location */}
          {step === 1 && (
            <motion.div
              key="location"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={springBolt}
            >
              <p className="text-primary font-mono text-sm uppercase tracking-widest mb-4">Step 02</p>
              <h2 className="text-3xl md:text-4xl font-bold mb-10">Where's the pickup?</h2>

              <div className="space-y-6">
                <div>
                  <label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block">Address</label>
                  <div className="relative">
                    <MapPin className="absolute left-0 top-3 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="123 Main St, Salt Lake City, UT"
                      className="w-full bg-transparent border-b-2 border-secondary focus:border-primary outline-none transition-colors py-2 pl-6 font-mono"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Schedule */}
          {step === 2 && (
            <motion.div
              key="schedule"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={springBolt}
            >
              <p className="text-primary font-mono text-sm uppercase tracking-widest mb-4">Step 03</p>
              <h2 className="text-3xl md:text-4xl font-bold mb-10">When do you need us?</h2>

              <div className="space-y-6">
                <div>
                  <label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block">Date</label>
                  <div className="relative">
                    <Clock className="absolute left-0 top-3 w-4 h-4 text-muted-foreground" />
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-transparent border-b-2 border-secondary focus:border-primary outline-none transition-colors py-2 pl-6 font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block">Time Slot</label>
                  <div className="grid grid-cols-3 gap-3">
                    {["08:00", "10:00", "12:00", "14:00", "16:00", "18:00"].map((t) => (
                      <button
                        key={t}
                        onClick={() => setTime(t)}
                        className={`border-milled p-3 font-mono text-sm transition-colors ${
                          time === t ? 'border-primary bg-primary/5 text-primary' : 'hover:bg-secondary/50 text-muted-foreground'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Details */}
          {step === 3 && (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={springBolt}
            >
              <p className="text-primary font-mono text-sm uppercase tracking-widest mb-4">Step 04</p>
              <h2 className="text-3xl md:text-4xl font-bold mb-10">Anything else?</h2>

              <div className="space-y-6">
                <div>
                  <label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block">Description (optional)</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    placeholder="Old couch, broken dresser, 3 bags of yard waste..."
                    className="w-full bg-transparent border-2 border-secondary focus:border-primary outline-none transition-colors p-4 font-mono resize-none"
                  />
                </div>
                <button className="border-milled border-dashed p-8 w-full flex flex-col items-center gap-2 text-muted-foreground hover:text-primary hover:border-primary transition-colors">
                  <Camera className="w-6 h-6" />
                  <span className="text-xs uppercase tracking-widest">Add Photos</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Confirm */}
          {step === 4 && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={springBolt}
            >
              <p className="text-primary font-mono text-sm uppercase tracking-widest mb-4">Confirm</p>
              <h2 className="text-3xl md:text-4xl font-bold mb-10">Review your booking</h2>

              <div className="border-milled divide-y divide-border">
                <div className="p-6 flex justify-between">
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">Service</span>
                  <span className="font-mono text-sm uppercase">{service}</span>
                </div>
                <div className="p-6 flex justify-between">
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">Location</span>
                  <span className="font-mono text-sm">{address}</span>
                </div>
                <div className="p-6 flex justify-between">
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">Date & Time</span>
                  <span className="font-mono text-sm">{date} · {time}</span>
                </div>
                {description && (
                  <div className="p-6 flex justify-between">
                    <span className="text-xs uppercase tracking-widest text-muted-foreground">Notes</span>
                    <span className="font-mono text-sm max-w-xs text-right">{description}</span>
                  </div>
                )}
                <div className="p-6 flex justify-between">
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">Estimated Price</span>
                  <span className="font-mono text-lg text-primary font-bold">$180</span>
                </div>
              </div>

              <Link to="/tracking">
                <Button variant="hero" className="w-full mt-8 gap-2">
                  <Check className="w-4 h-4" /> Confirm Booking
                </Button>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        {step < 4 && (
          <div className="flex justify-between mt-16">
            <Button
              variant="ghost"
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
            <Button
              variant="default"
              onClick={() => setStep(step + 1)}
              disabled={!canNext()}
              className="gap-2"
            >
              Next <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SchedulePage;
