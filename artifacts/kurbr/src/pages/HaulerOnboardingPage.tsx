import { useState, useEffect, type ReactElement } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  User,
  Truck,
  Container,
  Caravan,
  Construction,
  FileText,
  ShieldCheck,
  BookOpen,
  Check,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, Navigate } from "react-router-dom";
import { apiGet, apiPost, apiUpload } from "@/lib/apiClient";
import { toast } from "sonner";
import scrappyThumbsup from "@/assets/scrappy-thumbsup.png";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";

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
  const { isSignedIn, loading, userId } = useAuth();
  const inviteToken = new URLSearchParams(window.location.search).get("invite");
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

  // Step 2: Documents — each holds the uploaded file's metadata (or null if not yet uploaded)
  type UploadedDoc = { url: string; filename: string; mimeType: string };
  const [driversLicense, setDriversLicense] = useState<UploadedDoc | null>(null);
  const [insurance, setInsurance] = useState<UploadedDoc | null>(null);
  const [businessLicense, setBizLicense] = useState<UploadedDoc | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  async function handleDocUpload(
    docType: "drivers_license" | "insurance" | "business_license",
    file: File,
    setter: (d: UploadedDoc | null) => void,
  ) {
    setUploadingDoc(docType);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await apiUpload<UploadedDoc>("/haulers/documents", fd);
      setter(res);
      toast.success(`${file.name} uploaded`);
    } catch (err) {
      toast.error((err as Error).message || "Upload failed");
    } finally {
      setUploadingDoc(null);
    }
  }

  // Step 3: Background check
  const [bgConsent, setBgConsent] = useState(false);

  // Step 4: Training
  const [completedModules, setCompletedModules] = useState<string[]>([]);

  // Prefill from outbound-call invite link (admin's Leads page generated this)
  useEffect(() => {
    if (!inviteToken) return;
    apiGet<{ name: string | null; email: string | null; phone: string | null; location: string | null }>(
      `/leads/by-token/${inviteToken}`,
    )
      .then((lead) => {
        if (lead.name) setFullName(lead.name);
        if (lead.email) setEmail(lead.email);
        if (lead.phone) setPhone(lead.phone);
      })
      .catch(() => {
        // Invalid invite token — silently ignore, user can still fill manually
      });
  }, [inviteToken]);

  const areas = ["Salt Lake City", "Provo/Orem", "Ogden", "Park City"];
  const vehicleTypes: { id: string; label: string; Icon: (props: { className?: string }) => ReactElement }[] = [
    {
      id: "pickup",
      label: "PICKUP TRUCK",
      Icon: ({ className }) => <Truck className={className} />,
    },
    {
      id: "box_truck",
      label: "BOX TRUCK",
      Icon: ({ className }) => <Container className={className} />,
    },
    {
      id: "trailer",
      label: "TRUCK + TRAILER",
      Icon: ({ className }) => (
        <span className={`inline-flex items-center gap-1 ${className ?? ""}`}>
          <Truck className="w-5 h-5" />
          <Caravan className="w-5 h-5" />
        </span>
      ),
    },
    {
      id: "dump_truck",
      label: "DUMP TRUCK",
      Icon: ({ className }) => <Construction className={className} />,
    },
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
    if (step === 2) return !!driversLicense && !!insurance;
    if (step === 3) return true;
    if (step === 4) return completedModules.length === trainingModules.length;
    return true;
  };

  const handleSubmit = async () => {
    if (!userId) return;
    setSubmitting(true);
    try {
      await apiPost("/haulers", {
        businessName: businessName || null,
        licenseNumber: licenseNumber || null,
        vehicleType,
        vehiclePlate,
        serviceAreas,
        backgroundCheckConsent: bgConsent,
        trainingCompleted: true,
        documents: [
          driversLicense && { type: "drivers_license", uploaded: true, ...driversLicense },
          insurance && { type: "insurance", uploaded: true, ...insurance },
          businessLicense && { type: "business_license", uploaded: true, ...businessLicense },
        ].filter(Boolean),
      });

      // Mark the lead as onboarded so the admin's call list reflects conversion
      if (inviteToken) {
        apiPost(`/leads/by-token/${inviteToken}/onboarded`, {}).catch(() => {
          // best-effort; submission already succeeded
        });
      }

      setSubmitted(true);
      toast.success("Application submitted successfully!");
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;
  if (!isSignedIn) return <Navigate to="/signup" replace />;

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
          <div className="flex items-center gap-3">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono hidden sm:block">
              Hauler Application
            </p>
            <ThemeToggle />
          </div>
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
                        <v.Icon className="w-5 h-5 text-muted-foreground mb-2" />
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
                {([
                  { type: "drivers_license" as const, label: "Driver's License", required: true, value: driversLicense, set: setDriversLicense },
                  { type: "insurance" as const, label: "Insurance Certificate", required: true, value: insurance, set: setInsurance },
                  { type: "business_license" as const, label: "Business License", required: false, value: businessLicense, set: setBizLicense },
                ]).map((doc) => {
                  const isUploading = uploadingDoc === doc.type;
                  const uploaded = doc.value;
                  return (
                    <label
                      key={doc.type}
                      className={`w-full border-milled p-6 text-left flex items-center justify-between transition-colors cursor-pointer ${
                        uploaded ? "border-primary bg-primary/5" : "hover:bg-secondary/50"
                      } ${isUploading ? "opacity-60 pointer-events-none" : ""}`}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div
                          className={`w-10 h-10 flex-shrink-0 flex items-center justify-center transition-colors ${
                            uploaded ? "bg-primary" : "bg-secondary"
                          }`}
                        >
                          {uploaded ? (
                            <Check className="w-5 h-5 text-primary-foreground" />
                          ) : (
                            <Upload className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold uppercase tracking-widest">{doc.label}</p>
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {uploaded
                              ? uploaded.filename
                              : `${doc.required ? "Required" : "Optional"} · PDF, JPG, PNG, WEBP (max 10MB)`}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-mono text-primary flex-shrink-0 ml-3">
                        {isUploading ? "UPLOADING…" : uploaded ? "REPLACE" : "TAP TO UPLOAD"}
                      </span>
                      <input
                        type="file"
                        accept="application/pdf,image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void handleDocUpload(doc.type, f, doc.set);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  );
                })}
              </div>
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
                    <p className="text-primary font-mono text-xs uppercase tracking-widest">Optional · Skip to continue</p>
                    <p>
                      Haulers who consent to a background check earn a{" "}
                      <span className="text-foreground font-bold">Verified</span> badge that customers
                      see when booking. Verified haulers typically receive more job offers.
                    </p>
                    <ul className="list-none space-y-1 pt-2">
                      {[
                        "Identity and driving record verification",
                        "Criminal background check",
                        "Insurance and business credential review",
                        "Periodic re-verification",
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
                    className={`w-6 h-6 flex-shrink-0 flex items-center justify-center transition-colors ${
                      bgConsent ? "bg-primary" : "bg-secondary"
                    }`}
                  >
                    {bgConsent && <Check className="w-4 h-4 text-primary-foreground" />}
                  </div>
                  <span className="text-sm font-bold uppercase tracking-widest text-left">
                    Yes, run a background check on me (recommended)
                  </span>
                </button>
                <p className="text-xs text-muted-foreground font-mono">
                  You can opt in later from your hauler profile.
                </p>
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
