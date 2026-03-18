/**
 * RadarOverlay — Live driver radar counter + ETA display.
 * 
 * Shows:
 * - Number of nearby drivers
 * - Best ETA
 * - Connection status indicator
 * - Animated radar pulse
 */
import { motion } from "framer-motion";
import { Radio, Wifi, WifiOff, Clock, Car } from "lucide-react";
import type { RadarStats } from "@/hooks/useDriverRadar";

interface RadarOverlayProps {
  stats: RadarStats;
  connected: boolean;
  loading: boolean;
  formatEta: (seconds: number | null) => string;
  className?: string;
}

export default function RadarOverlay({ stats, connected, loading, formatEta, className = "" }: RadarOverlayProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Radar Pulse */}
      <div className="relative">
        <motion.div
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{
            background: "hsl(var(--hud-surface))",
            border: "1px solid hsl(var(--hud-border) / 0.2)",
            boxShadow: "0 4px 12px hsl(var(--hud-primary) / 0.1)",
          }}
        >
          <Radio className="h-4 w-4" style={{
            color: connected ? "hsl(var(--hud-primary))" : "hsl(var(--hud-text-dim))",
          }} />
        </motion.div>
        {/* Live pulse ring */}
        {connected && stats.available > 0 && (
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ border: "1.5px solid hsl(var(--hud-primary) / 0.4)" }}
            animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </div>

      {/* Stats Card */}
      <div className="flex flex-col gap-0.5 px-3 py-1.5 rounded-xl" style={{
        background: "hsl(var(--hud-surface) / 0.9)",
        backdropFilter: "blur(12px)",
        border: "1px solid hsl(var(--hud-border) / 0.15)",
      }}>
        {loading ? (
          <span className="text-[10px] font-medium" style={{ color: "hsl(var(--hud-text-dim))" }}>
            Scanning…
          </span>
        ) : (
          <>
            <div className="flex items-center gap-1.5">
              <Car className="h-3 w-3" style={{ color: "hsl(var(--hud-success))" }} />
              <span className="text-xs font-bold" style={{ color: "hsl(var(--hud-text))" }}>
                {stats.available}
              </span>
              <span className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim))" }}>
                {stats.available === 1 ? "driver" : "drivers"} nearby
              </span>
            </div>

            {stats.bestEta !== null && (
              <div className="flex items-center gap-1.5">
                <Clock className="h-3 w-3" style={{ color: "hsl(var(--hud-cyan))" }} />
                <span className="text-[10px] font-medium" style={{ color: "hsl(var(--hud-cyan))" }}>
                  {formatEta(stats.bestEta)}
                </span>
                <span className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim))" }}>
                  fastest
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Connection indicator */}
      <div className="h-5 w-5 rounded-full flex items-center justify-center" style={{
        background: connected
          ? "hsl(var(--hud-success) / 0.1)"
          : "hsl(var(--hud-warning) / 0.1)",
      }}>
        {connected ? (
          <Wifi className="h-3 w-3" style={{ color: "hsl(var(--hud-success))" }} />
        ) : (
          <WifiOff className="h-3 w-3" style={{ color: "hsl(var(--hud-warning))" }} />
        )}
      </div>
    </div>
  );
}
