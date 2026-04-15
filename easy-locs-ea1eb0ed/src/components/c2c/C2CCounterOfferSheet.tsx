import { useState } from "react";
import { motion } from "framer-motion";
import { X, HandCoins, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface C2CCounterOfferSheetProps {
  currentAmount: number;
  currency: string;
  listingTitle: string;
  onSubmit: (amount: number) => Promise<void>;
  onClose: () => void;
}

export default function C2CCounterOfferSheet({ currentAmount, currency, listingTitle, onSubmit, onClose }: C2CCounterOfferSheetProps) {
  const [amount, setAmount] = useState(Math.round(currentAmount * 1.1).toString());
  const [submitting, setSubmitting] = useState(false);

  const numAmount = parseFloat(amount) || 0;
  const pctDiff = currentAmount > 0 ? ((numAmount - currentAmount) / currentAmount) * 100 : 0;

  const handleSubmit = async () => {
    if (isNaN(numAmount) || numAmount <= 0) return;
    setSubmitting(true);
    try {
      await onSubmit(numAmount);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const fmt = (v: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(v);

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
            <div className="p-2 rounded-xl bg-amber-500/10">
              <HandCoins className="h-5 w-5 text-amber-600" />
            </div>
            <h3 className="text-lg font-extrabold">Contre-offre</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted active:scale-95"><X className="h-5 w-5" /></button>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-1">{listingTitle}</p>
        <p className="text-xs text-muted-foreground">
          Offre reçue : <span className="font-bold text-foreground">{fmt(currentAmount)}</span>
        </p>

        <div>
          <label className="text-sm font-semibold">Votre contre-offre ({currency})</label>
          <Input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            min={0}
            className="mt-1.5 text-lg font-bold h-12"
            placeholder="Montant"
            autoFocus
          />
          {numAmount > 0 && (
            <div className={`flex items-center gap-1 mt-1.5 text-xs font-medium ${pctDiff > 0 ? "text-emerald-600" : pctDiff < 0 ? "text-red-500" : "text-muted-foreground"}`}>
              {pctDiff > 0 ? <TrendingUp className="h-3 w-3" /> : pctDiff < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
              {pctDiff === 0 ? "Identique à l'offre" : `${Math.abs(pctDiff).toFixed(0)}% ${pctDiff > 0 ? "au-dessus" : "en dessous"} de l'offre`}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {[1.05, 1.1, 1.15, 1.2].map(factor => (
            <button
              key={factor}
              onClick={() => setAmount(Math.round(currentAmount * factor).toString())}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-muted/60 text-muted-foreground hover:bg-muted transition-colors active:scale-95"
            >
              +{Math.round((factor - 1) * 100)}%
            </button>
          ))}
        </div>

        <Button onClick={handleSubmit} disabled={submitting || numAmount <= 0} className="w-full h-12 text-sm font-bold rounded-xl">
          {submitting ? "Envoi..." : `Envoyer · ${numAmount > 0 ? fmt(numAmount) : ""}`}
        </Button>
      </motion.div>
    </div>
  );
}
