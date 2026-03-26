/**
 * TaxiCompletedScreen — Step 5: Ride completed.
 * Summary + rate + receipt + book again.
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
      className="flex flex-col items-center justify-center py-12 px-6 text-center space-y-6"
    >
      <div className="text-5xl">✅</div>

      <div className="space-y-1">
        <h2 className="text-lg font-bold text-foreground">Ride completed</h2>
        <p className="text-sm text-muted-foreground">
          Thank you. Your trip has been completed successfully.
        </p>
      </div>

      {/* Summary */}
      {job && (
        <div className="w-full max-w-[280px] rounded-xl border border-border/30 bg-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Fare</span>
            <span className="text-sm font-bold text-foreground">
              {job.current_price ?? job.quoted_price} {job.currency}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Payment</span>
            <span className="text-sm font-semibold text-foreground capitalize">
              {job.payment_status || "Wallet"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Service</span>
            <span className="text-sm text-foreground">
              {job.service_level.replace(/_/g, " ")}
            </span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="w-full max-w-[280px] space-y-2">
        <button
          type="button"
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
        >
          <Star className="w-4 h-4" /> Rate driver
        </button>
        <button
          type="button"
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-muted/40 text-foreground text-sm font-semibold"
        >
          <ReceiptText className="w-4 h-4" /> View receipt
        </button>
        <button
          type="button"
          onClick={() => reset()}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-muted/40 text-foreground text-sm font-semibold"
        >
          <RotateCcw className="w-4 h-4" /> Book again
        </button>
      </div>
    </motion.div>
  );
}
