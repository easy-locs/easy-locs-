/**
 * TaxiCompletedScreen — Step 5: Ride completed.
 * Premium summary with celebration animation + rate + receipt + book again.
 */
import React from "react";
import { useTaxiFlowStore } from "@/stores/taxiFlowStore";
import { useCustomerMobilityStore } from "@/stores/customerMobilityStore";
import { ReceiptText, RotateCcw, Star } from "lucide-react";
import { motion } from "framer-motion";

export function TaxiCompletedScreen() {
  const { activeJobId, reset } = useTaxiFlowStore();
  const jobs = useCustomerMobilityStore(s => s.jobs);
  const job = jobs.find(j => j.id === activeJobId);

  return (
    <motion.div
      key="taxi-completed"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex flex-col items-center justify-center py-12 px-6 text-center space-y-6"
    >
      {/* Celebration animation */}
      <div className="relative">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.1 }}
          className="text-5xl leading-none"
        >
          ✅
        </motion.div>
        {/* Confetti dots */}
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
          Thank you. Your trip has been completed successfully.
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
        </motion.div>
      )}

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="w-full max-w-[300px] space-y-2"
      >
        <button
          type="button"
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold active:scale-[0.97] transition-transform"
        >
          <Star className="w-4 h-4 shrink-0" /> Rate driver
        </button>
        <button
          type="button"
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
    </motion.div>
  );
}
