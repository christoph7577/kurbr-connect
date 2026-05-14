import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Clock, ArrowRight, ArrowLeft, Check, User, Mail,
  Phone, Loader2, Upload, X, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { apiPost } from "@/lib/apiClient";
import { toast } from "sonner";
import scrappyClipboard from "@/assets/scrappy-clipboard.png";
import scrappyThumbsup from "@/assets/scrappy-thumbsup.png";

const springBolt = { type: "spring" as const, stiffness: 400, damping: 30 };

type ServiceType = "residential" | "commercial" | "specialty" | null;

interface AiEstimate {
  estimated_volume: string;
  item_list: string[];
  difficulty_score: number;
  price_min: number;
  price_max: number;
  price_estimated: number;
}

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;

const difficultyLabel = (score: number) => {
  if (score <= 1) return { label: "Easy", color: "text-green-500" };
  if (score <= 2) return { label: "Simple", color: "text-green-400" };
  if (score <= 3) return { label: "Moderate", color: "text-yellow-400" };
  if (score <= 4) return { label: "Difficult", color: "text-orange-400" };
  return { label: "Very Hard", color: "text-destructive" };
};

async function xhrUpload(
  formData: FormData,
  onProgress: (pct: number) => void
): Promise<{ urls: string[] }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/jobs/photos");
    xhr.withCredentials = true;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        try { reject(new Error(JSON.parse(xhr.responseText).error || xhr.statusText)); }
        catch { reject(new Error(xhr.statusText)); }
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.send(formData);
  });
}

const SchedulePage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [service, setService] = useState<ServiceType>(null);

  // Photo step
  const [photos, setPhotos] = useState<{ file: File; previewUrl: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasAutoUploaded = useRef(false);

  // AI estimate
  const [aiEstimate, setAiEstimate] = useState<AiEstimate | null>(null);
  const [estimating, setEstimating] = useState(false);

  // Location, schedule, details
  const [address, setAddress] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [description, setDescription] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const steps = ["Service", "Photos", "Location", "Schedule", "Details", "Confirm"];

  const estimatedPrice = aiEstimate?.price_estimated
    ?? (service === "residential" ? 18000 : service === "specialty" ? 12000 : 25000);

  const canNext = () => {
    if (step === 0) return !!service;
    if (step === 1) return uploadedUrls.length >= 2 && !uploading;
    if (step === 2) return address.length > 3;
    if (step === 3) return !!date && !!time;
    if (step === 4) return name.length > 1;
    return true;
  };

  const addFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files);
    const valid = arr.filter((f) => {
      if (!ALLOWED_TYPES.includes(f.type)) { toast.error(`${f.name}: only jpg, png, webp`); return false; }
      if (f.size > MAX_SIZE) { toast.error(`${f.name}: max 5 MB`); return false; }
      return true;
    });
    setPhotos((prev) => {
      const remaining = 5 - prev.length;
      return [...prev, ...valid.slice(0, remaining).map((f) => ({ file: f, previewUrl: URL.createObjectURL(f) }))];
    });
    hasAutoUploaded.current = false;
  }, []);

  const removePhoto = (idx: number) => {
    setPhotos((prev) => { URL.revokeObjectURL(prev[idx].previewUrl); return prev.filter((_, i) => i !== idx); });
    setUploadedUrls([]);
    setAiEstimate(null);
    hasAutoUploaded.current = false;
  };

  // Auto-upload when >= 2 photos are ready and haven't been uploaded yet
  useEffect(() => {
    if (photos.length >= 2 && uploadedUrls.length === 0 && !uploading && !hasAutoUploaded.current) {
      hasAutoUploaded.current = true;
      void (async () => {
        setUploading(true);
        setUploadProgress(0);
        try {
          const fd = new FormData();
          photos.forEach((p) => fd.append("photos", p.file));
          const result = await xhrUpload(fd, setUploadProgress);
          setUploadedUrls(result.urls);
          setUploadProgress(100);

          setEstimating(true);
          try {
            const estimate = await apiPost<AiEstimate>("/jobs/estimate", {
              photoUrls: result.urls,
              serviceType: service,
              description: description || undefined,
            });
            setAiEstimate(estimate);
          } catch {
            toast.error("AI estimate failed — you can still continue");
          } finally {
            setEstimating(false);
          }
        } catch (err: unknown) {
          toast.error((err as Error).message || "Upload failed");
          hasAutoUploaded.current = false;
        } finally {
          setUploading(false);
        }
      })();
    }
  }, [photos, uploadedUrls.length, uploading, service, description]);

  const handleConfirm = async () => {
    if (!service) return;
    setSubmitting(true);
    try {
      const job = await apiPost<{ trackingToken: string }>("/jobs", {
        serviceType: service,
        address,
        scheduledDate: date,
        scheduledTime: time,
        description: description || null,
        customerName: name,
        customerEmail: email || null,
        customerPhone: phone || null,
        priceCents: estimatedPrice,
        photos: uploadedUrls.length > 0 ? uploadedUrls : null,
        aiEstimate: aiEstimate || null,
      });
      toast.success("Booking confirmed!");
      navigate(`/tracking?token=${job.trackingToken}`);
    } catch (err: unknown) {
      toast.error("Failed to create booking. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
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
          {steps.map((_, i) => (
            <div key={i} className={`h-1 flex-1 transition-colors ${i <= step ? "bg-primary" : "bg-secondary"}`} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 0: Service */}
          {step === 0 && (
            <motion.div key="service" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={springBolt}>
              <p className="text-primary font-mono text-sm uppercase tracking-widest mb-4">Step 01</p>
              <div className="flex items-center gap-4 mb-10">
                <h2 className="text-3xl md:text-4xl font-bold">What are we hauling?</h2>
                <img src={scrappyClipboard} alt="Scrappy" className="w-14 h-14 object-contain hidden md:block" />
              </div>
              <div className="grid gap-3">
                {([
                  { id: "residential" as const, title: "RESIDENTIAL", desc: "Furniture, appliances, yard waste, debris", price: "From $89" },
                  { id: "commercial" as const, title: "COMMERCIAL", desc: "Office equipment, construction materials", price: "Custom" },
                  { id: "specialty" as const, title: "SPECIALTY", desc: "E-waste, donations, hazardous materials", price: "From $120" },
                ] as const).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setService(s.id)}
                    className={`border-milled p-6 text-left transition-colors ${service === s.id ? "border-primary bg-primary/5" : "hover:bg-secondary/50"}`}
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

          {/* Step 1: Photos */}
          {step === 1 && (
            <motion.div key="photos" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={springBolt}>
              <p className="text-primary font-mono text-sm uppercase tracking-widest mb-4">Step 02</p>
              <h2 className="text-3xl md:text-4xl font-bold mb-2">Show us what's going</h2>
              <p className="text-muted-foreground text-sm mb-8 font-mono">
                Drop 2–5 photos — upload & AI estimate start automatically
              </p>

              {/* Drop zone (hidden once uploaded) */}
              {uploadedUrls.length === 0 && (
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
                  onClick={() => !uploading && fileInputRef.current?.click()}
                  className={`border-2 border-dashed transition-colors cursor-pointer p-10 text-center mb-6 ${dragOver ? "border-primary bg-primary/5" : "border-secondary hover:border-primary/50"}`}
                >
                  <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
                  <p className="font-mono text-sm text-muted-foreground">
                    Drop photos here or <span className="text-primary">click to browse</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP — max 5 MB each</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="hidden"
                    onChange={(e) => e.target.files && addFiles(e.target.files)}
                  />
                </div>
              )}

              {/* Thumbnails */}
              {photos.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {photos.map((p, i) => (
                    <div key={i} className="relative aspect-square group">
                      <img src={p.previewUrl} alt="" className="w-full h-full object-cover border border-border" />
                      {uploadedUrls.length === 0 && !uploading && (
                        <button
                          onClick={() => removePhoto(i)}
                          className="absolute top-1 right-1 bg-background/80 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  {photos.length < 5 && uploadedUrls.length === 0 && !uploading && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square border-2 border-dashed border-secondary hover:border-primary/50 flex items-center justify-center transition-colors"
                    >
                      <span className="text-muted-foreground text-2xl">+</span>
                    </button>
                  )}
                </div>
              )}

              {/* Upload progress bar */}
              {uploading && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-mono text-muted-foreground">Uploading photos…</p>
                    <p className="text-xs font-mono text-primary">{uploadProgress}%</p>
                  </div>
                  <div className="h-1 bg-secondary">
                    <div
                      className="h-full bg-primary transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* AI Estimate panel */}
              <AnimatePresence>
                {estimating && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={springBolt}
                    className="border-milled bg-secondary/20 p-6"
                  >
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      <div>
                        <p className="text-sm font-mono font-bold">Analyzing photos with AI…</p>
                        <div className="mt-2 space-y-1.5">
                          {["Detecting items", "Estimating volume", "Calculating price"].map((s, i) => (
                            <div key={s} className="flex items-center gap-2">
                              <div className="h-1.5 bg-secondary flex-1">
                                <motion.div
                                  className="h-full bg-primary/60"
                                  initial={{ width: "0%" }}
                                  animate={{ width: ["0%", "70%", "85%"] }}
                                  transition={{ duration: 2, delay: i * 0.4, ease: "easeOut" }}
                                />
                              </div>
                              <span className="text-[10px] font-mono text-muted-foreground w-28 shrink-0">{s}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {aiEstimate && !estimating && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={springBolt}
                    className="border-milled bg-secondary/20 p-6 space-y-4"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <p className="text-xs uppercase tracking-widest font-mono text-primary">AI Estimate</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Volume</p>
                        <p className="font-mono text-sm font-bold">{aiEstimate.estimated_volume}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Difficulty</p>
                        <p className={`font-mono text-sm font-bold ${difficultyLabel(aiEstimate.difficulty_score).color}`}>
                          {difficultyLabel(aiEstimate.difficulty_score).label} ({aiEstimate.difficulty_score}/5)
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Items detected</p>
                      <p className="text-sm font-mono text-muted-foreground">{aiEstimate.item_list.join(", ")}</p>
                    </div>
                    <div className="flex items-end justify-between border-t border-border pt-4">
                      <div>
                        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Price Range</p>
                        <p className="text-sm font-mono text-muted-foreground">
                          ${(aiEstimate.price_min / 100).toFixed(0)} – ${(aiEstimate.price_max / 100).toFixed(0)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Best Estimate</p>
                        <p className="text-2xl font-mono font-bold text-primary">
                          ${(aiEstimate.price_estimated / 100).toFixed(0)}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Step 2: Location */}
          {step === 2 && (
            <motion.div key="location" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={springBolt}>
              <p className="text-primary font-mono text-sm uppercase tracking-widest mb-4">Step 03</p>
              <h2 className="text-3xl md:text-4xl font-bold mb-10">Where's the pickup?</h2>
              <label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block">Address</label>
              <div className="relative">
                <MapPin className="absolute left-0 top-3 w-4 h-4 text-muted-foreground" />
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St, Salt Lake City, UT" className="w-full bg-transparent border-b-2 border-secondary focus:border-primary outline-none transition-colors py-2 pl-6 font-mono" />
              </div>
            </motion.div>
          )}

          {/* Step 3: Schedule */}
          {step === 3 && (
            <motion.div key="schedule" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={springBolt}>
              <p className="text-primary font-mono text-sm uppercase tracking-widest mb-4">Step 04</p>
              <h2 className="text-3xl md:text-4xl font-bold mb-10">When do you need us?</h2>
              <div className="space-y-6">
                <div>
                  <label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block">Date</label>
                  <div className="relative">
                    <Clock className="absolute left-0 top-3 w-4 h-4 text-muted-foreground" />
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-transparent border-b-2 border-secondary focus:border-primary outline-none transition-colors py-2 pl-6 font-mono" />
                  </div>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block">Time Slot</label>
                  <div className="grid grid-cols-3 gap-3">
                    {["08:00", "10:00", "12:00", "14:00", "16:00", "18:00"].map((t) => (
                      <button key={t} onClick={() => setTime(t)} className={`border-milled p-3 font-mono text-sm transition-colors ${time === t ? "border-primary bg-primary/5 text-primary" : "hover:bg-secondary/50 text-muted-foreground"}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 4: Details */}
          {step === 4 && (
            <motion.div key="details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={springBolt}>
              <p className="text-primary font-mono text-sm uppercase tracking-widest mb-4">Step 05</p>
              <h2 className="text-3xl md:text-4xl font-bold mb-10">Your details</h2>
              <div className="space-y-6">
                {[
                  { label: "Name *", value: name, onChange: setName, type: "text", placeholder: "Your full name", icon: User },
                  { label: "Email", value: email, onChange: setEmail, type: "email", placeholder: "you@email.com", icon: Mail },
                  { label: "Phone", value: phone, onChange: setPhone, type: "tel", placeholder: "(801) 555-1234", icon: Phone },
                ].map((f) => (
                  <div key={f.label}>
                    <label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block">{f.label}</label>
                    <div className="relative">
                      <f.icon className="absolute left-0 top-3 w-4 h-4 text-muted-foreground" />
                      <input type={f.type} value={f.value} onChange={(e) => f.onChange(e.target.value)} placeholder={f.placeholder} className="w-full bg-transparent border-b-2 border-secondary focus:border-primary outline-none transition-colors py-2 pl-6 font-mono" />
                    </div>
                  </div>
                ))}
                <div>
                  <label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block">Description (optional)</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Old couch, broken dresser, 3 bags of yard waste..." className="w-full bg-transparent border-2 border-secondary focus:border-primary outline-none transition-colors p-4 font-mono resize-none" />
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 5: Confirm */}
          {step === 5 && (
            <motion.div key="confirm" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={springBolt}>
              <p className="text-primary font-mono text-sm uppercase tracking-widest mb-4">Confirm</p>
              <div className="flex items-center gap-4 mb-10">
                <h2 className="text-3xl md:text-4xl font-bold">Review your booking</h2>
                <img src={scrappyThumbsup} alt="Scrappy thumbs up" className="w-14 h-14 object-contain" />
              </div>

              {photos.length > 0 && (
                <div className="mb-6">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Photos</p>
                  <div className="flex gap-2">
                    {photos.map((p, i) => (
                      <div key={i} className="w-16 h-16 border border-border overflow-hidden">
                        <img src={p.previewUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-milled divide-y divide-border">
                {[
                  { label: "Service", value: String(service).toUpperCase() },
                  { label: "Location", value: address },
                  { label: "Date & Time", value: `${date} · ${time}` },
                  { label: "Customer", value: name },
                  ...(description ? [{ label: "Notes", value: description }] : []),
                ].map((row) => (
                  <div key={row.label} className="p-6 flex justify-between">
                    <span className="text-xs uppercase tracking-widest text-muted-foreground">{row.label}</span>
                    <span className="font-mono text-sm max-w-xs text-right">{row.value}</span>
                  </div>
                ))}
                {aiEstimate ? (
                  <div className="p-6 flex justify-between items-end">
                    <div>
                      <span className="text-xs uppercase tracking-widest text-muted-foreground block">AI Estimate</span>
                      <span className="text-xs text-muted-foreground font-mono">{aiEstimate.estimated_volume} · {aiEstimate.item_list.slice(0, 2).join(", ")}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-lg text-primary font-bold">${(aiEstimate.price_estimated / 100).toFixed(0)}</span>
                      <span className="text-xs text-muted-foreground font-mono block">${(aiEstimate.price_min / 100).toFixed(0)}–${(aiEstimate.price_max / 100).toFixed(0)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 flex justify-between">
                    <span className="text-xs uppercase tracking-widest text-muted-foreground">Estimated Price</span>
                    <span className="font-mono text-lg text-primary font-bold">${(estimatedPrice / 100).toFixed(0)}</span>
                  </div>
                )}
              </div>

              <Button variant="hero" className="w-full mt-8 gap-2" onClick={handleConfirm} disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {submitting ? "Creating booking..." : "Confirm Booking"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {step < 5 && (
          <div className="flex justify-between mt-16">
            <Button variant="ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
            <Button variant="default" onClick={() => setStep(step + 1)} disabled={!canNext()} className="gap-2">
              Next <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SchedulePage;
