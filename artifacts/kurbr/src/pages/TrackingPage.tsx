import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Search, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useSearchParams } from "react-router-dom";
import { apiGet } from "@/lib/apiClient";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Typed icon factories — avoids the `as any` _getIconUrl delete workaround
function makeIcon(color: "blue" | "green"): L.Icon {
  const hue = color === "blue" ? "hue-rotate-[200deg]" : "hue-rotate-[120deg]";
  return new L.Icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
    className: hue,
  });
}

const haulerIcon = makeIcon("green");
const addressIcon = makeIcon("blue");

const springBolt = { type: "spring" as const, stiffness: 400, damping: 30 };

const statuses = [
  { id: "confirmed", label: "CONFIRMED" },
  { id: "dispatched", label: "DISPATCHED" },
  { id: "en_route", label: "EN ROUTE" },
  { id: "arrived", label: "ARRIVED" },
  { id: "completed", label: "COMPLETED" },
];

const statusIndex = (s: string) => {
  const i = statuses.findIndex((st) => st.id === s);
  return i >= 0 ? i : 0;
};

const ACTIVE_STATUSES = ["dispatched", "en_route", "arrived"];

interface PublicJob {
  jobNumber: string;
  trackingToken: string;
  status: string;
  serviceType: string;
  address: string;
  scheduledDate: string | null;
  scheduledTime: string | null;
  priceCents: number | null;
  haulerLat: number | null;
  haulerLng: number | null;
  haulerLocationUpdatedAt: string | null;
}

interface GeocodedAddress {
  lat: number;
  lng: number;
}

async function geocodeAddress(address: string): Promise<GeocodedAddress | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
    const resp = await fetch(url, { headers: { "Accept-Language": "en" } });
    if (!resp.ok) return null;
    const data = await resp.json() as { lat: string; lon: string }[];
    if (!data || data.length === 0) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

function MapFitBounds({ hauler, address }: { hauler: [number, number] | null; address: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    const points: [number, number][] = [];
    if (hauler) points.push(hauler);
    if (address) points.push(address);
    if (points.length === 2) {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
    } else if (points.length === 1) {
      map.setView(points[0], 14);
    }
  }, [hauler?.[0], hauler?.[1], address?.[0], address?.[1]]);
  return null;
}

function HaulerMap({ job }: { job: PublicJob }) {
  const hasHaulerLocation = job.haulerLat != null && job.haulerLng != null;
  const [addressCoords, setAddressCoords] = useState<GeocodedAddress | null>(null);

  useEffect(() => {
    if (job.address) {
      geocodeAddress(job.address).then(setAddressCoords);
    }
  }, [job.address]);

  const defaultCenter: [number, number] = addressCoords
    ? [addressCoords.lat, addressCoords.lng]
    : hasHaulerLocation
    ? [job.haulerLat!, job.haulerLng!]
    : [37.7749, -122.4194];

  const haulerPoint: [number, number] | null = hasHaulerLocation ? [job.haulerLat!, job.haulerLng!] : null;
  const addressPoint: [number, number] | null = addressCoords ? [addressCoords.lat, addressCoords.lng] : null;

  const lastUpdated = job.haulerLocationUpdatedAt
    ? new Date(job.haulerLocationUpdatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="w-full rounded-none overflow-hidden border border-border">
      <div className="flex items-center justify-between px-4 py-2 bg-secondary">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Live Map</span>
        </div>
        {hasHaulerLocation && lastUpdated ? (
          <span className="text-xs font-mono text-muted-foreground">Updated {lastUpdated}</span>
        ) : (
          <span className="text-xs font-mono text-muted-foreground">Waiting for hauler…</span>
        )}
      </div>
      <div style={{ height: 280 }}>
        <MapContainer
          center={defaultCenter}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
          zoomControl={true}
          attributionControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapFitBounds hauler={haulerPoint} address={addressPoint} />
          {haulerPoint && (
            <Marker position={haulerPoint} icon={haulerIcon}>
              <Popup>Your hauler is here</Popup>
            </Marker>
          )}
          {addressPoint && (
            <Marker position={addressPoint} icon={addressIcon}>
              <Popup>{job.address}</Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
      <div className="flex items-center justify-between px-4 py-1.5 bg-secondary border-t border-border text-[11px] font-mono text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-green-500" /> Hauler
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-blue-500" /> Pickup address
        </span>
      </div>
    </div>
  );
}

const TrackingPage = () => {
  const [searchParams] = useSearchParams();
  const tokenParam = searchParams.get("token");

  const [inputToken, setInputToken] = useState(tokenParam || "");
  const [job, setJob] = useState<PublicJob | null>(null);
  const [loading, setLoading] = useState(!!tokenParam);
  const [notFound, setNotFound] = useState(false);

  const fetchJob = async (token: string) => {
    setLoading(true);
    setNotFound(false);
    try {
      const data = await apiGet<PublicJob>(`/jobs/track/${token.trim()}`);
      setJob(data);
    } catch {
      setNotFound(true);
      setJob(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (tokenParam) fetchJob(tokenParam);
  }, [tokenParam]);

  // Poll for status and location updates every 15s
  useEffect(() => {
    if (!job) return;
    const interval = setInterval(() => fetchJob(job.trackingToken), 15000);
    return () => clearInterval(interval);
  }, [job?.trackingToken]);

  const currentStatus = job ? statusIndex(job.status) : 0;
  const showMap = job && ACTIVE_STATUSES.includes(job.status);

  if (!job && !loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <nav className="glass">
          <div className="container flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2 text-foreground">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-xs uppercase tracking-widest">Back</span>
            </Link>
            <p className="text-xl font-bold tracking-[-0.06em]">KURBR<span className="text-primary">.</span></p>
            <div className="w-16" />
          </div>
        </nav>
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <h2 className="text-3xl font-bold mb-2">Track Your Pickup</h2>
          <p className="text-muted-foreground font-mono text-sm mb-8">Enter your tracking code from the confirmation email</p>
          <div className="w-full max-w-sm space-y-4">
            <div className="relative">
              <Search className="absolute left-0 top-3 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={inputToken}
                onChange={(e) => setInputToken(e.target.value)}
                placeholder="Paste tracking code..."
                className="w-full bg-transparent border-b-2 border-secondary focus:border-primary outline-none transition-colors py-2 pl-6 font-mono text-sm"
              />
            </div>
            {notFound && (
              <p className="text-destructive text-sm font-mono">Tracking code not found. Check and try again.</p>
            )}
            <Button
              variant="default"
              className="w-full"
              onClick={() => fetchJob(inputToken)}
              disabled={inputToken.length < 8}
            >
              Track Job
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div className="min-h-screen flex flex-col bg-background">
        <nav className="glass">
          <div className="container flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2 text-foreground">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-xs uppercase tracking-widest">Back</span>
            </Link>
            <p className="text-xl font-bold tracking-[-0.06em]">KURBR<span className="text-primary">.</span></p>
            <p className="text-xs font-mono text-muted-foreground">{job!.jobNumber}</p>
          </div>
        </nav>

        <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={springBolt}
            className="text-center mb-16"
          >
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-4">Status</p>
            <p className="text-5xl md:text-7xl font-mono font-bold tracking-tight text-foreground uppercase">
              {job!.status.replace("_", " ")}
            </p>
            <p className="text-sm text-muted-foreground mt-4 font-mono">
              {job!.scheduledDate} · {job!.scheduledTime}
            </p>
          </motion.div>

          <div className="w-full max-w-md mb-16">
            <div className="flex items-center">
              {statuses.map((s, i) => (
                <div key={s.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full transition-colors ${i <= currentStatus ? "bg-primary" : "bg-secondary"}`} />
                    <p className={`text-[10px] mt-2 uppercase tracking-widest ${i <= currentStatus ? "text-primary" : "text-muted-foreground"}`}>
                      {s.label}
                    </p>
                  </div>
                  {i < statuses.length - 1 && (
                    <div className={`h-px flex-1 mx-1 transition-colors ${i < currentStatus ? "bg-primary" : "bg-secondary"}`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {showMap && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springBolt, delay: 0.1 }}
              className="w-full max-w-md mb-8"
            >
              <HaulerMap job={job!} />
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springBolt, delay: 0.2 }}
            className="w-full max-w-md glass p-6"
          >
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-xs uppercase tracking-widest text-muted-foreground">Service</span>
                <span className="font-mono text-sm uppercase">{job!.serviceType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs uppercase tracking-widest text-muted-foreground">Address</span>
                <span className="font-mono text-sm text-right max-w-[200px]">{job!.address}</span>
              </div>
              {job!.priceCents != null && (
                <div className="flex justify-between">
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">Price</span>
                  <span className="font-mono text-sm font-bold text-primary">${(job!.priceCents / 100).toFixed(0)}</span>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default TrackingPage;
