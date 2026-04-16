import { useState, useEffect, type ChangeEvent } from "react";
import { MapPin, Navigation, Clock, Users, Zap, Camera, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CanonicalAddressInput } from "@/components/address/CanonicalAddressInput";
import type { CanonicalPlace } from "@/lib/address/canonical-place";
import { usePlatformBrain } from "@/hooks/usePlatformBrain";
import { loadRidePreview } from "@/lib/mobility/load-ride-preview";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";

const QUICK_SUGGESTIONS = [
  "Coffee from nearby cafe",
  "Forgotten keys at office",
  "Prescription from pharmacy",
  "Package from a friend",
];

export default function DeliveryBringPage() {
  useUiEngine("mobility-deliverybringpage");
  const navigate = useNavigate();
  const { arbitration: station } = usePlatformBrain();
  const [pickup, setPickup] = useState<CanonicalPlace | null>(null);
  const [dropoff, setDropoff] = useState<CanonicalPlace | null>(null);
  const [notes, setNotes] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [computedPrice, setComputedPrice] = useState<number | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);

  const canSubmit = pickup && dropoff && notes.trim();
  const etaMin = station.etas?.parcel;
  const riderCount = station.riderCount;

  useEffect(() => {
    if (!pickup || !dropoff) { setComputedPrice(null); return; }
    let cancelled = false;
    setPriceLoading(true);
    loadRidePreview({
      pickup: { lat: pickup.lat, lng: pickup.lng },
      dropoff: { lat: dropoff.lat, lng: dropoff.lng },
      serviceLevel: "taxi_standard",
    }).then(d => {
      if (!cancelled && d.ready) setComputedPrice(d.estimatedFare);
    }).catch(() => {}).finally(() => { if (!cancelled) setPriceLoading(false); });
    return () => { cancelled = true; };
  }, [pickup, dropoff]);

  const handlePhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <SubPageShell
      title="Bring Me Something"
      subtitle="Pick up from anywhere"
      onBack={() => navigate("/mobility/delivery")}
      rightAction={etaMin != null ? (
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10">
          <Clock className="w-3 h-3 text-primary" />
          <span className="text-[0.625rem] font-bold text-primary">~{etaMin}min</span>
        </div>
      ) : undefined}
      noContentPad
    >
      <div className="px-4 py-4 space-y-5">
        {riderCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 px-3 py-2 rounded-xl bg-muted/30 border border-border/10"
          >
            <div className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-foreground">{riderCount} riders nearby</span>
            </div>
            {station.surge > 1.05 && (
              <div className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-destructive" />
                <span className="text-[0.625rem] font-bold text-destructive">Surge active</span>
              </div>
            )}
          </motion.div>
        )}

        <div className="space-y-3">
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
              <MapPin className="h-3 w-3 text-emerald-500" /> Pickup from
            </p>
            <CanonicalAddressInput
              value={pickup}
              onChange={setPickup}
              placeholder="Where should we pick up?"
              contextType="parcel_pickup"
              allowAirport
              allowSavedPlaces
            />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
              <Navigation className="h-3 w-3 text-primary" /> Deliver to
            </p>
            <CanonicalAddressInput
              value={dropoff}
              onChange={setDropoff}
              placeholder="Your delivery address"
              contextType="parcel_dropoff"
              allowSavedPlaces
            />
          </motion.div>
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Quick ideas</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => setNotes(s)}
                className="px-3 py-1.5 rounded-full text-xs border border-border/20 bg-card/60 text-muted-foreground hover:border-primary/30 hover:text-foreground transition-all"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <p className="text-xs font-semibold text-muted-foreground mb-1.5">What do you need?</p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Describe what you want picked up..."
            className="w-full p-3 rounded-xl border border-border/20 bg-card text-sm text-foreground placeholder:text-muted-foreground resize-none h-24 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
            <Camera className="h-3 w-3" /> Photo of item (optional)
          </p>
          <label className="flex items-center justify-center w-full h-24 rounded-xl border-2 border-dashed border-border/30 bg-card/60 cursor-pointer hover:border-primary/30 transition-all overflow-hidden">
            {photoPreview ? (
              <img loading="lazy" src={photoPreview} alt="Item" className="h-full w-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-1 text-muted-foreground">
                <Camera className="w-5 h-5" />
                <span className="text-[0.625rem]">Tap to upload photo</span>
              </div>
            )}
            <input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} className="hidden" />
          </label>
        </motion.div>

        {canSubmit && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-border/20 bg-card/60 p-3 space-y-1"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Estimated price</span>
              {priceLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
              ) : (
                <span className="text-sm font-bold text-foreground">
                  {computedPrice != null ? `AED ${computedPrice}` : "AED 15 – 25"}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Estimated time</span>
              <span className="text-sm font-bold text-foreground">{etaMin ?? "~20"} min</span>
            </div>
          </motion.div>
        )}

        {riderCount === 0 && !station.loading && (
          <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-3 text-center">
            <p className="text-xs font-semibold text-orange-600">No riders available right now</p>
            <p className="text-[0.625rem] text-muted-foreground mt-0.5">Try scheduling or change location</p>
          </div>
        )}

        <motion.button
          disabled={!canSubmit}
          className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-40 transition-all active:scale-[0.98] shadow-lg shadow-primary/20"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          {computedPrice != null ? `Confirm — AED ${computedPrice}` : "Get Price Estimate"}
        </motion.button>
      </div>
    </SubPageShell>
  );
}
