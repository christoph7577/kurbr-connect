import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  User,
  Truck,
  FileText,
  ShieldCheck,
  BookOpen,
  Check,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { apiPost } from "@/lib/apiClient";
import { toast } from "sonner";
import scrappyThumbsup from "@/assets/scrappy-thumbsup.png";

const springBolt = { type: "spring" as const, stiffness: 400, damping: 30 };

const steps = [
  { label: "Info", icon: User },
  { label: "Vehicle", icon: Truck },
  { label: "Documents", icon: FileText },
  { label: "Background", icon: ShieldCheck },
  { label: "Training", icon: BookOpen },
];

const trainingModules = [
  { id: "safety", title: "SAFETY PROTOCOLS", duration: "12 min", desc: "Lifting standards, PPE requirements, hazardous materials handling." },
  { id: "customer", title: "CUSTOMER SERVICE", duration: "8 min", desc: "Communication standards, arrival protocol, photo documentation." },
  { id: "platform", title: "PLATFORM USAGE", duration: "10 min", desc: "App navigation, job acceptance, status updates, payment flow." },
  { id: "compliance", title: "LEGAL & COMPLIANCE", duration: "6 min", desc: "Disposal regulations, recycling requirements, liability protocols." },
];

const HaulerOnboardingPage = () => {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Step 0: Personal info
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");

  // Step 1: Vehicle
  const [vehicleType, setVehicleType] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [serviceAreas, setServiceAreas] = useState<string[]>([]);

  // Step 2: Documents
  const [driversLicense, setDriversLicense] = useState(false);
  const [insurance, setInsurance] = useState(false);
  const [businessLicense, setBizLicense] = useState(false);

  // Step 3: Background check
  const [bgConsent, setBgConsent] = useState(false);

  // Step 4: Training
  const [completedModules, setCompletedModules] = useState<string[]>([]);

  const areas = ["Salt Lake City", "Provo/Orem", "Ogden", "Park City"];
  const vehicleTypes = [
    { id: "pickup", label: "PICKUP TRUCK" },
    { id: "box_truck", label: "BOX TRUCK" },
    { id: "trailer", label: "TRUCK + TRAILER" },
    { id: "dump_truck", label: "DUMP TRUCK" },
  ];

  const toggleArea = (area: string) =>
    setServiceAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );

  const toggleModule = (id: string) =>
    setCompletedModules((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );

  const canNext = () => {
    if (step === 0) return fullName.length > 1 && email.includes("@") && phone.length > 6;
    if (step === 1) return !!vehicleType && vehiclePlate.length > 2 && serviceAreas.length > 0;
    if (step === 2) return driversLicense && insurance;
    if (step === 3) return bgConsent;
    if (step === 4) return completedModules.length === trainingModules.length;
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Create a placeholder userId from email (onboarding is pre-auth)
      // The admin will create the actual Clerk account and link the profile
      const tempUserId = `pending_${email.replace(/[^a-z0-9]/gi, "_")}_${Date.now()}`;

      await apiPost("/haulers", {
        userId: tempUserId,
        businessName: businessName || null,
        licenseNumber: licenseNumber || null,
        vehicleType,
        vehiclePlate,
        serviceAreas,
        backgroundCheckConsent: bgConsent,
        trainingCompleted: true,
        documents: [
          { type: "drivers_license", uploaded: driversLicense },
          { type: "insurance", uploaded: insurance },
          { type: "business_license", uploaded: businessLicense },
        ],
      });

      setSubmitted(true);
      toast.success("Application submitted successfully!");
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={springBolt}
          className="text-center max-w-md px-6"
        >
          <img src={scrappyThumbsup} alt="Scrappy thumbs up" className="w-24 h-24 object-contain mx-auto mb-6" />
          <h1 className="text-3xl font-bold mb-4">Application Received</h1>
          <p className="text-muted-foreground mb-8">
            We'll review your application within 24-48 hours. Check your email at{" "}
            <span className="font-mono text-foreground">{email}</span> for updates.
          </p>
          <Link to="/">
            <Button variant="default">Back to Home</Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <nav className="border-b border-border">
        <div className="container flex items-center justify-between h-16">
          <Link to="/" className="text-xl font-bold tracking-[-0.06em]">
            KURBR<span className="text-primary">.</span>
          </Link>
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono">
            Hauler Application
          </p>
        </div>
      </nav>

      <div className="container max-w-2xl py-8 md:py-16 px-4">
        {/* Step indicators */}
        <div className="flex items-center gap-1 mb-12 md:mb-16">
          {steps.map((s, i) => (
            <div key={s.label} className="flex items-center gap-1 flex-1">
              <div
                className={`h-1 flex-1 transition-colors ${
                  i <= step ? "bg-primary" : "bg-secondary"
                }`}
              />
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 0: Personal Info */}
          {step === 0 && (
            <motion.div
              key="info"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={springBolt}
            >
              <p className="text-primary font-mono text-sm uppercase tracking-widest mb-4">
                Step 01
              </p>
              <h2 className="text-3xl md:text-4xl font-bold mb-10">Tell us about yourself</h2>

              <div className="space-y-6">
                {[
                  { label: "Full Name", value: fullName, set: setFullName, placeholder: "Marcus Johnson", icon: User },
                  { label: "Email", value: email, set: setEmail, placeholder: "marcus@email.com", type: "email" },
                  { label: "Phone", value: phone, set: setPhone, placeholder: "(801) 555-0147", type: "tel" },
                  { label: "Business Name (optional)", value: businessName, set: setBusinessName, placeholder: "MJ Hauling LLC" },
                ].map((field) => (
                  <div key={field.label}>
                    <label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block">
                      {field.label}
                    </label>
                    <input
                      type={field.type || "text"}
                      value={field.value}
                      onChange={(e) => field.set(e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full bg-transparent border-b-2 border-secondary focus:border-primary outline-none transition-colors py-2 font-mono"
                    />
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 1: Vehicle */}
          {step === 1 && (
            <motion.div
              key="vehicle"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={springBolt}
            >
              <p className="text-primary font-mono text-sm uppercase tracking-widest mb-4">
                Step 02
              </p>
              <h2 className="text-3xl md:text-4xl font-bold mb-10">Your equipment</h2>

              <div className="space-y-8">
                <div>
                  <label className="text-xs uppercase tracking-widest text-muted-foreground mb-3 block">
                    Vehicle Type
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {vehicleTypes.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => setVehicleType(v.id)}
                        className={`border-milled p-4 text-left transition-colors ${
                          vehicleType === v.id
                            ? "border-primary bg-primary/5"
                            : "hover:bg-secondary/50"
                        }`}
                      >
                        <Truck className="w-5 h-5 text-muted-foreground mb-2" />
                        <p className="text-xs font-bold uppercase tracking-widest">{v.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block">
                    License Plate
                  </label>
                  <input
                    value={vehiclePlate}
                    onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                    placeholder="4K3 M91"
                    className="w-full bg-transparent border-b-2 border-secondary focus:border-primary outline-none transition-colors py-2 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block">
                    Driver's License #
                  </label>
                  <input
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    placeholder="DL-123456789"
                    className="w-full bg-transparent border-b-2 border-secondary focus:border-primary outline-none transition-colors py-2 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs uppercase tracking-widest text-muted-foreground mb-3 block">
                    Service Areas
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {areas.map((area) => (
                      <button
                        key={area}
                        onClick={() => toggleArea(area)}
                        className={`px-4 py-2 text-xs font-mono uppercase tracking-widest transition-colors border-milled ${
                          serviceAreas.includes(area)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "hover:bg-secondary/50"
                        }`}
                      >
                        {area}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Documents */}
          {step === 2 && (
            <motion.div
              key="documents"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={springBolt}
            >
              <p className="text-primary font-mono text-sm uppercase tracking-widest mb-4">
                Step 03
              </p>
              <h2 className="text-3xl md:text-4xl font-bold mb-10">Upload documents</h2>

              <div className="space-y-4">
                {[
                  { label: "Driver's License", required: true, checked: driversLicense, set: setDriversLicense },
                  { label: "Insurance Certificate", required: true, checked: insurance, set: setInsurance },
                  { label: "Business License", required: false, checked: businessLicense, set: setBizLicense },
                ].map((doc) => (
                  <button
                    key={doc.label}
                    onClick={() => doc.set(!doc.checked)}
                    className={`w-full border-milled p-6 text-left flex items-center justify-between transition-colors ${
                      doc.checked ? "border-primary bg-primary/5" : "hover:bg-secondary/50"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 flex items-center justify-center transition-colors ${
                          doc.checked ? "bg-primary" : "bg-secondary"
                        }`}
                      >
                        {doc.checked ? (
                          <Check className="w-5 h-5 text-primary-foreground" />
                        ) : (
                          <Upload className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold uppercase tracking-widest">{doc.label}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {doc.required ? "Required" : "Optional"} · PDF, JPG, PNG
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-primary">
                      {doc.checked ? "UPLOADED" : "TAP TO UPLOAD"}
                    </span>
                  </button>
                ))}
              </div>

              <p className="text-xs text-muted-foreground mt-6 font-mono">
                * In production, documents are securely uploaded to encrypted storage.
              </p>
            </motion.div>
          )}

          {/* Step 3: Background Check */}
          {step === 3 && (
            <motion.div
              key="background"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={springBolt}
            >
              <p className="text-primary font-mono text-sm uppercase tracking-widest mb-4">
                Step 04
              </p>
              <h2 className="text-3xl md:text-4xl font-bold mb-10">Background check consent</h2>

              <div className="border-milled p-6 md:p-8 space-y-6">
                <div className="flex items-start gap-4">
                  <ShieldCheck className="w-8 h-8 text-primary shrink-0 mt-1" />
                  <div>
                    <h3 className="font-bold text-sm uppercase tracking-widest mb-2">
                      Safety First
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      KURBR requires all haulers to pass a background check before being
                      approved for the platform. This helps ensure the safety and trust of our
                      customers and community.
                    </p>
                  </div>
                </div>

                <div className="border-t border-border pt-6 space-y-4">
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p>By consenting, you authorize KURBR to:</p>
                    <ul className="list-none space-y-1">
                      {[
                        "Verify your identity and driving record",
                        "Run a criminal background check",
                        "Verify insurance and business credentials",
                        "Conduct periodic re-verification",
                      ].map((item) => (
                        <li key={item} className="flex items-center gap-2">
                          <span className="text-primary font-mono text-xs">→</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <button
                  onClick={() => setBgConsent(!bgConsent)}
                  className={`w-full p-4 flex items-center gap-4 transition-colors ${
                    bgConsent
                      ? "bg-primary/10 border-milled border-primary"
                      : "border-milled hover:bg-secondary/50"
                  }`}
                >
                  <div
                    className={`w-6 h-6 flex items-center justify-center transition-colors ${
                      bgConsent ? "bg-primary" : "bg-secondary"
                    }`}
                  >
                    {bgConsent && <Check className="w-4 h-4 text-primary-foreground" />}
                  </div>
                  <span className="text-sm font-bold uppercase tracking-widest">
                    I consent to a background check
                  </span>
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Training */}
          {step === 4 && (
            <motion.div
              key="training"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={springBolt}
            >
              <p className="text-primary font-mono text-sm uppercase tracking-widest mb-4">
                Step 05
              </p>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Complete training</h2>
              <p className="text-muted-foreground mb-10">
                Review all modules to complete your application.
              </p>

              <div className="space-y-3">
                {trainingModules.map((mod) => {
                  const done = completedModules.includes(mod.id);
                  return (
                    <button
                      key={mod.id}
                      onClick={() => toggleModule(mod.id)}
                      className={`w-full border-milled p-5 text-left flex items-start gap-4 transition-colors ${
                        done ? "border-primary bg-primary/5" : "hover:bg-secondary/50"
                      }`}
                    >
                      <div
                        className={`w-8 h-8 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                          done ? "bg-primary" : "bg-secondary"
                        }`}
                      >
                        {done ? (
                          <Check className="w-4 h-4 text-primary-foreground" />
                        ) : (
                          <BookOpen className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-bold uppercase tracking-widest">
                            {mod.title}
                          </p>
                          <span className="text-xs font-mono text-muted-foreground">
                            {mod.duration}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{mod.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 text-xs font-mono text-muted-foreground">
                {completedModules.length}/{trainingModules.length} modules completed
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between mt-12 md:mt-16">
          <Button
            variant="ghost"
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>

          {step < 4 ? (
            <Button
              variant="default"
              onClick={() => setStep(step + 1)}
              disabled={!canNext()}
              className="gap-2"
            >
              Next <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              variant="hero"
              onClick={handleSubmit}
              disabled={!canNext() || submitting}
              className="gap-2"
            >
              {submitting ? "Submitting..." : "Submit Application"}
              {!submitting && <ArrowRight className="w-4 h-4" />}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default HaulerOnboardingPage;
