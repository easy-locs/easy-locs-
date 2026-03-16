/**
 * DeliveryHeatmapPanel — Visual demand heatmap for drivers
 * PASS74-D: Shows hot zones, demand intensity, and earnings potential
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, TrendingUp, Clock, DollarSign, RefreshCw, MapPin, Zap } from "lucide-react";
import { useDeliveryHeatmap, type DemandZone } from "@/hooks/useDeliveryHeatmap";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function intensityColor(intensity: number): string {
  if (intensity >= 0.8) return "hsl(0, 85%, 55%)";      // hot red
  if (intensity >= 0.6) return "hsl(25, 90%, 55%)";     // orange
  if (intensity >= 0.4) return "hsl(45, 90%, 50%)";     // yellow
  if (intensity >= 0.2) return "hsl(120, 50%, 55%)";    // green
  return "hsl(210, 30%, 60%)";                            // cool blue
}

function intensityLabel(intensity: number): string {
  if (intensity >= 0.8) return "🔥 Très forte";
  if (intensity >= 0.6) return "🟠 Forte";
  if (intensity >= 0.4) return "🟡 Moyenne";
  if (intensity >= 0.2) return "🟢 Faible";
  return "🔵 Calme";
}

function ZoneCard({ zone, index }: { zone: DemandZone; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm"
    >
      {/* Intensity dot */}
      <div className="relative flex-shrink-0">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold"
          style={{ backgroundColor: intensityColor(zone.intensity) }}
        >
          {zone.count}
        </div>
        {zone.intensity >= 0.6 && (
          <motion.div
            className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full"
            style={{ backgroundColor: intensityColor(zone.intensity) }}
            animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground truncate">
            {zone.lat.toFixed(3)}°, {zone.lng.toFixed(3)}°
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-muted-foreground">{intensityLabel(zone.intensity)}</span>
          {zone.recentJobs > 0 && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
              <Zap className="w-2.5 h-2.5 mr-0.5" />{zone.recentJobs} récent
            </Badge>
          )}
        </div>
      </div>

      <div className="text-right flex-shrink-0">
        <div className="text-sm font-semibold text-foreground">
          {zone.avgFee > 0 ? `${zone.avgFee}€` : "--"}
        </div>
        <div className="text-[10px] text-muted-foreground">moy./mission</div>
      </div>
    </motion.div>
  );
}

export default function DeliveryHeatmapPanel({ orgId }: { orgId?: string }) {
  const { zones, stats, loading, refresh } = useDeliveryHeatmap(orgId);
  const [showAll, setShowAll] = useState(false);

  const displayedZones = showAll ? zones : zones.slice(0, 6);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-500" />
          <h3 className="text-base font-semibold text-foreground">Zones de demande</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={refresh}
          disabled={loading}
          className="h-8 w-8 p-0"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { icon: Flame, label: "En attente", value: stats.totalPending, color: "text-orange-500" },
          { icon: TrendingUp, label: "Zones chaudes", value: stats.hotZones, color: "text-red-500" },
          { icon: DollarSign, label: "Frais moy.", value: `${stats.avgDeliveryFee}€`, color: "text-emerald-500" },
          { icon: Clock, label: "Pic", value: stats.peakHour, color: "text-blue-500" },
        ].map((s, i) => (
          <div key={i} className="flex flex-col items-center p-2 rounded-lg bg-muted/50 border border-border/30">
            <s.icon className={`w-4 h-4 ${s.color} mb-1`} />
            <span className="text-sm font-bold text-foreground">{s.value}</span>
            <span className="text-[9px] text-muted-foreground text-center">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Intensity legend */}
      <div className="flex items-center gap-1 justify-center">
        <span className="text-[10px] text-muted-foreground mr-1">Intensité:</span>
        {[0.1, 0.3, 0.5, 0.7, 0.9].map(v => (
          <div key={v} className="w-5 h-2 rounded-sm" style={{ backgroundColor: intensityColor(v) }} />
        ))}
        <span className="text-[10px] text-muted-foreground ml-1">Calme → 🔥</span>
      </div>

      {/* Zone list */}
      <AnimatePresence>
        {zones.length === 0 && !loading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8 text-muted-foreground text-sm"
          >
            Aucune demande active pour le moment
          </motion.div>
        ) : (
          <div className="space-y-2">
            {displayedZones.map((zone, i) => (
              <ZoneCard key={zone.id} zone={zone} index={i} />
            ))}
          </div>
        )}
      </AnimatePresence>

      {zones.length > 6 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAll(!showAll)}
          className="w-full text-xs"
        >
          {showAll ? "Voir moins" : `Voir toutes les ${zones.length} zones`}
        </Button>
      )}
    </div>
  );
}
