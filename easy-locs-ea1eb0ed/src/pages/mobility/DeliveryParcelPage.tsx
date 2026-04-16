import { useState, useEffect, type ChangeEvent } from "react";
import { MapPin, Navigation, Shield, Clock, Users, Zap, Package, Camera, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CanonicalAddressInput } from "@/components/address/CanonicalAddressInput";
import type { CanonicalPlace } from "@/lib/address/canonical-place";
import { usePlatformBrain } from "@/hooks/usePlatformBrain";
import { loadRidePreview } from "@/lib/mobility/load-ride-preview";
import { cn } from "@/lib/utils";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";

const PARCEL_TYPES = [
  { id: "documents", label: "Documents", emoji: "📄", size: "xs_envelope" },
  { id: "small_package", label: "Small Package", emoji: "📦", size: "small" },
  { id: "medium_package", label: "Medium Package", emoji: "📦", size: "medium" },
  { id: "electronics", label: "Electronics", emoji: "💻", size: "medium" },
  { id: "fragile", label: "Fragile Item", emoji: "🥂", size: "medium" },
  { id: "large", label: "Large / Bulky", emoji: "🏗️", size: "large" },
];

export default function DeliveryParcelPage() {
  useUiEngine("mobility-deliveryparcelpage");
  const navigate = useNavigate();
  const { arbitration: station } = usePlatformBrain();
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
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [computedPrice, setComputedPrice] = useState<number | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);

  const canSubmit = parcelType && pickup && dropoff && recipientName;
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
      title="Send Parcel"
      subtitle="Documents · Packages · Fragile"
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
                <span className="text-[0.625rem] font-bold text-destructive">Surge</span>
              </div>
            )}
          </motion.div>
        )}

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
                <span className={cn("text-[0.6875rem] font-medium", parcelType === t.id ? "text-foreground" : "text-muted-foreground")}>{t.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

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

        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
            <Camera className="h-3 w-3" /> Photo of parcel (optional)
          </p>
          <label className="flex items-center justify-center w-full h-24 rounded-xl border-2 border-dashed border-border/30 bg-card/60 cursor-pointer hover:border-primary/30 transition-all overflow-hidden">
            {photoPreview ? (
              <img loading="lazy" src={photoPreview} alt="Parcel" className="h-full w-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-1 text-muted-foreground">
                <Camera className="w-5 h-5" />
                <span className="text-[0.625rem]">Tap to upload photo</span>
              </div>
            )}
            <input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} className="hidden" />
          </label>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Recipient</p>
          <input value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder="Recipient name"
            className="w-full px-3 py-2.5 rounded-xl border border-border/20 bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <input value={recipientPhone} onChange={e => setRecipientPhone(e.target.value)} placeholder="Recipient phone"
            className="w-full px-3 py-2.5 rounded-xl border border-border/20 bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Shield className="h-3 w-3" /> Delivery options</p>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Signature", state: requireSignature, set: setRequireSignature },
              { label: "OTP", state: requireOTP, set: setRequireOTP },
              { label: "Fragile", state: isFragile, set: setIsFragile },
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

        {canSubmit && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border/20 bg-card/60 p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Estimated price</span>
              {priceLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
              ) : (
                <span className="text-sm font-bold text-foreground">
                  {computedPrice != null ? `AED ${computedPrice}` : "AED 18 – 35"}
                </span>
              )}
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
          {computedPrice != null ? `Confirm — AED ${computedPrice}` : "Get Price Estimate"}
        </motion.button>
      </div>
    </SubPageShell>
  );
}
