/**
 * DeliveryErrandPage — Custom errand flow.
 * Task description → pickup → dropoff → station-driven estimate → dispatch.
 */
import { useState } from "react";
import { ArrowLeft, MapPin, Navigation, Sparkles, Clock, Users, Zap, ListChecks } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CanonicalAddressInput } from "@/components/address/CanonicalAddressInput";
import type { CanonicalPlace } from "@/lib/address/canonical-place";
import { useGeoLiveStation } from "@/hooks/useGeoLiveStation";

const ERRAND_IDEAS = [
  "Pick up dry cleaning",
  "Buy groceries from a list",
  "Collect documents from office",
  "Queue at government office",
  "Return an item to a store",
  "Pick up medicine",
];

export default function DeliveryErrandPage() {
  const navigate = useNavigate();
  const station = useGeoLiveStation();
  const [pickup, setPickup] = useState<CanonicalPlace | null>(null);
  const [dropoff, setDropoff] = useState<CanonicalPlace | null>(null);
  const [taskDescription, setTaskDescription] = useState("");

  const canSubmit = pickup && taskDescription.trim();
  const etaMin = station.etas?.parcel;
  const riderCount = station.station?.rider_supply ?? 0;

  return (
    <div className="min-h-[100dvh] bg-background">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b border-border/30 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/mobility/delivery")} className="p-1.5 rounded-xl hover:bg-muted/60">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">Custom Errand</h1>
            <p className="text-xs text-muted-foreground">Tell us what you need done</p>
          </div>
          {etaMin != null && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10">
              <Clock className="w-3 h-3 text-emerald-500" />
              <span className="text-[10px] font-bold text-emerald-500">~{etaMin}min</span>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-4 space-y-5">
        {/* Station context */}
        {station.station && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-muted/30 border border-border/10">
            <div className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-foreground">{riderCount} riders</span>
            </div>
            {station.station.surge_multiplier > 1.05 && (
              <div className="flex items-center gap-1 ml-auto">
                <Zap className="w-3 h-3 text-destructive" />
                <span className="text-[10px] font-bold text-destructive">Surge</span>
              </div>
            )}
          </motion.div>
        )}

        {/* Hero */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 flex items-center justify-center mx-auto mb-3">
            <Sparkles className="h-8 w-8 text-emerald-500" />
          </div>
          <p className="text-sm text-muted-foreground">Describe your task and we'll handle the logistics</p>
        </motion.div>

        {/* Quick errand ideas */}
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

        {/* Task description */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <p className="text-xs font-semibold text-muted-foreground mb-1.5">What do you need?</p>
          <textarea
            value={taskDescription}
            onChange={e => setTaskDescription(e.target.value)}
            placeholder="e.g. Pick up my dry cleaning at XYZ store, buy groceries from the list I'll share..."
            className="w-full p-3 rounded-xl border border-border/20 bg-card text-sm text-foreground placeholder:text-muted-foreground resize-none h-28 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
          />
        </motion.div>

        {/* Locations */}
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

        {/* Price estimate */}
        {canSubmit && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border/20 bg-card/60 p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Estimated price</span>
              <span className="text-sm font-bold text-foreground">AED 20 – 40</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Estimated time</span>
              <span className="text-sm font-bold text-foreground">{etaMin ?? "~35"} min</span>
            </div>
          </motion.div>
        )}

        {/* No riders */}
        {riderCount === 0 && station.station && (
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
          Get Price Estimate
        </motion.button>
      </div>
    </div>
  );
}
