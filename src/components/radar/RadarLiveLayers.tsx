/**
 * RadarLiveLayers — Animated overlay layers for the Radar map.
 * Displays weather, traffic, demand heatmap, zone events, and rider positions.
 */
import { motion, AnimatePresence } from "framer-motion";
import {
  Cloud, CloudRain, CloudLightning, CloudFog, Sun, Thermometer,
  AlertTriangle, Construction, Waves, Car, Users, Zap, TrendingUp,
} from "lucide-react";
import type { GeoLiveContext, RiderRuntimeState } from "@/lib/mobility/live-context-engine";
import type { ZoneEvent } from "@/lib/radar/predictive-demand-engine";
import type { DemandPrediction } from "@/lib/radar/predictive-demand-engine";
import type { RadarMode } from "@/hooks/useRadarLiveContext";
import { cn } from "@/lib/utils";

// ── Layer toggle state ──

export interface LayerToggles {
  weather: boolean;
  traffic: boolean;
  demand: boolean;
  riders: boolean;
  events: boolean;
  eta: boolean;
}

export const DEFAULT_LAYERS: LayerToggles = {
  weather: true,
  traffic: true,
  demand: false,
  riders: false,
  events: true,
  eta: false,
};

// ── Weather Icons ──

const WEATHER_ICONS: Record<string, React.ReactNode> = {
  clear: <Sun className="w-4 h-4 text-amber-400" />,
  rain: <CloudRain className="w-4 h-4 text-blue-400" />,
  storm: <CloudLightning className="w-4 h-4 text-purple-400" />,
  fog: <CloudFog className="w-4 h-4 text-muted-foreground" />,
  heat: <Thermometer className="w-4 h-4 text-orange-500" />,
  flood: <Waves className="w-4 h-4 text-blue-600" />,
};

const TRAFFIC_COLORS: Record<string, string> = {
  low: "hsl(var(--success))",
  medium: "hsl(var(--warning) / 0.7)",
  high: "hsl(var(--warning))",
  severe: "hsl(var(--destructive))",
};

const EVENT_ICONS: Record<string, React.ReactNode> = {
  accident: <AlertTriangle className="w-3 h-3" />,
  flood: <Waves className="w-3 h-3" />,
  road_block: <Construction className="w-3 h-3" />,
  storm: <CloudLightning className="w-3 h-3" />,
  construction: <Construction className="w-3 h-3" />,
  event: <Users className="w-3 h-3" />,
};

// ── Layer Toggle Bar ──

interface LayerToggleBarProps {
  layers: LayerToggles;
  onToggle: (layer: keyof LayerToggles) => void;
  mode: RadarMode;
}

const LAYER_DEFS: { key: keyof LayerToggles; label: string; icon: React.ReactNode; modes: RadarMode[] }[] = [
  { key: "weather", label: "Weather", icon: <Cloud className="w-3 h-3" />, modes: ["client", "rider", "merchant", "admin"] },
  { key: "traffic", label: "Traffic", icon: <Car className="w-3 h-3" />, modes: ["client", "rider", "admin"] },
  { key: "demand", label: "Demand", icon: <TrendingUp className="w-3 h-3" />, modes: ["rider", "merchant", "admin"] },
  { key: "riders", label: "Riders", icon: <Users className="w-3 h-3" />, modes: ["merchant", "admin"] },
  { key: "events", label: "Alerts", icon: <AlertTriangle className="w-3 h-3" />, modes: ["client", "rider", "merchant", "admin"] },
  { key: "eta", label: "ETA", icon: <Zap className="w-3 h-3" />, modes: ["client", "admin"] },
];

export function LayerToggleBar({ layers, onToggle, mode }: LayerToggleBarProps) {
  const visibleLayers = LAYER_DEFS.filter(l => l.modes.includes(mode));

  return (
    <motion.div
      className="flex gap-1 overflow-x-auto scrollbar-hide"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {visibleLayers.map(l => (
        <button
          key={l.key}
          onClick={() => onToggle(l.key)}
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap transition-all shrink-0",
            layers[l.key]
              ? "bg-primary/15 text-primary border border-primary/20"
              : "bg-muted/50 text-muted-foreground border border-transparent"
          )}
        >
          {l.icon}
          {l.label}
        </button>
      ))}
    </motion.div>
  );
}

// ── Weather Overlay Chip ──

export function WeatherOverlay({ contexts }: { contexts: GeoLiveContext[] }) {
  if (!contexts.length) return null;
  // Show most impactful weather
  const primary = contexts.reduce((worst, c) =>
    (c.weather_speed_factor ?? 1) < (worst.weather_speed_factor ?? 1) ? c : worst,
    contexts[0],
  );
  const type = primary.weather_type ?? "clear";
  const icon = WEATHER_ICONS[type] ?? WEATHER_ICONS.clear;

  return (
    <motion.div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-md"
      style={{
        background: type === "storm" || type === "flood"
          ? "hsl(var(--destructive) / 0.15)"
          : "hsl(var(--muted) / 0.6)",
        border: `1px solid ${type === "storm" || type === "flood"
          ? "hsl(var(--destructive) / 0.3)"
          : "hsl(var(--border) / 0.3)"}`,
      }}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
    >
      {icon}
      <span className="text-[10px] font-semibold capitalize text-foreground">{type}</span>
      {primary.weather_speed_factor < 0.8 && (
        <span className="text-[9px] text-destructive font-bold">
          {Math.round((1 - primary.weather_speed_factor) * 100)}% slower
        </span>
      )}
    </motion.div>
  );
}

// ── Traffic Status Chip ──

export function TrafficOverlay({ contexts }: { contexts: GeoLiveContext[] }) {
  if (!contexts.length) return null;

  const primary = contexts.reduce((worst, c) =>
    (c.traffic_speed_factor ?? 1) < (worst.traffic_speed_factor ?? 1) ? c : worst,
    contexts[0],
  );
  const level = primary.traffic_level ?? "low";
  const color = TRAFFIC_COLORS[level] ?? TRAFFIC_COLORS.low;

  return (
    <motion.div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-md"
      style={{
        background: `color-mix(in srgb, ${color} 15%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
      }}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
    >
      <Car className="w-3 h-3" style={{ color }} />
      <span className="text-[10px] font-semibold capitalize" style={{ color }}>{level} traffic</span>
      {level === "severe" && (
        <motion.span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: color }}
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
}

// ── Zone Events Alerts ──

export function ZoneEventAlerts({ events }: { events: ZoneEvent[] }) {
  if (!events.length) return null;

  return (
    <div className="space-y-1">
      <AnimatePresence>
        {events.slice(0, 3).map(evt => (
          <motion.div
            key={evt.id}
            className={cn(
              "flex items-center gap-2 px-2.5 py-1.5 rounded-lg backdrop-blur-md",
              evt.severity === "critical" || evt.severity === "high"
                ? "bg-destructive/10 border border-destructive/20"
                : "bg-warning/10 border border-warning/20",
            )}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <div className={cn(
              "p-1 rounded",
              evt.severity === "critical" ? "bg-destructive/20 text-destructive" : "bg-warning/20 text-warning",
            )}>
              {EVENT_ICONS[evt.event_type] ?? <AlertTriangle className="w-3 h-3" />}
            </div>
            <div className="flex-1 min-w-0">
               <p className="text-[10px] font-bold text-foreground break-words leading-snug">
                 {evt.title ?? evt.event_type.replace(/_/g, " ")}
               </p>
              {evt.description && (
                <p className="text-[9px] text-muted-foreground break-words leading-snug">{evt.description}</p>
              )}
            </div>
            {evt.severity === "critical" && (
              <motion.div
                className="w-2 h-2 rounded-full bg-destructive shrink-0"
                animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              />
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ── Demand Prediction Card ──

export function DemandPredictionCard({ prediction }: { prediction: DemandPrediction | null }) {
  if (!prediction) return null;

  const trendColor = prediction.trend === "rising" ? "hsl(var(--destructive))"
    : prediction.trend === "falling" ? "hsl(var(--success))" : "hsl(var(--muted-foreground))";

  return (
    <motion.div
      className="p-2.5 rounded-xl backdrop-blur-md bg-card/80 border border-border/30"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-bold text-foreground flex items-center gap-1">
          <TrendingUp className="w-3 h-3" style={{ color: trendColor }} />
          Demand Forecast
        </span>
        <span className="text-[9px] text-muted-foreground">
          {prediction.prediction_minutes}min ahead
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* Current */}
        <div className="text-center">
          <div className="text-lg font-extrabold text-foreground">{prediction.current_demand}</div>
          <div className="text-[9px] text-muted-foreground">Now</div>
        </div>

        {/* Arrow */}
        <motion.div
          className="text-sm font-bold"
          style={{ color: trendColor }}
          animate={{ x: prediction.trend === "rising" ? [0, 4, 0] : [0, -4, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {prediction.trend === "rising" ? "→↑" : prediction.trend === "falling" ? "→↓" : "→"}
        </motion.div>

        {/* Predicted */}
        <div className="text-center">
          <div className="text-lg font-extrabold" style={{ color: trendColor }}>
            {prediction.predicted_demand}
          </div>
          <div className="text-[9px] text-muted-foreground">Predicted</div>
        </div>

        {/* Confidence */}
        <div className="ml-auto text-center">
          <div className="text-xs font-bold text-muted-foreground">
            {Math.round(prediction.confidence * 100)}%
          </div>
          <div className="text-[9px] text-muted-foreground">conf.</div>
        </div>
      </div>

      {/* Actions */}
      {prediction.recommended_actions.length > 0 && (
        <div className="mt-2 space-y-0.5">
          {prediction.recommended_actions.slice(0, 2).map((a, i) => (
            <div key={i} className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded text-[9px]",
              a.priority === "critical" ? "bg-destructive/10 text-destructive"
                : a.priority === "high" ? "bg-warning/10 text-warning"
                : "bg-muted/50 text-muted-foreground",
            )}>
              <Zap className="w-2.5 h-2.5 shrink-0" />
              <span className="min-w-0 break-words leading-snug">{a.description}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ── Rider Count Chip (for merchant/admin) ──

export function RiderSupplyChip({ riders }: { riders: RiderRuntimeState[] }) {
  const available = riders.filter(r => r.is_available);

  return (
    <motion.div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-md bg-muted/50 border border-border/30"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
    >
      <Users className="w-3 h-3 text-primary" />
      <span className="text-[10px] font-bold text-foreground">{available.length}</span>
      <span className="text-[9px] text-muted-foreground">riders nearby</span>
      <motion.div
        className="w-1.5 h-1.5 rounded-full bg-success shrink-0"
        animate={{ opacity: [1, 0.4, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </motion.div>
  );
}
