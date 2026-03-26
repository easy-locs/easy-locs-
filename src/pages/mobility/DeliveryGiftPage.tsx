/**
 * DeliveryGiftPage — Gift someone flow.
 * Station-driven with live context.
 */
import { useState } from "react";
import { ArrowLeft, Gift, MapPin, MessageSquare, Clock, Users, Heart, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CanonicalAddressInput } from "@/components/address/CanonicalAddressInput";
import type { CanonicalPlace } from "@/lib/address/canonical-place";
import { useArbitratedStation } from "@/hooks/useArbitratedStation";
import { cn } from "@/lib/utils";

const GIFT_IDEAS = [
  { emoji: "💐", label: "Flowers" },
  { emoji: "🎂", label: "Cake" },
  { emoji: "🧸", label: "Teddy bear" },
  { emoji: "🍫", label: "Chocolates" },
  { emoji: "🎈", label: "Balloons" },
  { emoji: "✨", label: "Custom" },
];

export default function DeliveryGiftPage() {
  const navigate = useNavigate();
  const station = useArbitratedStation();
  const [recipientAddress, setRecipientAddress] = useState<CanonicalPlace | null>(null);
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [giftMessage, setGiftMessage] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [giftDescription, setGiftDescription] = useState("");
  const [selectedIdea, setSelectedIdea] = useState<string | null>(null);

  const canSubmit = recipientAddress && recipientName && (giftDescription || selectedIdea);
  const etaMin = station.etas?.parcel;

  return (
    <div className="min-h-[100dvh] bg-background">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b border-border/30 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/mobility/delivery")} className="p-1.5 rounded-xl hover:bg-muted/60">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">Gift Someone</h1>
            <p className="text-xs text-muted-foreground">Send a surprise with ❤️</p>
          </div>
          {etaMin != null && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-pink-500/10">
              <Clock className="w-3 h-3 text-pink-500" />
              <span className="text-[10px] font-bold text-pink-500">~{etaMin}min</span>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-4 space-y-5">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500/10 to-rose-500/10 flex items-center justify-center mx-auto mb-3">
            <Gift className="h-8 w-8 text-pink-500" />
          </div>
          <p className="text-sm text-muted-foreground">Make someone's day special</p>
        </motion.div>

        {/* Gift ideas */}
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
                <span className="text-[11px] text-muted-foreground">{g.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Description */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <p className="text-xs font-semibold text-muted-foreground mb-1.5">What are you gifting?</p>
          <textarea
            value={giftDescription}
            onChange={e => setGiftDescription(e.target.value)}
            placeholder="Flowers, cake, perfume, custom item..."
            className="w-full p-3 rounded-xl border border-border/20 bg-card text-sm text-foreground placeholder:text-muted-foreground resize-none h-20 focus:outline-none focus:ring-2 focus:ring-pink-500/30"
          />
        </motion.div>

        {/* Recipient address */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
            <MapPin className="h-3 w-3 text-pink-500" /> Deliver to
          </p>
          <CanonicalAddressInput value={recipientAddress} onChange={setRecipientAddress} placeholder="Recipient's address" contextType="parcel_dropoff" allowSavedPlaces />
        </motion.div>

        {/* Recipient info */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Recipient</p>
          <input value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder="Recipient name"
            className="w-full px-3 py-2.5 rounded-xl border border-border/20 bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-pink-500/30" />
          <input value={recipientPhone} onChange={e => setRecipientPhone(e.target.value)} placeholder="Recipient phone"
            className="w-full px-3 py-2.5 rounded-xl border border-border/20 bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-pink-500/30" />
        </motion.div>

        {/* Gift message */}
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

        {/* Anonymous toggle */}
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

        {/* Price estimate */}
        {canSubmit && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border border-border/20 bg-card/60 p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Delivery estimate</span>
              <span className="text-sm font-bold text-foreground">AED 12 – 20</span>
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
            <Sparkles className="w-4 h-4" /> Send Gift
          </span>
        </motion.button>
      </div>
    </div>
  );
}
