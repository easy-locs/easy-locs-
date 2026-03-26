/**
 * HyperRadarPage — Premium fullscreen radar with 4-layer architecture.
 * L1: Map  L2: UI Controls  L3: Interactions  L4: Results
 */
import { useState, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useRadarResults } from "@/hooks/useRadarResults";
import PersonalRadarPanel from "@/components/radar/PersonalRadarPanel";
import ZoneIntelligenceSheet from "@/components/radar/ZoneIntelligenceSheet";
import { useLocationStore } from "@/stores/locationStore";
import {
  detectTimeSlot, generateGuidance,
  type RadarLayer,
} from "@/lib/engines/hyper-radar-engine";
import { computeVibeDensity } from "@/lib/engines/vibe-density-engine";
import { getZoneRhythm } from "@/lib/engines/behavior-pattern-engine";
import UnifiedMap from "@/components/map/UnifiedMap";
import {
  Radio, X, ChevronUp, ChevronDown,
  Utensils, Hotel, Car, Sparkles, Moon, ShoppingBag,
  Activity, Navigation, Search, Minus, Plus, CloudRain, CloudSun,
} from "lucide-react";
import { useLiveWeatherStation } from "@/hooks/useLiveWeatherStation";

/* ── Layer config ── */
const LAYERS: { id: RadarLayer; label: string; icon: React.ReactNode; color: string }[] = [
  { id: "food", label: "Food", icon: <Utensils className="w-3 h-3" />, color: "hsl(15 80% 55%)" },
  { id: "stay", label: "Stay", icon: <Hotel className="w-3 h-3" />, color: "hsl(200 70% 50%)" },
  { id: "services", label: "Services", icon: <Sparkles className="w-3 h-3" />, color: "hsl(270 60% 55%)" },
  { id: "utility", label: "Utility", icon: <ShoppingBag className="w-3 h-3" />, color: "hsl(140 50% 45%)" },
  { id: "mobility", label: "Mobility", icon: <Car className="w-3 h-3" />, color: "hsl(30 80% 50%)" },
  { id: "nightlife", label: "Night", icon: <Moon className="w-3 h-3" />, color: "hsl(280 70% 55%)" },
];

const RADIUS_PRESETS = [0.5, 1, 2, 5, 10, 25];
const MAX_VISIBLE_PINS = 80;

export default function HyperRadarPage() {
  const navigate = useNavigate();
  const location = useLocationStore((s) => s.currentLocation);
  const { entities, loading } = useRadarResults({ surface: "radar" });
  const [activeLayers, setActiveLayers] = useState<RadarLayer[]>(["food", "stay", "services"]);
  const [radius, setRadius] = useState(5);
  const [panelSnap, setPanelSnap] = useState<"closed" | "peek" | "half">("peek");
  const [zoneClick, setZoneClick] = useState<{ lat: number; lng: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const weather = useLiveWeatherStation({ lat: location?.lat, lng: location?.lng });

  /* ── Performance: limit visible pins ── */
  const visibleEntities = useMemo(() => {
    let filtered = entities;
    // Layer filter
    if (activeLayers.length < LAYERS.length) {
      const layerTypes = new Set(activeLayers);
      filtered = filtered.filter(e => {
        const cat = (e.category || e.type || "").toLowerCase();
        if (layerTypes.has("food" as RadarLayer) && ["restaurant", "food", "cafe", "bakery", "fast_food"].some(t => cat.includes(t))) return true;
        if (layerTypes.has("stay" as RadarLayer) && ["hotel", "hostel", "resort", "property"].some(t => cat.includes(t))) return true;
        if (layerTypes.has("services" as RadarLayer) && ["service", "salon", "spa", "healthcare"].some(t => cat.includes(t))) return true;
        if (layerTypes.has("utility" as RadarLayer) && ["shop", "atm", "pharmacy", "bank"].some(t => cat.includes(t))) return true;
        if (layerTypes.has("mobility" as RadarLayer) && ["driver", "taxi", "bus", "mobility"].some(t => cat.includes(t))) return true;
        if (layerTypes.has("nightlife" as RadarLayer) && ["bar", "club", "lounge", "nightclub"].some(t => cat.includes(t))) return true;
        return false;
      });
    }
    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(e => e.name?.toLowerCase().includes(q) || (e.category || "").toLowerCase().includes(q));
    }
    // Limit pins for performance — prioritize by rating
    if (filtered.length > MAX_VISIBLE_PINS) {
      filtered = [...filtered].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, MAX_VISIBLE_PINS);
    }
    return filtered;
  }, [entities, activeLayers, searchQuery]);

  /* ── Zone click handler ── */
  const handleZoneClick = useCallback((lat: number, lng: number) => {
    setZoneClick({ lat, lng });
    setPanelSnap("closed");
  }, []);

  /* ── Context ── */
  const hour = new Date().getHours();
  const rhythm = useMemo(() => getZoneRhythm(hour), [hour]);
  const timeSlot = useMemo(() => detectTimeSlot(), []);

  const vibe = useMemo(() => {
    if (!visibleEntities.length) return null;
    return computeVibeDensity("current", visibleEntities.map(e => ({
      category: e.category || "service",
      rating: e.rating,
      reviewsCount: (e as any).reviewsCount,
    })), hour);
  }, [visibleEntities, hour]);

  const guidance = useMemo(() => {
    if (!location) return [];
    return generateGuidance(timeSlot, location.lat, location.lng, visibleEntities.slice(0, 20).map(e => ({
      name: e.name, category: e.category || "service", distanceKm: e.distance ?? 99, id: e.id,
    }))).slice(0, 5);
  }, [timeSlot, location, visibleEntities]);

  const toggleLayer = (id: RadarLayer) => {
    setActiveLayers(prev => prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]);
  };

  const cycleRadius = (dir: 1 | -1) => {
    const idx = RADIUS_PRESETS.indexOf(radius);
    const next = idx === -1 ? 2 : Math.max(0, Math.min(RADIUS_PRESETS.length - 1, idx + dir));
    setRadius(RADIUS_PRESETS[next]);
  };

  const cyclePanelSnap = () => {
    setPanelSnap(prev => prev === "closed" ? "peek" : prev === "peek" ? "half" : "closed");
  };

  return (
    <div className="h-[100dvh] w-full relative overflow-hidden bg-background">

      {/* ═══════════════════════════════════════════════
          LAYER 1: MAP (base, z-0)
          ═══════════════════════════════════════════════ */}
      <div className="absolute inset-0 z-0">
        <UnifiedMap
          entities={visibleEntities}
          showUserLocation
          userLat={location?.lat}
          userLng={location?.lng}
          showHeatmap={visibleEntities.length > 30}
          heatmapPoints={visibleEntities.map(e => ({ lat: e.lat, lng: e.lng, intensity: 0.5 }))}
          radiusKm={radius}
          onZoneClick={handleZoneClick}
        />
      </div>

      {/* ═══════════════════════════════════════════════
          LAYER 2: UI FLOATING CONTROLS (z-20)
          ═══════════════════════════════════════════════ */}

      {/* Top Bar: Back + Title + LIVE */}
      <div
        className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-3 pt-[env(safe-area-inset-top,8px)] pb-2"
        style={{ background: "linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--background)/0.85) 60%, transparent 100%)" }}
      >
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-card/90 border border-border/15 flex items-center justify-center active:scale-95 transition-transform">
          <X className="w-4 h-4 text-foreground" />
        </button>

        <div className="min-w-0 flex flex-col items-center gap-1">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "hsl(var(--accent)/0.12)" }}>
            <Radio className="w-3 h-3" style={{ color: "hsl(var(--accent))" }} />
            </div>
            <span className="text-xs font-bold text-foreground">Radar</span>
          </div>
          <div className="inline-flex max-w-[180px] min-w-0 items-center gap-1.5 rounded-full border border-border/15 bg-card/80 px-2.5 py-1 backdrop-blur-md">
            {weather.isRaining ? <CloudRain className="h-3 w-3 shrink-0 text-primary" /> : <CloudSun className="h-3 w-3 shrink-0 text-primary" />}
            <span className="truncate text-[10px] font-medium text-foreground">{weather.label}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: "hsl(var(--success)/0.1)", border: "1px solid hsl(var(--success)/0.2)" }}>
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "hsl(var(--success))" }} />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: "hsl(var(--success))" }} />
          </span>
          <span className="text-[9px] font-bold" style={{ color: "hsl(var(--success))" }}>LIVE</span>
        </div>
      </div>

      {/* Search Bar */}
      <motion.div
        className="absolute left-3 right-3 top-[74px] z-20"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search places..."
            className="h-11 w-full min-w-0 rounded-2xl border border-border/15 bg-card/95 pl-10 pr-4 text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-accent/30 transition-colors"
            style={{ backdropFilter: "blur(12px)" }}
          />
        </div>
      </motion.div>

      {/* Radius Control — right side */}
      <motion.div
        className="absolute right-3 top-[130px] z-20 flex flex-col items-center gap-1 rounded-xl border border-border/15 bg-card/90 px-2 py-2"
        initial={{ opacity: 0, x: 15 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.25 }}
      >
        <button onClick={() => cycleRadius(1)} className="w-7 h-7 rounded-lg flex items-center justify-center active:scale-90 transition-transform bg-accent/10">
          <Plus className="w-3 h-3" style={{ color: "hsl(var(--accent))" }} />
        </button>
        <div className="text-center">
          <p className="text-[10px] font-bold text-foreground">{radius >= 1 ? `${radius}` : `${radius * 1000}`}</p>
          <p className="text-[7px] text-muted-foreground">{radius >= 1 ? "km" : "m"}</p>
        </div>
        <button onClick={() => cycleRadius(-1)} className="w-7 h-7 rounded-lg flex items-center justify-center active:scale-90 transition-transform bg-muted/15">
          <Minus className="w-3 h-3 text-muted-foreground" />
        </button>
      </motion.div>

      {/* Vibe Badge — left side */}
      {vibe && (
        <motion.div
          className="absolute left-3 top-[130px] z-20 rounded-xl border border-border/15 bg-card/90 px-2.5 py-1.5"
          initial={{ opacity: 0, x: -15 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-1.5">
            <Activity className="w-3 h-3" style={{ color: "hsl(var(--accent))" }} />
            <div>
              <p className="text-[9px] font-bold text-foreground capitalize">{vibe.vibe}</p>
              <p className="text-[8px] text-muted-foreground">{vibe.crowdDensity}% active</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* ═══════════════════════════════════════════════
          LAYER 3: QUICK FILTERS (z-20, above map)
          ═══════════════════════════════════════════════ */}
      <motion.div
        className="absolute z-20 left-0 right-0 px-3"
        style={{ bottom: panelSnap === "half" ? "50%" : panelSnap === "peek" ? "140px" : "16px" }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
          {LAYERS.map(layer => {
            const active = activeLayers.includes(layer.id);
            return (
              <button
                key={layer.id}
                onClick={() => toggleLayer(layer.id)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-semibold whitespace-nowrap border transition-all shrink-0 active:scale-95"
                style={{
                  background: active ? `${layer.color}18` : "hsl(var(--card)/0.85)",
                  borderColor: active ? `${layer.color}35` : "hsl(var(--border)/0.15)",
                  color: active ? layer.color : "hsl(var(--muted-foreground))",
                  backdropFilter: "blur(8px)",
                }}
              >
                {layer.icon}
                {layer.label}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════
          LAYER 4: RESULT PANEL — Bottom Sheet (z-30)
          ═══════════════════════════════════════════════ */}
      <AnimatePresence>
        {!zoneClick && (
          <motion.div
            className="absolute bottom-0 left-0 right-0 z-30 rounded-t-2xl border-t border-border/15"
            style={{ background: "hsl(var(--card)/0.97)", backdropFilter: "blur(16px)" }}
            initial={{ y: 200 }}
            animate={{
              y: 0,
              height: panelSnap === "closed" ? 32 : panelSnap === "peek" ? 160 : "50dvh",
            }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
          >
            {/* Drag handle */}
            <button onClick={cyclePanelSnap} className="w-full flex items-center justify-center py-1.5 active:bg-muted/10">
              <div className="w-9 h-1 rounded-full bg-muted-foreground/25" />
            </button>

            {panelSnap !== "closed" && (
              <div className="px-3 pb-4 overflow-y-auto" style={{ maxHeight: panelSnap === "peek" ? 130 : "calc(50dvh - 32px)" }}>
                {/* Stats bar */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-muted-foreground">
                    {visibleEntities.length} places • {radius >= 1 ? `${radius}km` : `${radius * 1000}m`}
                  </span>
                  <span className="text-[9px] font-bold capitalize" style={{ color: "hsl(var(--accent))" }}>
                    {vibe?.vibe || rhythm.suggestedActions[0] || "scanning"}
                  </span>
                </div>

                {/* Smart Guidance */}
                {guidance.length > 0 && (
                  <div className="mb-2">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">For You Now</p>
                    <div className="flex gap-2 overflow-x-auto scrollbar-none">
                      {guidance.map(g => (
                        <div key={g.id} className="min-w-[130px] px-3 py-2 rounded-xl border border-border/10 shrink-0 bg-background/50">
                          <p className="text-[11px] font-bold text-foreground truncate">{g.title}</p>
                          <p className="text-[9px] text-muted-foreground truncate">{g.subtitle}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Personal Radar — only in half mode */}
                {panelSnap === "half" && (
                  <PersonalRadarPanel entities={visibleEntities} open />
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════
          ZONE INTELLIGENCE SHEET (z-40, on zone click)
          ═══════════════════════════════════════════════ */}
      <AnimatePresence>
        {zoneClick && (
          <ZoneIntelligenceSheet
            entities={entities}
            zoneLat={zoneClick.lat}
            zoneLng={zoneClick.lng}
            radiusKm={radius}
            onClose={() => { setZoneClick(null); setPanelSnap("peek"); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
