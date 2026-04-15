import { useState, useEffect, type ChangeEvent } from "react";
import { MapPin, Navigation, Sparkles, Clock, Users, Zap, ListChecks, Camera, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CanonicalAddressInput } from "@/components/address/CanonicalAddressInput";
import type { CanonicalPlace } from "@/lib/address/canonical-place";
import { usePlatformBrain } from "@/hooks/usePlatformBrain";
import { loadRidePreview } from "@/lib/mobility/load-ride-preview";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";

const ERRAND_IDEAS = [
  "Pick up dry cleaning",
  "Buy groceries from a list",
  "Collect documents from office",
  "Queue at government office",
  "Return an item to a store",
  "Pick up medicine",
];

export default function DeliveryErrandPage() {
  useUiEngine("mobility-deliveryerrandpage");
  const navigate = useNavigate();
  const { arbitration: station } = usePlatformBrain();
  const [pickup, setPickup] = useState<CanonicalPlace | null>(null);
  const [dropoff, setDropoff] = useState<CanonicalPlace | null>(null);
  const [taskDescription, setTaskDescription] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [computedPrice, setComputedPrice] = useState<number | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);

  const canSubmit = pickup && dropoff && taskDescription.trim();
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
      title="Custom Errand"
      subtitle="Tell us what you need done"
      onBack={() => navigate("/mobility/delivery")}
      rightAction={etaMin != null ? (
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10">
          <Clock className="w-3 h-3 text-emerald-500" />
          <span className="text-[10px] font-bold text-emerald-500">~{etaMin}min</span>
        </div>
      ) : undefined}
      noContentPad
    >
      <div className="px-4 py-4 space-y-5">
        {riderCount > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-muted/30 border border-border/10">
            <div className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-foreground">{riderCount} riders</span>
            </div>
            {station.surge > 1.05 && (
              <div className="flex items-center gap-1 ml-auto">
                <Zap className="w-3 h-3 text-destructive" />
                <span className="text-[10px] font-bold text-destructive">Surge</span>
              </div>
            )}
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 flex items-center justify-center mx-auto mb-3">
            <Sparkles className="h-8 w-8 text-emerald-500" />
          </div>
          <p className="text-sm text-muted-foreground">Describe your task and we'll handle the logistics</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-1.5 mb-2">
            <ListChecks className="w-3.5 h-3.5 text-emerald-500" />
            <p className="text-xs font-semibold text-muted-foreground">Popular errands</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {ERRAND_IDEAS.map((idea, i) => (
              <button
                key={i}
                onClick={() => setTaskDescription(idea)}
                className="px-3 py-1.5 rounded-full text-xs border border-border/20 bg-card/60 text-muted-foreground hover:border-emerald-500/30 hover:text-foreground transition-all"
              >
                {idea}
              </button>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <p className="text-xs font-semibold text-muted-foreground mb-1.5">What do you need?</p>
          <textarea
            value={taskDescription}
            onChange={e => setTaskDescription(e.target.value)}
            placeholder="e.g. Pick up my dry cleaning at XYZ store, buy groceries from the list I'll share..."
            className="w-full p-3 rounded-xl border border-border/20 bg-card text-sm text-foreground placeholder:text-muted-foreground resize-none h-28 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
          />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
            <Camera className="h-3 w-3" /> Reference photo (optional)
          </p>
          <label className="flex items-center justify-center w-full h-24 rounded-xl border-2 border-dashed border-border/30 bg-card/60 cursor-pointer hover:border-emerald-500/30 transition-all overflow-hidden">
            {photoPreview ? (
              <img loading="lazy" src={photoPreview} alt="Reference" className="h-full w-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-1 text-muted-foreground">
                <Camera className="w-5 h-5" />
                <span className="text-[10px]">Tap to upload photo</span>
              </div>
            )}
            <input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} className="hidden" />
          </label>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
              <MapPin className="h-3 w-3 text-emerald-500" /> Task location
            </p>
            <CanonicalAddressInput value={pickup} onChange={setPickup} placeholder="Where should the rider go?" contextType="parcel_pickup" allowSavedPlaces />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
              <Navigation className="h-3 w-3 text-primary" /> Deliver to (optional)
            </p>
            <CanonicalAddressInput value={dropoff} onChange={setDropoff} placeholder="Where should it be delivered?" contextType="parcel_dropoff" allowSavedPlaces />
          </div>
        </motion.div>

        {canSubmit && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border/20 bg-card/60 p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Estimated price</span>
              {priceLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
              ) : (
                <span className="text-sm font-bold text-foreground">
                  {computedPrice != null ? `AED ${computedPrice}` : "AED 20 – 40"}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Estimated time</span>
              <span className="text-sm font-bold text-foreground">{etaMin ?? "~35"} min</span>
            </div>
          </motion.div>
        )}

        {riderCount === 0 && !station.loading && (
          <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-3 text-center">
            <p className="text-xs font-semibold text-orange-600">No riders available right now</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Try scheduling or change location</p>
          </div>
        )}

        <motion.button
          disabled={!canSubmit}
          className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-40 transition-all active:scale-[0.98] shadow-lg shadow-primary/20"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          {computedPrice != null ? `Confirm — AED ${computedPrice}` : "Get Price Estimate"}
        </motion.button>
      </div>
    </SubPageShell>
  );
}
