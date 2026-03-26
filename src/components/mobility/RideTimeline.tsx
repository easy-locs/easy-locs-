/**
 * RideTimeline — Canonical step timeline for ride tracking.
 * Displays: Requested → Driver assigned → At pickup → In progress → Arrived
 */
import { cn } from "@/lib/utils";
import { tc } from "@/lib/i18n-canonical";
import { getTimelineStep } from "@/lib/mobility/status-machine";
import { motion } from "framer-motion";

const STEPS = [
  "ride.timeline_requested",
  "ride.timeline_assigned",
  "ride.timeline_pickup",
  "ride.timeline_progress",
  "ride.timeline_arrived",
] as const;

export function RideTimeline({ status }: { status: string }) {
  const step = getTimelineStep(status);

  return (
    <div className="flex items-center gap-1">
      {STEPS.map((key, i) => (
        <div key={key} className="flex-1 flex flex-col items-center gap-1">
          <motion.div
            className={cn(
              "w-full h-1.5 rounded-full transition-colors duration-500",
              i <= step ? "bg-primary" : "bg-muted"
            )}
            initial={false}
            animate={{ scaleX: i <= step ? 1 : 0.95, opacity: i <= step ? 1 : 0.5 }}
            transition={{ duration: 0.3 }}
          />
          <span className="text-[9px] text-muted-foreground leading-tight text-center">
            {tc(key)}
          </span>
        </div>
      ))}
    </div>
  );
}
