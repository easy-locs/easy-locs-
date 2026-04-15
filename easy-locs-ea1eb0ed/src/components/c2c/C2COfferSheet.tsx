import { useState } from "react";
import { motion } from "framer-motion";
import { X, HandCoins, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface C2COfferSheetProps {
  listingTitle: string;
  listingPrice: number;
  currency: string;
  onSubmit: (amount: number, message: string, expiryHours: number | null) => Promise<void>;
  onClose: () => void;
}

const EXPIRY_OPTIONS = [
  { label: "1h", hours: 1 },
  { label: "6h", hours: 6 },
  { label: "24h", hours: 24 },
  { label: "48h", hours: 48 },
  { label: "3j", hours: 72 },
  { label: "7j", hours: 168 },
  { label: "Sans limite", hours: null as number | null },
];

const QUICK_DISCOUNTS = [
  { label: "-5%", factor: 0.95 },
  { label: "-10%", factor: 0.90 },
  { label: "-15%", factor: 0.85 },
  { label: "-20%", factor: 0.80 },
];

export default function C2COfferSheet({ listingTitle, listingPrice, currency, onSubmit, onClose }: C2COfferSheetProps) {
  const [amount, setAmount] = useState(Math.round(listingPrice * 0.9).toString());
  const [message, setMessage] = useState("");
  const [expiryHours, setExpiryHours] = useState<number | null>(24);
  const [submitting, setSubmitting] = useState(false);

  const numAmount = parseFloat(amount) || 0;
  const pctDiff = listingPrice > 0 ? ((numAmount - listingPrice) / listingPrice) * 100 : 0;

  const handleSubmit = async () => {
    if (isNaN(numAmount) || numAmount <= 0) return;
    setSubmitting(true);
    try {
      await onSubmit(numAmount, message, expiryHours);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-card w-full max-w-lg rounded-t-3xl p-5 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-muted-foreground/20 rounded-full mx-auto -mt-1 mb-2" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10">
              <HandCoins className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-lg font-extrabold">Faire une offre</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted active:scale-95"><X className="h-5 w-5" /></button>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-1">{listingTitle}</p>
        <p className="text-xs text-muted-foreground">
          Prix affiché : <span className="font-bold text-foreground">{new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(listingPrice)}</span>
        </p>

        <div>
          <label className="text-sm font-semibold">Votre offre ({currency})</label>
          <Input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            min={0}
            className="mt-1.5 text-lg font-bold h-12"
            placeholder="Montant proposé"
          />
          {numAmount > 0 && (
            <div className={`flex items-center gap-1 mt-1.5 text-xs font-medium ${pctDiff < 0 ? "text-emerald-600" : pctDiff > 0 ? "text-red-500" : "text-muted-foreground"}`}>
              {pctDiff < 0 ? <TrendingDown className="h-3 w-3" /> : pctDiff > 0 ? <TrendingUp className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
              {pctDiff === 0 ? "Prix identique" : `${Math.abs(pctDiff).toFixed(0)}% ${pctDiff < 0 ? "en dessous" : "au-dessus"} du prix affiché`}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {QUICK_DISCOUNTS.map(qd => (
            <button
              key={qd.label}
              onClick={() => setAmount(Math.round(listingPrice * qd.factor).toString())}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-muted/60 text-muted-foreground hover:bg-muted transition-colors active:scale-95"
            >
              {qd.label}
            </button>
          ))}
        </div>

        <div>
          <label className="text-sm font-semibold">Message (optionnel)</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Expliquez pourquoi ce prix..."
            className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm min-h-[60px] resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            maxLength={500}
          />
        </div>

        <div>
          <label className="text-sm font-semibold">Expiration</label>
          <div className="flex gap-1.5 flex-wrap mt-1.5">
            {EXPIRY_OPTIONS.map(opt => (
              <button
                key={opt.label}
                onClick={() => setExpiryHours(opt.hours)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95 ${
                  expiryHours === opt.hours
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <Button onClick={handleSubmit} disabled={submitting || !amount || numAmount <= 0} className="w-full h-12 text-sm font-bold rounded-xl">
          {submitting ? "Envoi..." : `Envoyer l'offre · ${numAmount > 0 ? new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(numAmount) : ""}`}
        </Button>
      </motion.div>
    </div>
  );
}
