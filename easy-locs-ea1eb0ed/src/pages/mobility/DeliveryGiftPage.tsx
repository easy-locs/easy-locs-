import { useState, useEffect, type ChangeEvent } from "react";
import { Gift, MapPin, MessageSquare, Clock, Heart, Sparkles, Camera, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CanonicalAddressInput } from "@/components/address/CanonicalAddressInput";
import type { CanonicalPlace } from "@/lib/address/canonical-place";
import { usePlatformBrain } from "@/hooks/usePlatformBrain";
import { loadRidePreview } from "@/lib/mobility/load-ride-preview";
import { cn } from "@/lib/utils";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";

const GIFT_IDEAS = [
  { emoji: "💐", label: "Flowers" },
  { emoji: "🎂", label: "Cake" },
  { emoji: "🧸", label: "Teddy bear" },
  { emoji: "🍫", label: "Chocolates" },
  { emoji: "🎈", label: "Balloons" },
  { emoji: "✨", label: "Custom" },
];

export default function DeliveryGiftPage() {
  useUiEngine("mobility-deliverygiftpage");
  const navigate = useNavigate();
  const { arbitration: station } = usePlatformBrain();
  const [pickupAddress, setPickupAddress] = useState<CanonicalPlace | null>(null);
  const [recipientAddress, setRecipientAddress] = useState<CanonicalPlace | null>(null);
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [giftMessage, setGiftMessage] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [giftDescription, setGiftDescription] = useState("");
  const [selectedIdea, setSelectedIdea] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [computedPrice, setComputedPrice] = useState<number | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);

  const canSubmit = pickupAddress && recipientAddress && recipientName && (giftDescription || selectedIdea);
  const etaMin = station.etas?.parcel;

  useEffect(() => {
    if (!pickupAddress || !recipientAddress) { setComputedPrice(null); return; }
    let cancelled = false;
    setPriceLoading(true);
    loadRidePreview({
      pickup: { lat: pickupAddress.lat, lng: pickupAddress.lng },
      dropoff: { lat: recipientAddress.lat, lng: recipientAddress.lng },
      serviceLevel: "taxi_standard",
    }).then(d => {
      if (!cancelled && d.ready) setComputedPrice(d.estimatedFare);
    }).catch(() => {}).finally(() => { if (!cancelled) setPriceLoading(false); });
    return () => { cancelled = true; };
  }, [pickupAddress, recipientAddress]);

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
      title="Gift Someone"
      subtitle="Send a surprise"
      onBack={() => navigate("/mobility/delivery")}
      rightAction={etaMin != null ? (
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-pink-500/10">
          <Clock className="w-3 h-3 text-pink-500" />
          <span className="text-[0.625rem] font-bold text-pink-500">~{etaMin}min</span>
        </div>
      ) : undefined}
      noContentPad
    >
      <div className="px-4 py-4 space-y-5">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500/10 to-rose-500/10 flex items-center justify-center mx-auto mb-3">
            <Gift className="h-8 w-8 text-pink-500" />
          </div>
          <p className="text-sm text-muted-foreground">Make someone's day special</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Gift ideas</p>
          <div className="grid grid-cols-3 gap-2">
            {GIFT_IDEAS.map(g => (
              <button
                key={g.label}
                onClick={() => {
                  setSelectedIdea(g.label);
                  if (!giftDescription) setGiftDescription(g.label);
                }}
                className={cn(
                  "p-3 rounded-xl border text-center transition-all",
                  selectedIdea === g.label
                    ? "border-pink-500 bg-pink-500/5 shadow-sm"
                    : "border-border/20 bg-card/60 hover:border-border/40"
                )}
              >
                <span className="text-xl block mb-1">{g.emoji}</span>
                <span className="text-[0.6875rem] text-muted-foreground">{g.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <p className="text-xs font-semibold text-muted-foreground mb-1.5">What are you gifting?</p>
          <textarea
            value={giftDescription}
            onChange={e => setGiftDescription(e.target.value)}
            placeholder="Flowers, cake, perfume, custom item..."
            className="w-full p-3 rounded-xl border border-border/20 bg-card text-sm text-foreground placeholder:text-muted-foreground resize-none h-20 focus:outline-none focus:ring-2 focus:ring-pink-500/30"
          />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
            <Camera className="h-3 w-3" /> Photo of gift (optional)
          </p>
          <label className="flex items-center justify-center w-full h-24 rounded-xl border-2 border-dashed border-pink-500/20 bg-card/60 cursor-pointer hover:border-pink-500/40 transition-all overflow-hidden">
            {photoPreview ? (
              <img loading="lazy" src={photoPreview} alt="Gift" className="h-full w-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-1 text-muted-foreground">
                <Camera className="w-5 h-5" />
                <span className="text-[0.625rem]">Tap to upload photo</span>
              </div>
            )}
            <input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} className="hidden" />
          </label>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
              <MapPin className="h-3 w-3 text-pink-500" /> Pickup from (store/location)
            </p>
            <CanonicalAddressInput value={pickupAddress} onChange={setPickupAddress} placeholder="Where to pick up the gift" contextType="parcel_pickup" allowSavedPlaces />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
              <MapPin className="h-3 w-3 text-pink-500" /> Deliver to
            </p>
            <CanonicalAddressInput value={recipientAddress} onChange={setRecipientAddress} placeholder="Recipient's address" contextType="parcel_dropoff" allowSavedPlaces />
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Recipient</p>
          <input value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder="Recipient name"
            className="w-full px-3 py-2.5 rounded-xl border border-border/20 bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-pink-500/30" />
          <input value={recipientPhone} onChange={e => setRecipientPhone(e.target.value)} placeholder="Recipient phone"
            className="w-full px-3 py-2.5 rounded-xl border border-border/20 bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-pink-500/30" />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
            <MessageSquare className="h-3 w-3" /> Gift message
          </p>
          <textarea
            value={giftMessage}
            onChange={e => setGiftMessage(e.target.value)}
            placeholder="Happy birthday! 🎉"
            className="w-full p-3 rounded-xl border border-border/20 bg-card text-sm text-foreground placeholder:text-muted-foreground resize-none h-20 focus:outline-none focus:ring-2 focus:ring-pink-500/30"
          />
        </motion.div>

        <button
          onClick={() => setAnonymous(!anonymous)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold border transition-all",
            anonymous ? "border-pink-500 bg-pink-500/10 text-pink-600" : "border-border/20 text-muted-foreground"
          )}
        >
          <Heart className={cn("w-3.5 h-3.5", anonymous && "fill-current")} />
          Send anonymously
        </button>

        {canSubmit && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border border-border/20 bg-card/60 p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Delivery estimate</span>
              {priceLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
              ) : (
                <span className="text-sm font-bold text-foreground">
                  {computedPrice != null ? `AED ${computedPrice}` : "AED 12 – 20"}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Estimated time</span>
              <span className="text-sm font-bold text-foreground">{etaMin ?? "~25"} min</span>
            </div>
          </motion.div>
        )}

        <motion.button
          disabled={!canSubmit}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold text-sm disabled:opacity-40 transition-all active:scale-[0.98] shadow-lg shadow-pink-500/20"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <span className="flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4" /> {computedPrice != null ? `Send Gift — AED ${computedPrice}` : "Send Gift"}
          </span>
        </motion.button>
      </div>
    </SubPageShell>
  );
}
