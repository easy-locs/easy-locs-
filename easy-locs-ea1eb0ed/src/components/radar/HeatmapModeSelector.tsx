import { memo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Star, TrendingUp, X } from "lucide-react";
import type { HeatmapMode } from "@/lib/map/heatmap-engine";

interface Props {
  enabled: boolean;
  mode: HeatmapMode;
  onModeChange: (mode: HeatmapMode) => void;
  onToggle: () => void;
}

const MODES: { id: HeatmapMode; label: string; icon: React.ReactNode; color: string; description: string }[] = [
  {
    id: "density",
    label: "Density",
    icon: <Users className="w-3.5 h-3.5" />,
    color: "hsl(200 70% 55%)",
    description: "Where places cluster",
  },
  {
    id: "rating",
    label: "Rating",
    icon: <Star className="w-3.5 h-3.5" />,
    color: "hsl(45 90% 55%)",
    description: "Best-rated areas",
  },
  {
    id: "trending",
    label: "Trending",
    icon: <TrendingUp className="w-3.5 h-3.5" />,
    color: "hsl(0 75% 55%)",
    description: "Most popular now",
  },
];

const LEGEND_STOPS = [
  { offset: "0%", label: "Low" },
  { offset: "50%", label: "Mid" },
  { offset: "100%", label: "High" },
];

export default memo(function HeatmapModeSelector({ enabled, mode, onModeChange, onToggle }: Props) {
  const activeMode = MODES.find(m => m.id === mode) || MODES[0];

  const handleModeSelect = useCallback((m: HeatmapMode) => {
    onModeChange(m);
    if (!enabled) onToggle();
  }, [onModeChange, enabled, onToggle]);

  return (
    <AnimatePresence>
      {enabled && (
        <motion.div
          className="absolute left-3 rounded-2xl border overflow-hidden"
          style={{
            zIndex: 45,
            bottom: 84,
            background: "hsl(var(--card) / 0.95)",
            borderColor: "hsl(var(--border) / 0.12)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            boxShadow: "0 8px 32px hsl(var(--background) / 0.3)",
          }}
          initial={{ opacity: 0, x: -20, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -20, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 280 }}
        >
          <div className="px-3 pt-2.5 pb-1.5 flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Heatmap
            </span>
            <button
              onClick={onToggle}
              className="w-5 h-5 rounded-full flex items-center justify-center active:scale-90 transition-transform"
              style={{ background: "hsl(var(--muted) / 0.15)" }}
            >
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          </div>

          <div className="px-2 pb-2 flex gap-1">
            {MODES.map(m => {
              const active = mode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => handleModeSelect(m.id)}
                  className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all active:scale-95"
                  style={{
                    background: active ? `color-mix(in srgb, ${m.color} 12%, transparent)` : "transparent",
                    border: active ? `1px solid color-mix(in srgb, ${m.color} 25%, transparent)` : "1px solid transparent",
                  }}
                >
                  <span style={{ color: active ? m.color : "hsl(var(--muted-foreground))" }}>
                    {m.icon}
                  </span>
                  <span
                    className="text-[9px] font-bold"
                    style={{ color: active ? m.color : "hsl(var(--muted-foreground))" }}
                  >
                    {m.label}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="px-3 pb-2.5">
            <div className="flex items-center gap-2">
              <div
                className="flex-1 h-1.5 rounded-full"
                style={{
                  background: "linear-gradient(90deg, hsl(270 85% 55%), hsl(200 95% 55%), hsl(120 85% 50%), hsl(55 95% 52%), hsl(15 95% 52%), hsl(0 100% 50%))",
                }}
              />
            </div>
            <div className="flex justify-between mt-0.5">
              {LEGEND_STOPS.map(s => (
                <span key={s.offset} className="text-[8px] text-muted-foreground/60">{s.label}</span>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
