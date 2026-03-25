/**
 * HyperRadarPage — Full-screen immersive radar with heatmap, layers, smart guidance, vibe density.
 */
import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useRadarResults } from "@/hooks/useRadarResults";
import PersonalRadarPanel from "@/components/radar/PersonalRadarPanel";
import ZoneIntelligenceSheet from "@/components/radar/ZoneIntelligenceSheet";
import { useLocationStore } from "@/stores/locationStore";
import {
  detectTimeSlot, getRelevantLayers, generateGuidance, classifyVibe,
  type RadarLayer, type SmartGuidance,
} from "@/lib/engines/hyper-radar-engine";
import { computeVibeDensity } from "@/lib/engines/vibe-density-engine";
import { getZoneRhythm } from "@/lib/engines/behavior-pattern-engine";
import { detectTransitionContext, getTransitionSuggestions } from "@/lib/engines/travel-transition-engine";
import UnifiedMap from "@/components/map/UnifiedMap";
import {
  Radio, Layers, Navigation, Flame, MapPin, Coffee, Moon,
  Utensils, Hotel, Car, Sparkles, X, ChevronUp, ChevronDown,
  Zap, Eye, Activity, ShoppingBag, Heart,
} from "lucide-react";

const LAYER_CONFIG: { id: RadarLayer; label: string; icon: React.ReactNode; color: string }[] = [
  { id: "food", label: "Food", icon: <Utensils className="w-3.5 h-3.5" />, color: "hsl(var(--accent))" },
  { id: "stay", label: "Stay", icon: <Hotel className="w-3.5 h-3.5" />, color: "hsl(200, 70%, 50%)" },
  { id: "services", label: "Services", icon: <Sparkles className="w-3.5 h-3.5" />, color: "hsl(270, 60%, 55%)" },
  { id: "utility", label: "Utility", icon: <ShoppingBag className="w-3.5 h-3.5" />, color: "hsl(140, 50%, 45%)" },
  { id: "mobility", label: "Mobility", icon: <Car className="w-3.5 h-3.5" />, color: "hsl(30, 80%, 50%)" },
  { id: "nightlife", label: "Nightlife", icon: <Moon className="w-3.5 h-3.5" />, color: "hsl(280, 70%, 55%)" },
];

export default function HyperRadarPage() {
  const navigate = useNavigate();
  const location = useLocationStore((s) => s.currentLocation);
  const { entities, loading } = useRadarResults({ surface: "radar" });
  const [activeLayers, setActiveLayers] = useState<RadarLayer[]>(["food", "stay", "services"]);
  const [radius, setRadius] = useState(5);
  const [panelOpen, setPanelOpen] = useState(true);
  const [zoneClick, setZoneClick] = useState<{ lat: number; lng: number } | null>(null);

  const handleZoneClick = useCallback((lat: number, lng: number) => {
    setZoneClick({ lat, lng });
    setPanelOpen(false); // hide default panel when zone sheet opens
  }, []);

  const timeSlot = useMemo(() => detectTimeSlot(), []);
  const hour = new Date().getHours();

  const vibe = useMemo(() => {
    if (!entities.length) return null;
    return computeVibeDensity("current", entities.map(e => ({
      category: e.category || "service",
      rating: e.rating,
      reviewsCount: (e as any).reviewsCount,
    })), hour);
  }, [entities, hour]);

  const rhythm = useMemo(() => getZoneRhythm(hour), [hour]);

  const guidance = useMemo(() => {
    if (!location) return [];
    return generateGuidance(timeSlot, location.lat, location.lng, entities.map(e => ({
      name: e.name,
      category: e.category || "service",
      distanceKm: e.distance ?? 99,
      id: e.id,
    })));
  }, [timeSlot, location, entities]);

  const context = useMemo(() => {
    const cats = entities.map(e => e.category || "");
    return detectTransitionContext(cats);
  }, [entities]);

  const transitions = useMemo(() => getTransitionSuggestions(context), [context]);

  const toggleLayer = (id: RadarLayer) => {
    setActiveLayers(prev =>
      prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]
    );
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-background relative overflow-hidden">
      {/* Top HUD Bar */}
      <motion.div
        className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-3 py-2"
        style={{ background: "linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--background) / 0.8) 70%, transparent 100%)" }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-xl bg-card/80 flex items-center justify-center border border-border/20">
          <X className="w-4 h-4 text-foreground" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "hsl(var(--accent) / 0.15)" }}>
            <Radio className="w-3.5 h-3.5" style={{ color: "hsl(var(--accent))" }} />
          </div>
          <div>
            <h1 className="text-xs font-bold text-foreground">Hyper Radar</h1>
            <p className="text-[9px] text-muted-foreground">{rhythm.suggestedActions[0]}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: "hsl(var(--success) / 0.1)", border: "1px solid hsl(var(--success) / 0.2)" }}>
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "hsl(var(--success))" }} />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: "hsl(var(--success))" }} />
          </span>
          <span className="text-[9px] font-bold" style={{ color: "hsl(var(--success))" }}>LIVE</span>
        </div>
      </motion.div>

      {/* Map (full screen) */}
      <div className="flex-1 relative">
        <UnifiedMap
          entities={entities}
          showUserLocation
          showHeatmap
          heatmapPoints={entities.map(e => ({ lat: e.lat, lng: e.lng, intensity: 0.5 }))}
          radiusKm={radius}
          onZoneClick={handleZoneClick}
        />

        {/* Vibe Badge */}
        {vibe && (
          <motion.div
            className="absolute top-14 left-3 z-20 px-3 py-1.5 rounded-xl border border-border/20"
            style={{ background: "hsl(var(--card) / 0.9)" }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5" style={{ color: "hsl(var(--accent))" }} />
              <div>
                <p className="text-[10px] font-bold text-foreground capitalize">{vibe.vibe} zone</p>
                <p className="text-[9px] text-muted-foreground">{vibe.tags[0] || `${vibe.crowdDensity}% density`}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Radius Slider */}
        <motion.div
          className="absolute top-14 right-3 z-20 px-3 py-2 rounded-xl border border-border/20"
          style={{ background: "hsl(var(--card) / 0.9)" }}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <p className="text-[9px] text-muted-foreground mb-1">Radius</p>
          <input
            type="range"
            min={1}
            max={25}
            value={radius}
            onChange={e => setRadius(Number(e.target.value))}
            className="w-20 h-1 accent-[hsl(var(--accent))]"
          />
          <p className="text-[10px] font-bold text-foreground text-center">{radius} km</p>
        </motion.div>
      </div>

      {/* Layer Selector Bar */}
      <motion.div
        className="absolute bottom-[140px] left-0 right-0 z-20 px-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {LAYER_CONFIG.map(layer => {
            const isActive = activeLayers.includes(layer.id);
            return (
              <button
                key={layer.id}
                onClick={() => toggleLayer(layer.id)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-semibold whitespace-nowrap border transition-all shrink-0"
                style={{
                  background: isActive ? `${layer.color}20` : "hsl(var(--card) / 0.8)",
                  borderColor: isActive ? `${layer.color}40` : "hsl(var(--border) / 0.2)",
                  color: isActive ? layer.color : "hsl(var(--muted-foreground))",
                }}
              >
                {layer.icon}
                {layer.label}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Bottom Panel — Smart Guidance */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 z-20 rounded-t-2xl border-t border-border/20"
        style={{ background: "hsl(var(--card) / 0.95)" }}
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <button
          onClick={() => setPanelOpen(!panelOpen)}
          className="w-full flex items-center justify-center py-1.5"
        >
          <div className="w-8 h-1 rounded-full bg-muted-foreground/30" />
        </button>

        <AnimatePresence>
          {panelOpen && (
            <motion.div
              className="px-3 pb-4 space-y-2 max-h-[200px] overflow-y-auto"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              {/* Smart Guidance Cards */}
              {guidance.length > 0 && (
                <div>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Smart Guidance</p>
                  <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    {guidance.map(g => (
                      <div
                        key={g.id}
                        className="min-w-[140px] px-3 py-2 rounded-xl border border-border/20 shrink-0"
                        style={{ background: "hsl(var(--background) / 0.6)" }}
                      >
                        <p className="text-xs font-bold text-foreground">{g.title}</p>
                        <p className="text-[9px] text-muted-foreground mt-0.5">{g.subtitle}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Personal Radar */}
              <PersonalRadarPanel entities={entities} open={panelOpen} />

              {/* Transition Suggestions */}
              {transitions.length > 0 && context !== "unknown" && (
                <div>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Near {context}
                  </p>
                  <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    {transitions.slice(0, 4).map(t => (
                      <div
                        key={t.id}
                        className="min-w-[120px] px-3 py-2 rounded-xl border border-border/20 shrink-0"
                        style={{ background: "hsl(var(--background) / 0.6)" }}
                      >
                        <p className="text-sm">{t.icon}</p>
                        <p className="text-[10px] font-bold text-foreground mt-0.5">{t.title}</p>
                        <p className="text-[9px] text-muted-foreground">{t.subtitle}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Entity Count */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[9px] text-muted-foreground">
                  {entities.length} places • {radius}km radius
                </span>
                <span className="text-[9px] font-bold" style={{ color: "hsl(var(--accent))" }}>
                  {vibe?.vibe || "scanning"}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
