/**
 * TrackingStatusBar — Premium status display for service tracking.
 * Shows: status stepper, ETA, distance, action buttons.
 * PASS55 Block G
 */
import { motion } from "framer-motion";
import {
  Navigation, Clock, MapPin, CheckCircle2,
  Play, Flag, XCircle, Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { haptic } from "@/lib/haptics";
import type { TrackingSession, TrackingStatus } from "@/hooks/useServiceTracking";

interface Props {
  session: TrackingSession;
  distanceKm: number | null;
  isTracker?: boolean;
  onStart?: () => void;
  onArrive?: () => void;
  onComplete?: () => void;
}

const STEPS: { status: TrackingStatus; label: string; icon: React.ElementType }[] = [
  { status: "pending", label: "En attente", icon: Clock },
  { status: "en_route", label: "En route", icon: Navigation },
  { status: "nearby", label: "À proximité", icon: MapPin },
  { status: "arrived", label: "Arrivé", icon: Flag },
  { status: "completed", label: "Terminé", icon: CheckCircle2 },
];

const STATUS_INDEX: Record<string, number> = {
  pending: 0,
  en_route: 1,
  nearby: 2,
  arrived: 3,
  completed: 4,
  cancelled: -1,
};

export default function TrackingStatusBar({ session, distanceKm, isTracker, onStart, onArrive, onComplete }: Props) {
  const currentIdx = STATUS_INDEX[session.status] ?? 0;

  return (
    <div className="rounded-2xl p-4 space-y-4" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.12)" }}>

      {/* Context header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "hsl(var(--hud-cyan) / 0.1)" }}>
          <Truck className="h-5 w-5" style={{ color: "hsl(var(--hud-cyan))" }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: "hsl(var(--hud-text))" }}>
            {session.context_label || session.context_type}
          </p>
          {session.destination_label && (
            <p className="text-[11px] truncate" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
              → {session.destination_label}
            </p>
          )}
        </div>
        {/* ETA badge */}
        {session.eta_minutes && session.status === "en_route" && (
          <motion.div
            className="flex items-center gap-1 px-3 py-1.5 rounded-full"
            style={{ background: "hsl(var(--hud-cyan) / 0.12)", border: "1px solid hsl(var(--hud-cyan) / 0.2)" }}
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Clock className="h-3 w-3" style={{ color: "hsl(var(--hud-cyan))" }} />
            <span className="text-xs font-bold" style={{ color: "hsl(var(--hud-cyan))" }}>
              {session.eta_minutes} min
            </span>
          </motion.div>
        )}
      </div>

      {/* Status stepper */}
      <div className="flex items-center gap-1">
        {STEPS.map((step, i) => {
          const isActive = i === currentIdx;
          const isDone = i < currentIdx;
          const StepIcon = step.icon;
          return (
            <div key={step.status} className="flex-1 flex flex-col items-center gap-1">
              <div className="relative">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-all"
                  style={{
                    background: isDone
                      ? "hsl(var(--hud-success))"
                      : isActive
                        ? "hsl(var(--hud-cyan))"
                        : "hsl(var(--hud-surface))",
                    border: `2px solid ${isDone ? "hsl(var(--hud-success))" : isActive ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-border) / 0.15)"}`,
                    boxShadow: isActive ? "0 0 12px hsl(var(--hud-cyan) / 0.4)" : "none",
                  }}
                >
                  <StepIcon
                    className="h-3 w-3"
                    style={{
                      color: isDone || isActive ? "hsl(var(--hud-bg))" : "hsl(var(--hud-text-dim) / 0.3)",
                    }}
                  />
                </div>
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{ border: "2px solid hsl(var(--hud-cyan))" }}
                    animate={{ scale: [1, 1.8], opacity: [0.5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}
              </div>
              <span
                className="text-[8px] font-medium text-center leading-tight"
                style={{
                  color: isDone || isActive ? "hsl(var(--hud-text))" : "hsl(var(--hud-text-dim) / 0.3)",
                }}
              >
                {step.label}
              </span>
              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div
                  className="absolute top-3.5 h-[2px]"
                  style={{
                    left: "calc(50% + 14px)",
                    right: "calc(-50% + 14px)",
                    background: isDone ? "hsl(var(--hud-success))" : "hsl(var(--hud-border) / 0.1)",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Distance info */}
      {distanceKm !== null && session.status !== "completed" && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "hsl(var(--hud-bg) / 0.5)" }}>
          <MapPin className="h-3 w-3" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }} />
          <span className="text-[11px]" style={{ color: "hsl(var(--hud-text-dim) / 0.6)" }}>
            {distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(1)} km`} restant
          </span>
        </div>
      )}

      {/* Action buttons (tracker only) */}
      {isTracker && (
        <div className="flex gap-2">
          {session.status === "pending" && onStart && (
            <Button
              className="flex-1 gap-2 h-11"
              style={{ background: "hsl(var(--hud-cyan))", color: "hsl(var(--hud-bg))" }}
              onClick={() => { onStart(); haptic("medium"); }}
            >
              <Play className="h-4 w-4" /> Démarrer
            </Button>
          )}
          {(session.status === "en_route" || session.status === "nearby") && onArrive && (
            <Button
              className="flex-1 gap-2 h-11"
              style={{ background: "hsl(var(--hud-success))", color: "hsl(var(--hud-bg))" }}
              onClick={() => { onArrive(); haptic("success"); }}
            >
              <Flag className="h-4 w-4" /> Arrivé
            </Button>
          )}
          {session.status === "arrived" && onComplete && (
            <Button
              className="flex-1 gap-2 h-11"
              style={{ background: "hsl(var(--hud-success))", color: "hsl(var(--hud-bg))" }}
              onClick={() => { onComplete(); haptic("success"); }}
            >
              <CheckCircle2 className="h-4 w-4" /> Terminer
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
