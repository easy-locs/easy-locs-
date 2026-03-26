/**
 * DeliveryParcelPage — Send parcel / document flow.
 * Structured logistics with station-driven ETA + pricing.
 */
import { useState } from "react";
import { ArrowLeft, MapPin, Navigation, Shield, Clock, Users, Zap, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CanonicalAddressInput } from "@/components/address/CanonicalAddressInput";
import type { CanonicalPlace } from "@/lib/address/canonical-place";
import { useArbitratedStation } from "@/hooks/useArbitratedStation";
import { cn } from "@/lib/utils";

const PARCEL_TYPES = [
  { id: "documents", label: "Documents", emoji: "📄", size: "xs_envelope" },
  { id: "small_package", label: "Small Package", emoji: "📦", size: "small" },
  { id: "medium_package", label: "Medium Package", emoji: "📦", size: "medium" },
  { id: "electronics", label: "Electronics", emoji: "💻", size: "medium" },
  { id: "fragile", label: "Fragile Item", emoji: "🥂", size: "medium" },
  { id: "large", label: "Large / Bulky", emoji: "🏗️", size: "large" },
];

export default function DeliveryParcelPage() {
  const navigate = useNavigate();
  const station = useArbitratedStation();
  const [pickup, setPickup] = useState<CanonicalPlace | null>(null);
  const [dropoff, setDropoff] = useState<CanonicalPlace | null>(null);
  const [parcelType, setParcelType] = useState<string | null>(null);
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [requireSignature, setRequireSignature] = useState(false);
  const [requireOTP, setRequireOTP] = useState(false);
  const [isFragile, setIsFragile] = useState(false);
  const [declaredValue, setDeclaredValue] = useState("");
  const [instructions, setInstructions] = useState("");

  const canSubmit = parcelType && pickup && dropoff && recipientName;
  const etaMin = station.etas?.parcel;
  const riderCount = station.riderCount;

  return (
    <div className="min-h-[100dvh] bg-background">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b border-border/30 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/mobility/delivery")} className="p-1.5 rounded-xl hover:bg-muted/60">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">Send Parcel</h1>
            <p className="text-xs text-muted-foreground">Documents · Packages · Fragile</p>
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
        {/* Station context */}
        {riderCount > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-muted/30 border border-border/10">
            <div className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-foreground">{riderCount} riders</span>
            </div>
            <div className="flex items-center gap-1">
              <Package className="w-3.5 h-3.5 text-violet-500" />
              <span className="text-xs text-muted-foreground">Est. {etaMin ?? "~30"}min</span>
            </div>
            {station.surge > 1.05 && (
              <div className="flex items-center gap-1 ml-auto">
                <Zap className="w-3 h-3 text-destructive" />
                <span className="text-[10px] font-bold text-destructive">Surge</span>
              </div>
            )}
          </motion.div>
        )}

        {/* Parcel type */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs font-semibold text-muted-foreground mb-2">What are you sending?</p>
          <div className="grid grid-cols-3 gap-2">
            {PARCEL_TYPES.map(t => (
              <button
                key={t.id}
                onClick={() => {
                  setParcelType(t.id);
                  if (t.id === "fragile") setIsFragile(true);
                }}
                className={cn(
                  "p-3 rounded-xl border text-center transition-all",
                  parcelType === t.id
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border/20 bg-card/60 hover:border-border/40"
                )}
              >
                <span className="text-xl block mb-1">{t.emoji}</span>
                <span className={cn("text-[11px] font-medium", parcelType === t.id ? "text-foreground" : "text-muted-foreground")}>{t.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Addresses */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
              <MapPin className="h-3 w-3 text-emerald-500" /> Pickup
            </p>
            <CanonicalAddressInput value={pickup} onChange={setPickup} placeholder="Pickup address" contextType="parcel_pickup" allowSavedPlaces />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
              <Navigation className="h-3 w-3 text-primary" /> Dropoff
            </p>
            <CanonicalAddressInput value={dropoff} onChange={setDropoff} placeholder="Delivery address" contextType="parcel_dropoff" allowSavedPlaces />
          </div>
        </motion.div>

        {/* Recipient */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Recipient</p>
          <input value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder="Recipient name"
            className="w-full px-3 py-2.5 rounded-xl border border-border/20 bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <input value={recipientPhone} onChange={e => setRecipientPhone(e.target.value)} placeholder="Recipient phone"
            className="w-full px-3 py-2.5 rounded-xl border border-border/20 bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </motion.div>

        {/* Delivery options */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Shield className="h-3 w-3" /> Delivery options</p>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "✍️ Signature", state: requireSignature, set: setRequireSignature },
              { label: "🔐 OTP", state: requireOTP, set: setRequireOTP },
              { label: "🥂 Fragile", state: isFragile, set: setIsFragile },
            ].map(opt => (
              <button
                key={opt.label}
                onClick={() => opt.set(!opt.state)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                  opt.state ? "border-primary bg-primary/10 text-primary" : "border-border/20 text-muted-foreground hover:border-border/40"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <input value={declaredValue} onChange={e => setDeclaredValue(e.target.value)} placeholder="Declared value (optional)" type="number"
            className="w-full px-3 py-2.5 rounded-xl border border-border/20 bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <textarea value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="Special instructions..."
            className="w-full p-3 rounded-xl border border-border/20 bg-card text-sm text-foreground placeholder:text-muted-foreground resize-none h-20 focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </motion.div>

        {/* Price estimate */}
        {canSubmit && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border/20 bg-card/60 p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Estimated price</span>
              <span className="text-sm font-bold text-foreground">AED 18 – 35</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Estimated time</span>
              <span className="text-sm font-bold text-foreground">{etaMin ?? "~30"} min</span>
            </div>
          </motion.div>
        )}

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
