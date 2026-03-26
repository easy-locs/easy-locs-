/**
 * RadarZoneOverlayCard — Displays live zone intelligence for the selected place.
 * Shows traffic, weather, demand, rider supply, merchant count, and category ETAs.
 */
import { Cloud, CloudRain, Sun, Wind, Car, Users, Store, Clock, Zap, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ZoneOverlay } from "@/lib/radar/radar-place-search-adapter";
import { motion } from "framer-motion";

const WEATHER_ICONS: Record<string, React.ReactNode> = {
  clear: <Sun className="w-3.5 h-3.5 text-amber-400" />,
  cloudy: <Cloud className="w-3.5 h-3.5 text-muted-foreground" />,
  rain: <CloudRain className="w-3.5 h-3.5 text-blue-400" />,
  storm: <CloudRain className="w-3.5 h-3.5 text-red-400" />,
  wind: <Wind className="w-3.5 h-3.5 text-cyan-400" />,
};

const TRAFFIC_COLORS: Record<string, string> = {
  low: "text-emerald-400",
  moderate: "text-amber-400",
  heavy: "text-orange-400",
  severe: "text-red-400",
};

interface Props {
  overlay: ZoneOverlay;
  label?: string;
  className?: string;
}

export default function RadarZoneOverlayCard({ overlay, label, className }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-xl border border-border/20 bg-card/90 backdrop-blur-md p-3 space-y-2",
        className
      )}
    >
      {/* Zone label */}
      {label && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-foreground">{label}</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
            {overlay.zone_key}
          </span>
        </div>
      )}

      {/* Live stats grid */}
      <div className="grid grid-cols-3 gap-2">
        {/* Traffic */}
        <div className="flex items-center gap-1.5">
          <Car className={cn("w-3.5 h-3.5", TRAFFIC_COLORS[overlay.traffic_level ?? "low"] ?? "text-muted-foreground")} />
          <div>
            <p className="text-[10px] font-semibold text-foreground capitalize">{overlay.traffic_level ?? "—"}</p>
            <p className="text-[8px] text-muted-foreground">Traffic</p>
          </div>
        </div>

        {/* Weather */}
        <div className="flex items-center gap-1.5">
          {WEATHER_ICONS[overlay.weather_type ?? "clear"] ?? <Sun className="w-3.5 h-3.5 text-muted-foreground" />}
          <div>
            <p className="text-[10px] font-semibold text-foreground capitalize">{overlay.weather_type ?? "—"}</p>
            <p className="text-[8px] text-muted-foreground">Weather</p>
          </div>
        </div>

        {/* Demand */}
        <div className="flex items-center gap-1.5">
          <Zap className={cn("w-3.5 h-3.5", (overlay.demand_level ?? 0) > 7 ? "text-orange-400" : (overlay.demand_level ?? 0) > 4 ? "text-amber-400" : "text-emerald-400")} />
          <div>
            <p className="text-[10px] font-semibold text-foreground">{overlay.demand_level?.toFixed(0) ?? "0"}/10</p>
            <p className="text-[8px] text-muted-foreground">Demand</p>
          </div>
        </div>

        {/* Riders */}
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-cyan-400" />
          <div>
            <p className="text-[10px] font-semibold text-foreground">{overlay.rider_supply?.toFixed(0) ?? "0"}</p>
            <p className="text-[8px] text-muted-foreground">Riders</p>
          </div>
        </div>

        {/* Merchants */}
        <div className="flex items-center gap-1.5">
          <Store className="w-3.5 h-3.5 text-violet-400" />
          <div>
            <p className="text-[10px] font-semibold text-foreground">{overlay.merchant_count ?? 0}</p>
            <p className="text-[8px] text-muted-foreground">Merchants</p>
          </div>
        </div>

        {/* Flood risk */}
        {overlay.flood_risk_level && overlay.flood_risk_level !== "none" && (
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            <div>
              <p className="text-[10px] font-semibold text-red-400 capitalize">{overlay.flood_risk_level}</p>
              <p className="text-[8px] text-muted-foreground">Flood</p>
            </div>
          </div>
        )}
      </div>

      {/* Category ETAs */}
      {(overlay.avg_food_eta_minutes || overlay.avg_taxi_eta_minutes || overlay.avg_parcel_eta_minutes) && (
        <div className="flex gap-3 pt-1 border-t border-border/10">
          {overlay.avg_food_eta_minutes != null && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-orange-400" />
              <span className="text-[10px] text-foreground font-semibold">{Math.round(overlay.avg_food_eta_minutes)}min</span>
              <span className="text-[8px] text-muted-foreground">Food</span>
            </div>
          )}
          {overlay.avg_taxi_eta_minutes != null && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-yellow-400" />
              <span className="text-[10px] text-foreground font-semibold">{Math.round(overlay.avg_taxi_eta_minutes)}min</span>
              <span className="text-[8px] text-muted-foreground">Taxi</span>
            </div>
          )}
          {overlay.avg_parcel_eta_minutes != null && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-cyan-400" />
              <span className="text-[10px] text-foreground font-semibold">{Math.round(overlay.avg_parcel_eta_minutes)}min</span>
              <span className="text-[8px] text-muted-foreground">Parcel</span>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
