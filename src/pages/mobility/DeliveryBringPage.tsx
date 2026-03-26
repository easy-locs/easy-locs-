/**
 * DeliveryBringPage — "Bring me something" flow.
 * Pickup from any location → deliver to user.
 * Station-driven with ETA + pricing preview.
 */
import { useState } from "react";
import { ArrowLeft, MapPin, Navigation, Clock, Users, Zap, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CanonicalAddressInput } from "@/components/address/CanonicalAddressInput";
import type { CanonicalPlace } from "@/lib/address/canonical-place";
import { useGeoLiveStation } from "@/hooks/useGeoLiveStation";

const QUICK_SUGGESTIONS = [
  "Coffee from nearby café",
  "Forgotten keys at office",
  "Prescription from pharmacy",
  "Package from a friend",
];

export default function DeliveryBringPage() {
  const navigate = useNavigate();
  const station = useGeoLiveStation();
  const [pickup, setPickup] = useState<CanonicalPlace | null>(null);
  const [dropoff, setDropoff] = useState<CanonicalPlace | null>(null);
  const [notes, setNotes] = useState("");

  const canSubmit = pickup && dropoff && notes.trim();
  const etaMin = station.etas?.parcel;
  const riderCount = station.station?.rider_supply ?? 0;

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b border-border/30 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/mobility/delivery")} className="p-1.5 rounded-xl hover:bg-muted/60">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">Bring Me Something</h1>
            <p className="text-xs text-muted-foreground">Pick up from anywhere</p>
          </div>
          {etaMin != null && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10">
              <Clock className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-bold text-primary">~{etaMin}min</span>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-4 space-y-5">
        {/* Station mini context */}
        {station.station && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 px-3 py-2 rounded-xl bg-muted/30 border border-border/10"
          >
            <div className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-foreground">{riderCount} riders nearby</span>
            </div>
            {station.station.surge_multiplier > 1.05 && (
              <div className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-destructive" />
                <span className="text-[10px] font-bold text-destructive">Surge active</span>
              </div>
            )}
          </motion.div>
        )}

        {/* Addresses */}
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

        {/* Quick suggestions */}
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

        {/* Description */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <p className="text-xs font-semibold text-muted-foreground mb-1.5">What do you need?</p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Describe what you want picked up..."
            className="w-full p-3 rounded-xl border border-border/20 bg-card text-sm text-foreground placeholder:text-muted-foreground resize-none h-24 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
        </motion.div>

        {/* Price estimate preview */}
        {canSubmit && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-border/20 bg-card/60 p-3 space-y-1"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Estimated price</span>
              <span className="text-sm font-bold text-foreground">AED 15 – 25</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Estimated time</span>
              <span className="text-sm font-bold text-foreground">{etaMin ?? "~20"} min</span>
            </div>
          </motion.div>
        )}

        {/* No riders state */}
        {riderCount === 0 && station.station && (
          <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-3 text-center">
            <p className="text-xs font-semibold text-orange-600">No riders available right now</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Try scheduling or change location</p>
          </div>
        )}

        {/* CTA */}
        <motion.button
          disabled={!canSubmit}
          className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-40 transition-all active:scale-[0.98] shadow-lg shadow-primary/20"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          Get Price Estimate
        </motion.button>
      </div>
    </div>
  );
}
