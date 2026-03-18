/**
 * RadarPanel — Live radar stats display.
 * Shows nearby driver count, best ETA, connection status.
 */
import { motion } from "framer-motion";
import { Radio, Car, Clock, Wifi, WifiOff, Zap } from "lucide-react";
import { useRadar } from "@/hooks/useRadar";

interface RadarPanelProps {
  type?: "taxi" | "delivery";
  compact?: boolean;
  className?: string;
}

export default function RadarPanel({ type = "taxi", compact = false, className = "" }: RadarPanelProps) {
  const { radar, connected, formatETA, loading } = useRadar({ type });

  if (!radar && !loading) return null;

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="relative">
          <div className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.2)" }}>
            <Radio className="h-3.5 w-3.5" style={{ color: connected ? "hsl(var(--hud-primary))" : "hsl(var(--hud-text-dim))" }} />
          </div>
          {connected && radar && radar.availableCount > 0 && (
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ border: "1px solid hsl(var(--hud-primary) / 0.3)" }}
              animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-bold" style={{ color: "hsl(var(--hud-text))" }}>
            {loading ? "Scanning…" : `${radar?.availableCount || 0} ${type === "taxi" ? "taxis" : "couriers"}`}
          </span>
          {radar?.etaMinutes !== null && radar?.etaMinutes !== undefined && (
            <span className="text-[10px]" style={{ color: "hsl(var(--hud-cyan))" }}>
              ⚡ {formatETA(radar.etaMinutes)} fastest
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl p-4 ${className}`} style={{
      background: "hsl(var(--hud-surface))",
      border: "1px solid hsl(var(--hud-border) / 0.15)",
      boxShadow: "0 4px 20px hsl(var(--hud-primary) / 0.05)",
    }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: "hsl(var(--hud-primary) / 0.1)" }}>
              <Radio className="h-4 w-4" style={{ color: "hsl(var(--hud-primary))" }} />
            </div>
            {connected && (
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ border: "1.5px solid hsl(var(--hud-primary) / 0.3)" }}
                animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>
              Live Radar
            </h3>
            <p className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim))" }}>
              {type === "taxi" ? "Drivers" : "Couriers"} around you
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{
          background: connected ? "hsl(var(--hud-success) / 0.1)" : "hsl(var(--hud-warning) / 0.1)",
        }}>
          {connected ? (
            <Wifi className="h-3 w-3" style={{ color: "hsl(var(--hud-success))" }} />
          ) : (
            <WifiOff className="h-3 w-3" style={{ color: "hsl(var(--hud-warning))" }} />
          )}
          <span className="text-[9px] font-semibold" style={{
            color: connected ? "hsl(var(--hud-success))" : "hsl(var(--hud-warning))",
          }}>
            {connected ? "Live" : "Polling"}
          </span>
        </div>
      </div>

      {/* Stats grid */}
      {loading ? (
        <div className="flex items-center justify-center py-4">
          <motion.div
            className="w-6 h-6 rounded-full border-2"
            style={{ borderColor: "hsl(var(--hud-primary) / 0.3)", borderTopColor: "hsl(var(--hud-primary))" }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        </div>
      ) : radar ? (
        <div className="grid grid-cols-3 gap-2">
          <StatCard
            icon={<Car className="h-4 w-4" style={{ color: "hsl(var(--hud-success))" }} />}
            value={String(radar.availableCount)}
            label="Nearby"
          />
          <StatCard
            icon={<Zap className="h-4 w-4" style={{ color: "hsl(var(--hud-cyan))" }} />}
            value={formatETA(radar.etaMinutes)}
            label="Fastest"
          />
          <StatCard
            icon={<Clock className="h-4 w-4" style={{ color: "hsl(var(--hud-warning))" }} />}
            value={radar.nearestDriver ? `${radar.nearestDriver.distance.toFixed(1)} km` : "—"}
            label="Closest"
          />
        </div>
      ) : (
        <p className="text-xs text-center py-3" style={{ color: "hsl(var(--hud-text-dim))" }}>
          Enable location to see nearby drivers
        </p>
      )}
    </div>
  );
}

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 py-2 rounded-xl" style={{
      background: "hsl(var(--hud-bg) / 0.5)",
    }}>
      {icon}
      <span className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>{value}</span>
      <span className="text-[9px] font-medium" style={{ color: "hsl(var(--hud-text-dim))" }}>{label}</span>
    </div>
  );
}
