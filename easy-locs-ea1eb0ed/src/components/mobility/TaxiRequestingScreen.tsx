import React, { useEffect, useState } from "react";
import { useTaxiFlowStore } from "@/stores/taxiFlowStore";
import { useCustomerMobilityStore } from "@/stores/customerMobilityStore";
import { Loader2, ShieldCheck, Check } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

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

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIdx(prev => (prev + 1) % STATUS_MESSAGES.length);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

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
      <div className="relative w-28 h-28 flex items-center justify-center">
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="absolute inset-0 rounded-full"
            style={{ border: "2px solid hsl(var(--accent) / 0.2)" }}
            initial={{ scale: 0.5, opacity: 0.8 }}
            animate={{ scale: 1.8, opacity: 0 }}
            transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.8, ease: "easeOut" }}
          />
        ))}
        <motion.div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: "hsl(225 22% 16% / 0.1)" }}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <span className="text-3xl">🚗</span>
        </motion.div>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-bold text-foreground capitalize">
          Finding your {label}
        </h2>
        <p className="text-sm text-muted-foreground max-w-[260px]">
          Matching you with the best nearby driver
        </p>
      </div>

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
                <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "hsl(142 71% 45%)" }}>
                  <Check className="w-3 h-3 text-white" />
                </div>
              ) : isActive ? (
                <Loader2 className="w-5 h-5 animate-spin shrink-0" style={{ color: "hsl(var(--accent))" }} />
              ) : (
                <div className="w-5 h-5 rounded-full border border-border/40 shrink-0" />
              )}
              <span className={isDone || isActive ? "text-foreground" : "text-muted-foreground"}>
                {msg}
              </span>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="flex items-center gap-2 text-xs text-muted-foreground"
      >
        <ShieldCheck className="w-3.5 h-3.5" style={{ color: "hsl(142 71% 45%)" }} />
        <span>Verified drivers only</span>
      </motion.div>

      <motion.button
        type="button"
        onClick={async () => {
          if (activeJobId) {
            try {
              const cancelJob = useCustomerMobilityStore.getState().cancelJob;
              await cancelJob(activeJobId, "Customer cancelled during search");
              toast.success("Request cancelled");
            } catch {}
          }
          reset();
        }}
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
