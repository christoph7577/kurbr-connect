import { useEffect, useRef, useState } from "react";
import { MapPin, CheckCircle2 } from "lucide-react";

interface AddressAutocompleteProps {
  value: string;
  onChange: (
    address: string,
    meta?: { lat: number; lng: number; placeId?: string } | null,
  ) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  autoFocus?: boolean;
  /**
   * If true, accepts only an address picked from the dropdown.
   * If false (default), free typing is permitted but coordinates won't be set unless picked.
   */
  strict?: boolean;
}

const API_KEY = (import.meta.env["VITE_GOOGLE_PLACES_API_KEY"] as string | undefined) ?? "";

type GoogleNS = typeof globalThis & {
  google?: {
    maps?: {
      places?: {
        Autocomplete: new (
          input: HTMLInputElement,
          opts: Record<string, unknown>,
        ) => {
          addListener: (event: string, cb: () => void) => void;
          getPlace: () => {
            formatted_address?: string;
            place_id?: string;
            geometry?: { location: { lat: () => number; lng: () => number } };
          };
        };
      };
    };
  };
};

let loaderPromise: Promise<void> | null = null;

function loadGoogleMaps(): Promise<void> {
  if (!API_KEY) return Promise.reject(new Error("Missing VITE_GOOGLE_PLACES_API_KEY"));
  const w = window as GoogleNS;
  if (w.google?.maps?.places) return Promise.resolve();
  if (loaderPromise) return loaderPromise;
  loaderPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-google-maps-loader]");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Google Maps failed to load")));
      return;
    }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(API_KEY)}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    script.dataset["googleMapsLoader"] = "1";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Maps failed to load"));
    document.head.appendChild(script);
  });
  return loaderPromise;
}

export const AddressAutocomplete = ({
  value,
  onChange,
  placeholder = "Start typing your address…",
  className = "",
  required,
  autoFocus,
  strict = false,
}: AddressAutocompleteProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [ready, setReady] = useState(false);
  const [verified, setVerified] = useState(false);
  const [unavailable, setUnavailable] = useState(!API_KEY);

  useEffect(() => {
    if (!API_KEY) return;
    let cancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (cancelled || !inputRef.current) return;
        const g = (window as GoogleNS).google!.maps!.places!;
        const ac = new g.Autocomplete(inputRef.current, {
          types: ["address"],
          componentRestrictions: { country: ["us"] },
          fields: ["formatted_address", "geometry", "place_id"],
        });
        ac.addListener("place_changed", () => {
          const place = ac.getPlace();
          const formatted = place.formatted_address ?? "";
          if (!formatted || !place.geometry) {
            setVerified(false);
            return;
          }
          setVerified(true);
          onChange(formatted, {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
            ...(place.place_id ? { placeId: place.place_id } : {}),
          });
        });
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setUnavailable(true);
      });
    return () => {
      cancelled = true;
    };
    // onChange ref is intentionally omitted; we only need to bind once per mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative w-full">
      <MapPin className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => {
          if (verified) setVerified(false);
          onChange(e.target.value, null);
        }}
        placeholder={unavailable ? placeholder : ready ? placeholder : "Loading address search…"}
        required={required}
        autoFocus={autoFocus}
        autoComplete="off"
        className={`pl-7 pr-8 ${className}`}
      />
      {verified && (
        <CheckCircle2
          className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500"
          aria-label="Verified address"
        />
      )}
      {unavailable && value.length > 0 && (
        <p className="absolute -bottom-5 left-7 text-[10px] text-muted-foreground font-mono">
          Address search unavailable — enter manually
        </p>
      )}
      {strict && !verified && value.length > 0 && !unavailable && (
        <p className="absolute -bottom-5 left-7 text-[10px] text-amber-500 font-mono">
          Pick an address from the dropdown
        </p>
      )}
    </div>
  );
};
