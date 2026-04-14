/**
 * StatusPulse — Animated status indicator for engine/system states.
 */
import { cn } from "@/lib/utils";

type PulseStatus = "active" | "processing" | "warning" | "error" | "idle";

const COLORS: Record<PulseStatus, { dot: string; ring: string; glow: string }> = {
  active:     { dot: "bg-emerald-500", ring: "bg-emerald-500/30", glow: "shadow-[0_0_6px_hsl(152_60%_45%/0.4)]" },
  processing: { dot: "bg-blue-500",    ring: "bg-blue-500/30",    glow: "shadow-[0_0_6px_hsl(210_80%_55%/0.4)]" },
  warning:    { dot: "bg-amber-500",   ring: "bg-amber-500/30",   glow: "shadow-[0_0_6px_hsl(38_92%_50%/0.4)]" },
  error:      { dot: "bg-red-500",     ring: "bg-red-500/30",     glow: "shadow-[0_0_6px_hsl(0_84%_60%/0.4)]" },
  idle:       { dot: "bg-muted-foreground/40", ring: "bg-transparent", glow: "" },
};

export function StatusPulse({ status = "idle", size = "sm" }: { status?: PulseStatus; size?: "sm" | "md" }) {
  const { dot, ring, glow } = COLORS[status];
  const dim = size === "sm" ? "w-2.5 h-2.5" : "w-3.5 h-3.5";
  const ringDim = size === "sm" ? "w-2.5 h-2.5" : "w-3.5 h-3.5";

  return (
    <span className="relative inline-flex">
      {status !== "idle" && (
        <span className={cn("absolute inline-flex rounded-full opacity-75 animate-ping", ringDim, ring)} />
      )}
      <span className={cn("relative inline-flex rounded-full", dim, dot, glow)} />
    </span>
  );
}
