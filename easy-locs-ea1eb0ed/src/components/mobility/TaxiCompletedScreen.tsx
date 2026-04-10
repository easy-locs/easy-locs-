import React, { useState } from "react";
import { useTaxiFlowStore } from "@/stores/taxiFlowStore";
import { useCustomerMobilityStore } from "@/stores/customerMobilityStore";
import { ReceiptText, RotateCcw, Star, CheckCircle2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export function TaxiCompletedScreen() {
  const { activeJobId, reset } = useTaxiFlowStore();
  const jobs = useCustomerMobilityStore(s => s.jobs);
  const job = jobs.find(j => j.id === activeJobId);
  const [rating, setRating] = useState(0);
  const [showReceipt, setShowReceipt] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  const handleRate = () => {
    if (rating === 0) {
      toast.info("Please select a rating");
      return;
    }
    setRatingSubmitted(true);
    toast.success(`Thank you! Rated ${rating} star${rating > 1 ? "s" : ""}`);
  };

  return (
    <motion.div
      key="taxi-completed"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex flex-col items-center justify-center py-10 px-6 text-center space-y-5"
    >
      {/* Celebration */}
      <div className="relative">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.1 }}
        >
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
        </motion.div>
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-primary/60"
            initial={{ scale: 0, x: 0, y: 0 }}
            animate={{
              scale: [0, 1, 0],
              x: Math.cos((i * Math.PI * 2) / 6) * 40,
              y: Math.sin((i * Math.PI * 2) / 6) * 40,
            }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            style={{ left: "50%", top: "50%", marginLeft: -4, marginTop: -4 }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-1"
      >
        <h2 className="text-lg font-bold text-foreground">Ride completed</h2>
        <p className="text-sm text-muted-foreground leading-snug">
          Thank you for riding with Easy-Locs.
        </p>
      </motion.div>

      {/* Summary */}
      {job && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="w-full max-w-[300px] rounded-xl border border-border/30 bg-card p-4 space-y-2"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">Fare</span>
            <span className="text-sm font-bold text-foreground">
              {job.current_price ?? job.quoted_price} {job.currency}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">Payment</span>
            <span className="text-sm font-semibold text-foreground capitalize">
              {job.payment_status || "Wallet"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">Service</span>
            <span className="text-sm text-foreground break-words text-right">
              {job.service_level.replace(/_/g, " ")}
            </span>
          </div>
          {job.confirmation_code && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">Ref</span>
              <span className="text-xs font-mono text-foreground">{job.confirmation_code}</span>
            </div>
          )}
        </motion.div>
      )}

      {/* Star Rating */}
      {!ratingSubmitted ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="w-full max-w-[300px] space-y-3"
        >
          <p className="text-xs font-bold text-foreground">Rate your ride</p>
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map(s => (
              <button key={s} type="button" onClick={() => setRating(s)} className="transition-transform active:scale-90">
                <Star className={`w-8 h-8 transition-colors ${s <= rating ? "fill-warning text-warning" : "text-muted-foreground/30"}`} />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleRate}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold active:scale-[0.97] transition-transform"
          >
            <Star className="w-4 h-4 shrink-0" /> Submit rating
          </button>
        </motion.div>
      ) : (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-emerald-500 font-medium"
        >
          Rating submitted — thank you!
        </motion.p>
      )}

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.65 }}
        className="w-full max-w-[300px] space-y-2"
      >
        <button
          type="button"
          onClick={() => setShowReceipt(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-muted/40 text-foreground text-sm font-semibold active:scale-[0.97] transition-transform"
        >
          <ReceiptText className="w-4 h-4 shrink-0" /> View receipt
        </button>
        <button
          type="button"
          onClick={() => reset()}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-muted/40 text-foreground text-sm font-semibold active:scale-[0.97] transition-transform"
        >
          <RotateCcw className="w-4 h-4 shrink-0" /> Book again
        </button>
      </motion.div>

      {/* Receipt modal */}
      <AnimatePresence>
        {showReceipt && job && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowReceipt(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()}
              className="bg-card rounded-2xl p-5 w-full max-w-sm space-y-4 border border-border/20 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-foreground">Trip Receipt</h3>
                <button onClick={() => setShowReceipt(false)} className="w-8 h-8 rounded-full bg-muted/40 flex items-center justify-center">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Service</span><span className="font-medium capitalize">{job.service_level.replace(/_/g, " ")}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">From</span><span className="font-medium text-right max-w-[60%] break-words">{job.pickup_label || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">To</span><span className="font-medium text-right max-w-[60%] break-words">{job.dropoff_label || "—"}</span></div>
                <div className="border-t border-border/10 my-2" />
                <div className="flex justify-between"><span className="text-muted-foreground">Fare</span><span className="font-bold">{job.current_price ?? job.quoted_price} {job.currency}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Payment</span><span className="font-medium capitalize">{job.payment_status || "Wallet"}</span></div>
                {job.confirmation_code && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Ref</span><span className="font-mono text-xs">{job.confirmation_code}</span></div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
