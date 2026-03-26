/**
 * TaxiRequestingScreen — Step 3: Searching for driver.
 * Premium animated waiting screen with dispatch status indicators.
 * Auto-transitions to tracking when job status changes.
 */
import React, { useEffect, useState } from "react";
import { useTaxiFlowStore } from "@/stores/taxiFlowStore";
import { useCustomerMobilityStore } from "@/stores/customerMobilityStore";
import { Loader2, Radar, ShieldCheck, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const STATUS_MESSAGES = [
  "Scanning nearby drivers",
  "Evaluating availability",
  "Checking ETA & trust score",
  "Finalizing match…",
];

export function TaxiRequestingScreen() {
  const { activeJobId, serviceLevel, setStep, reset } = useTaxiFlowStore();
  const jobs = useCustomerMobilityStore(s => s.jobs);
  const [msgIdx, setMsgIdx] = useState(0);

  // Cycle through status messages
  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIdx(prev => (prev + 1) % STATUS_MESSAGES.length);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

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
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex flex-col items-center justify-center py-16 px-6 text-center space-y-6"
    >
      {/* Animated radar with ripple rings */}
      <div className="relative w-28 h-28 flex items-center justify-center">
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="absolute inset-0 rounded-full border-2 border-primary/20"
            initial={{ scale: 0.5, opacity: 0.8 }}
            animate={{ scale: 1.8, opacity: 0 }}
            transition={{
              duration: 2.4,
              repeat: Infinity,
              delay: i * 0.8,
              ease: "easeOut",
            }}
          />
        ))}
        <motion.div
          className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <Radar className="w-8 h-8 text-primary" />
        </motion.div>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-bold text-foreground capitalize">
          Finding your {label}
        </h2>
        <p className="text-sm text-muted-foreground max-w-[260px]">
          Matching you with the best nearby driver using live zone intelligence.
        </p>
      </div>

      {/* Animated status messages */}
      <div className="space-y-2.5 w-full max-w-[260px]">
        {STATUS_MESSAGES.map((msg, idx) => {
          const isDone = idx < msgIdx;
          const isActive = idx === msgIdx;
          return (
            <motion.div
              key={msg}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: isDone || isActive ? 1 : 0.3, x: 0 }}
              transition={{ delay: idx * 0.15, duration: 0.3 }}
              className="flex items-center gap-3 text-sm"
            >
              {isDone ? (
                <Check className="w-4 h-4 text-primary shrink-0" />
              ) : isActive ? (
                <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded-full border border-border/40 shrink-0" />
              )}
              <span className={isDone || isActive ? "text-foreground" : "text-muted-foreground"}>
                {msg}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Safety badge */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="flex items-center gap-2 text-xs text-muted-foreground"
      >
        <ShieldCheck className="w-3.5 h-3.5 text-primary" />
        <span>Verified drivers only</span>
      </motion.div>

      {/* Cancel */}
      <motion.button
        type="button"
        onClick={() => reset()}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="text-xs text-destructive hover:text-destructive/80 transition-colors mt-4"
      >
        Cancel request
      </motion.button>
    </motion.div>
  );
}
