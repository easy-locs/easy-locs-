/**
 * TaxiRequestingScreen — Step 3: Searching for driver.
 * Animated waiting screen with dispatch status indicators.
 * Auto-transitions to tracking when job status changes.
 */
import React, { useEffect } from "react";
import { useTaxiFlowStore } from "@/stores/taxiFlowStore";
import { useCustomerMobilityStore } from "@/stores/customerMobilityStore";
import { Loader2, Radar, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

export function TaxiRequestingScreen() {
  const { activeJobId, serviceLevel, setStep, reset } = useTaxiFlowStore();
  const jobs = useCustomerMobilityStore(s => s.jobs);

  // Watch for job status change → transition to tracking
  const activeJob = jobs.find(j => j.id === activeJobId);
  useEffect(() => {
    if (!activeJob) return;
    const trackable = ["accepted", "rider_arriving_pickup", "rider_arrived_pickup", "picked_up", "in_progress", "rider_arriving_dropoff"];
    if (trackable.includes(activeJob.status)) {
      setStep("tracking");
    }
    if (["cancelled", "failed_no_rider", "expired"].includes(activeJob.status)) {
      reset();
    }
  }, [activeJob?.status]);

  const label = serviceLevel.replace("taxi_", "");

  return (
    <motion.div
      key="taxi-requesting"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex flex-col items-center justify-center py-16 px-6 text-center space-y-6"
    >
      {/* Animated radar */}
      <div className="relative w-24 h-24 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
        <div className="absolute inset-2 rounded-full bg-primary/20 animate-pulse" />
        <Radar className="w-10 h-10 text-primary relative z-10" />
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-bold text-foreground capitalize">
          Finding your {label}
        </h2>
        <p className="text-sm text-muted-foreground max-w-[260px]">
          Matching you with the best nearby driver using live zone intelligence.
        </p>
      </div>

      {/* Status indicators */}
      <div className="space-y-3 w-full max-w-[260px]">
        <div className="flex items-center gap-3 text-sm">
          <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
          <span className="text-muted-foreground">Scanning nearby drivers</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
          <span className="text-muted-foreground">Checking ETA, trust & availability</span>
        </div>
      </div>

      {/* Cancel */}
      <button
        type="button"
        onClick={() => reset()}
        className="text-xs text-destructive hover:text-destructive/80 transition-colors mt-4"
      >
        Cancel request
      </button>
    </motion.div>
  );
}
