/**
 * TaxiStepIndicator — Premium step progress bar for the taxi booking flow.
 * Animated pill-style indicator with step labels.
 */
import { motion } from "framer-motion";
import type { TaxiFlowStep } from "@/stores/taxiFlowStore";
import { cn } from "@/lib/utils";

const STEPS: { key: TaxiFlowStep; label: string; emoji: string }[] = [
  { key: "search", label: "Search", emoji: "🔍" },
  { key: "preview", label: "Route", emoji: "🗺️" },
  { key: "requesting", label: "Match", emoji: "📡" },
  { key: "tracking", label: "Trip", emoji: "🚕" },
  { key: "completed", label: "Done", emoji: "✅" },
];

const STEP_INDEX: Record<TaxiFlowStep, number> = {
  search: 0, preview: 1, requesting: 2, tracking: 3, completed: 4,
};

export function TaxiStepIndicator({ step }: { step: TaxiFlowStep }) {
  const currentIdx = STEP_INDEX[step];
  const progress = ((currentIdx) / (STEPS.length - 1)) * 100;

  return (
    <div className="px-1 py-2">
      {/* Progress bar */}
      <div className="relative h-1 rounded-full bg-muted/40 overflow-hidden mb-2">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-primary"
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        />
      </div>

      {/* Step dots */}
      <div className="flex items-center justify-between">
        {STEPS.map((s, idx) => {
          const isActive = idx === currentIdx;
          const isDone = idx < currentIdx;
          return (
            <div key={s.key} className="flex flex-col items-center gap-0.5">
              <motion.div
                initial={false}
                animate={{
                  scale: isActive ? 1.2 : 1,
                  opacity: isDone || isActive ? 1 : 0.4,
                }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-[10px]",
                  isActive && "ring-2 ring-primary/30",
                  isDone && "bg-primary/10",
                )}
              >
                {s.emoji}
              </motion.div>
              <span className={cn(
                "text-[8px] font-medium transition-colors",
                isActive ? "text-primary" : isDone ? "text-foreground" : "text-muted-foreground/50"
              )}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
