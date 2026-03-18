/**
 * RideSearchAnimatedState — Animated ride search status with wave progress, radius & ride type.
 */
import { motion, AnimatePresence } from "framer-motion";

interface RideSearchAnimatedStateProps {
  status: "idle" | "searching" | "assigned" | "expired" | "error";
  nearbyCount?: number;
  currentWave?: number;
  etaMin?: number | null;
  radiusKm?: number | null;
  rideTypeUsed?: string | null;
}

export default function RideSearchAnimatedState({
  status,
  nearbyCount,
  currentWave,
  etaMin,
  radiusKm,
  rideTypeUsed,
}: RideSearchAnimatedStateProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-5">
      <AnimatePresence mode="wait">
        {status === "searching" && (
          <motion.div
            key="searching"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-2"
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-accent animate-pulse" />
              Finding the fastest driver
            </div>
            <div className="text-xs text-muted-foreground">
              {nearbyCount ?? 0} nearby · wave {(currentWave ?? 0) + 1}
              {radiusKm ? ` · ${radiusKm} km radius` : ""}
              {rideTypeUsed ? ` · ${rideTypeUsed}` : ""}
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-accent"
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ duration: 1.3, repeat: Infinity, ease: "linear" }}
              />
            </div>
          </motion.div>
        )}

        {status === "assigned" && (
          <motion.div
            key="assigned"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-2"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-success">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-success" />
              Driver found
            </div>
            <div className="text-xs text-muted-foreground">
              {etaMin != null ? `Arriving in about ${etaMin} min` : "Your ride is confirmed"}
            </div>
          </motion.div>
        )}

        {status === "expired" && (
          <motion.div
            key="expired"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-2"
          >
            <div className="text-sm font-semibold">No driver accepted</div>
            <div className="text-xs text-muted-foreground">
              Search can retry with expanded radius
            </div>
          </motion.div>
        )}

        {status === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-2"
          >
            <div className="text-sm font-semibold">Something went wrong</div>
            <div className="text-xs text-muted-foreground">Please try again</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
