/**
 * TaxiStepIndicator — Premium minimal step progress.
 * Thin animated bar only — no emoji clutter.
 */
import { motion } from "framer-motion";
import type { TaxiFlowStep } from "@/stores/taxiFlowStore";

const STEPS: TaxiFlowStep[] = ["search", "preview", "requesting", "tracking", "completed"];
const STEP_INDEX: Record<TaxiFlowStep, number> = {
  search: 0, preview: 1, requesting: 2, tracking: 3, completed: 4,
};

export function TaxiStepIndicator({ step }: { step: TaxiFlowStep }) {
  const progress = (STEP_INDEX[step] / (STEPS.length - 1)) * 100;

  return (
    <div className="relative h-1 rounded-full bg-muted/30 overflow-hidden">
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-primary/70"
        initial={false}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      />
    </div>
  );
}
