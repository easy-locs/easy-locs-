import { useState } from "react";
import { motion } from "framer-motion";
import { X, AlertTriangle, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { C2C_REPORT_REASONS } from "@/lib/c2c/c2c-category-tree";

interface C2CReportSheetProps {
  onSubmit: (reason: string, details: string) => Promise<void>;
  onClose: () => void;
}

export default function C2CReportSheet({ onSubmit, onClose }: C2CReportSheetProps) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason) return;
    setSubmitting(true);
    try {
      await onSubmit(reason, details);
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
            <div className="p-2 rounded-xl bg-amber-500/10">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
            <h3 className="text-lg font-extrabold">Signaler l'annonce</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted active:scale-95"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-2">
          {C2C_REPORT_REASONS.map(r => (
            <button
              key={r.value}
              onClick={() => setReason(r.value)}
              className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all active:scale-[0.99] ${
                reason === r.value
                  ? "border-primary bg-primary/5 font-semibold shadow-sm"
                  : "border-border/50 hover:bg-muted/50"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <textarea
          value={details}
          onChange={e => setDetails(e.target.value)}
          placeholder="Détails supplémentaires (optionnel)..."
          className="w-full rounded-xl border border-border/50 bg-background px-3.5 py-2.5 text-sm min-h-[60px] resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          maxLength={1000}
        />

        <div className="flex items-start gap-2 bg-muted/30 rounded-xl p-3 text-[11px] text-muted-foreground">
          <Shield className="h-3.5 w-3.5 shrink-0 mt-0.5 text-blue-500" />
          <span>Votre signalement est confidentiel. Notre équipe examinera cette annonce sous 24h.</span>
        </div>

        <Button onClick={handleSubmit} disabled={submitting || !reason} variant="destructive" className="w-full h-12 rounded-xl text-sm font-bold">
          {submitting ? "Envoi en cours..." : "Envoyer le signalement"}
        </Button>
      </motion.div>
    </div>
  );
}
