import { motion } from "framer-motion";
import type { TaxiFlowStep } from "@/stores/taxiFlowStore";

const STEPS: { key: TaxiFlowStep; label: string }[] = [
  { key: "search", label: "Search" },
  { key: "preview", label: "Confirm" },
  { key: "requesting", label: "Finding" },
  { key: "tracking", label: "Tracking" },
  { key: "completed", label: "Done" },
];

const STEP_INDEX: Record<TaxiFlowStep, number> = {
  search: 0, preview: 1, requesting: 2, tracking: 3, completed: 4,
};

export function TaxiStepIndicator({ step }: { step: TaxiFlowStep }) {
  const progress = (STEP_INDEX[step] / (STEPS.length - 1)) * 100;

  return (
    <div className="space-y-1.5">
      <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(226 24% 14% / 0.15)" }}>
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ background: "linear-gradient(90deg, hsl(226 24% 14%), hsl(var(--accent)))" }}
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        />
      </div>
      <div className="flex items-center justify-between px-0.5">
        {STEPS.map((s, i) => {
          const done = STEP_INDEX[step] >= i;
          const active = step === s.key;
          return (
            <span
              key={s.key}
              className="text-[10px] font-bold uppercase tracking-wider transition-colors"
              style={{
                color: active ? "hsl(var(--accent))" : done ? "hsl(var(--foreground))" : "hsl(0 0% 60%)",
              }}
            >
              {s.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
