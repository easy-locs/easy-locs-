/**
 * HyperRadarPage — Premium fullscreen radar with 4-layer architecture.
 * L1: Map  L2: UI Controls  L3: Interactions  L4: Results
 * V2: Enhanced discovery stats, smarter guidance, richer UX, fullscreen polish.
 */
import { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useRadarResults } from "@/hooks/useRadarResults";
import PersonalRadarPanel from "@/components/radar/PersonalRadarPanel";
import ZoneIntelligenceSheet from "@/components/radar/ZoneIntelligenceSheet";
import { useLocationStore } from "@/stores/locationStore";
import {
  detectTimeSlot, generateGuidance, matchesLayer, computeRadarStats,
  type RadarLayer,
} from "@/lib/engines/hyper-radar-engine";
import { computeVibeDensity } from "@/lib/engines/vibe-density-engine";
import { getZoneRhythm } from "@/lib/engines/behavior-pattern-engine";
import UnifiedMap from "@/components/map/UnifiedMap";
import RadarStoryRail from "@/components/radar/RadarStoryRail";
import RadarEntitySheet from "@/components/radar/RadarEntitySheet";
import {
  Radio, X, ChevronUp, ChevronDown,
  Utensils, Hotel, Car, Sparkles, Moon, ShoppingBag,
  Activity, Navigation, Search, Minus, Plus, CloudRain, CloudSun,
  MapPin, TrendingUp, Star, Zap, Eye, Heart, Store,
  Droplets, Wind,
} from "lucide-react";
import { useLiveWeatherStation } from "@/hooks/useLiveWeatherStation";
import { useWeatherDisplayStore } from "@/stores/weatherDisplayStore";
import { useI18n } from "@/lib/i18n";
import { Z } from "@/lib/ui/z-index";

const LAYER_DEFS: { id: RadarLayer; labelKey: string; icon: React.ReactNode; color: string; emoji: string }[] = [
  { id: "food", labelKey: "radar.layer_food", icon: <Utensils className="w-3 h-3" />, color: "hsl(15 80% 55%)", emoji: "🍽️" },
  { id: "stay", labelKey: "radar.layer_stay", icon: <Hotel className="w-3 h-3" />, color: "hsl(200 70% 50%)", emoji: "🏨" },
  { id: "services", labelKey: "radar.layer_services", icon: <Sparkles className="w-3 h-3" />, color: "hsl(270 60% 55%)", emoji: "✨" },
  { id: "utility", labelKey: "radar.layer_utility", icon: <ShoppingBag className="w-3 h-3" />, color: "hsl(140 50% 45%)", emoji: "🛒" },
  { id: "mobility", labelKey: "radar.layer_mobility", icon: <Car className="w-3 h-3" />, color: "hsl(30 80% 50%)", emoji: "🚗" },
  { id: "nightlife", labelKey: "radar.layer_night", icon: <Moon className="w-3 h-3" />, color: "hsl(280 70% 55%)", emoji: "🌙" },
  { id: "healthcare", labelKey: "radar.layer_healthcare", icon: <Heart className="w-3 h-3" />, color: "hsl(0 65% 50%)", emoji: "🏥" },
  { id: "shops", labelKey: "radar.layer_shops", icon: <Store className="w-3 h-3" />, color: "hsl(38 65% 56%)", emoji: "🛍️" },
];

const RADIUS_PRESETS = [0.5, 1, 2, 5, 10, 25];
const MAX_VISIBLE_PINS = 80;

const CATEGORY_TO_LAYER: Record<string, RadarLayer> = {
  food: "food", stay: "stay", services: "services",
  utility: "utility", mobility: "mobility", nightlife: "nightlife",
  healthcare: "healthcare", shops: "shops",
};

export default function HyperRadarPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocationStore((s) => s.currentLocation);
  const { entities, loading } = useRadarResults({ surface: "radar" });
  const urlCategory = searchParams.get("category");
  const urlSubcategory = searchParams.get("subcategory");
  const [activeLayers, setActiveLayers] = useState<RadarLayer[]>(() => {
    if (urlCategory && CATEGORY_TO_LAYER[urlCategory]) {
      return [CATEGORY_TO_LAYER[urlCategory]];
    }
    return ["food", "stay", "services", "utility"];
  });
  const [radius, setRadius] = useState(5);
  const [panelSnap, setPanelSnap] = useState<"closed" | "peek" | "half">("peek");
  const [zoneClick, setZoneClick] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const radarOverlay = useWeatherDisplayStore(s => s.radarOverlay);
  const setRadarOverlay = useWeatherDisplayStore(s => s.setRadarOverlay);
  const weather = useLiveWeatherStation({ lat: location?.lat, lng: location?.lng });

  useEffect(() => {
    if (urlCategory && CATEGORY_TO_LAYER[urlCategory]) {
      setActiveLayers([CATEGORY_TO_LAYER[urlCategory]]);
      setPanelSnap("half");
    }
  }, [urlCategory]);

  const visibleEntities = useMemo(() => {
    let filtered = entities;
    if (activeLayers.length < LAYER_DEFS.length) {
      filtered = filtered.filter(e => {
        const cat = (e.category || e.type || "").toLowerCase();
        return activeLayers.some(layer => matchesLayer(cat, layer));
      });
    }
    if (urlSubcategory) {
      const sub = urlSubcategory.toLowerCase();
      filtered = filtered.filter(e => {
        const cat = (e.category || e.type || e.subcategory || "").toLowerCase();
        return cat.includes(sub);
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(e => e.name?.toLowerCase().includes(q) || (e.category || "").toLowerCase().includes(q));
    }
    if (filtered.length > MAX_VISIBLE_PINS) {
      filtered = [...filtered].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, MAX_VISIBLE_PINS);
    }
    return filtered;
  }, [entities, activeLayers, searchQuery, urlSubcategory]);

  const handleZoneClick = useCallback((lat: number, lng: number) => {
    setZoneClick({ lat, lng });
    setSelectedEntity(null);
    setPanelSnap("closed");
  }, []);

  const handleSelectEntity = useCallback((entity: any) => {
    setSelectedEntity(entity);
    setZoneClick(null);
    setPanelSnap("closed");
  }, []);

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
    return generateGuidance(timeSlot, location.lat, location.lng, visibleEntities.slice(0, 25).map(e => ({
      name: e.name, category: e.category || "service", distanceKm: e.distance ?? 99, id: e.id, rating: e.rating,
    }))).slice(0, 6);
  }, [timeSlot, location, visibleEntities]);

  const stats = useMemo(() => computeRadarStats(entities.length, visibleEntities), [entities.length, visibleEntities]);

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

  const distLabel = (r: number) => r >= 1 ? `${r}${t("radar.km")}` : `${r * 1000}${t("radar.m")}`;

  return (
    <div className="h-[100dvh] w-full relative overflow-hidden bg-background">

      {/* ═══ LAYER 1: MAP (base) ═══ */}
      <div className="absolute inset-0 z-0">
        <UnifiedMap
          entities={visibleEntities}
          showUserLocation
          userLat={location?.lat}
          userLng={location?.lng}
          showHeatmap={visibleEntities.length > 30}
          heatmapPoints={visibleEntities.map(e => ({ lat: e.lat, lng: e.lng, intensity: 0.5 }))}
          radiusKm={radius}
          showWeatherLayer={radarOverlay !== "off"}
          selectedId={selectedEntity?.id}
          onSelectEntity={handleSelectEntity}
          onZoneClick={handleZoneClick}
          hideWeatherBadge
        />
      </div>

      {/* ═══ LAYER 2: UI FLOATING CONTROLS ═══ */}

      {/* Top Bar */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-3 pt-[env(safe-area-inset-top,8px)] pb-2"
        style={{ zIndex: Z.overlay, background: "linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--background)/0.85) 60%, transparent 100%)" }}
      >
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-card/90 border border-border/15 flex items-center justify-center active:scale-95 transition-transform backdrop-blur-md">
          <X className="w-4 h-4 text-foreground" />
        </button>

        <div className="min-w-0 flex flex-col items-center gap-1">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "hsl(38 65% 56% / 0.12)" }}>
              <Radio className="w-3 h-3" style={{ color: "hsl(38 65% 56%)" }} />
            </div>
            <span className="text-xs font-bold text-foreground">{t("radar.title")}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: "hsl(var(--success)/0.1)", border: "1px solid hsl(var(--success)/0.2)" }}>
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "hsl(var(--success))" }} />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: "hsl(var(--success))" }} />
          </span>
          <span className="text-[10px] font-bold" style={{ color: "hsl(var(--success))" }}>{t("radar.live")}</span>
        </div>
      </div>

      {/* Search Bar */}
      <motion.div
        className="absolute left-3 right-3 top-[74px]"
        style={{ zIndex: Z.overlay }}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <div className="search-premium-wrap">
          <Search className="search-premium-icon w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t("radar.search_places")}
            className="search-premium-field h-11 border border-border/15 bg-card/95 text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-accent/30 transition-colors"
            style={{ backdropFilter: "blur(12px)" }}
          />
        </div>
      </motion.div>

      {/* Radius Control — right side */}
      <motion.div
        className="absolute right-3 top-[130px] flex flex-col items-center gap-1.5 rounded-2xl border border-border/15 bg-card/90 px-2 py-2.5 backdrop-blur-md"
        style={{ zIndex: Z.overlay }}
        initial={{ opacity: 0, x: 15 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.25 }}
      >
        <button onClick={() => cycleRadius(1)} className="w-8 h-8 rounded-xl flex items-center justify-center active:scale-90 transition-transform" style={{ background: "hsl(38 65% 56% / 0.1)" }}>
          <Plus className="w-3.5 h-3.5" style={{ color: "hsl(38 65% 56%)" }} />
        </button>
        <div className="text-center py-0.5">
          <p className="text-[11px] font-bold text-foreground">{radius >= 1 ? `${radius}` : `${radius * 1000}`}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{radius >= 1 ? t("radar.km") : t("radar.m")}</p>
        </div>
        <button onClick={() => cycleRadius(-1)} className="w-8 h-8 rounded-xl flex items-center justify-center active:scale-90 transition-transform bg-muted/15">
          <Minus className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </motion.div>

      {/* Weather Widget — left side */}
      <motion.div
        className="absolute left-3 top-[130px] flex flex-col gap-1.5"
        style={{ zIndex: Z.overlay }}
        initial={{ opacity: 0, x: -15 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.25 }}
      >
        <div
          className="rounded-2xl border border-border/15 px-3 py-2.5 backdrop-blur-md"
          style={{
            background: weather.isRaining
              ? "linear-gradient(135deg, hsl(220 40% 18% / 0.92), hsl(210 50% 25% / 0.88))"
              : "hsl(var(--card) / 0.9)",
          }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-lg leading-none">{weather.icon}</span>
            <div className="min-w-0">
              {weather.temperatureC != null && (
                <p className="text-base font-bold text-foreground leading-tight">{Math.round(weather.temperatureC)}°C</p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            {weather.humidity != null && (
              <div className="flex items-center gap-0.5">
                <Droplets className="w-2.5 h-2.5" style={{ color: "hsl(200 70% 60%)" }} />
                <span className="text-[10px] text-muted-foreground">{weather.humidity}%</span>
              </div>
            )}
            {weather.windKmh != null && (
              <div className="flex items-center gap-0.5">
                <Wind className="w-2.5 h-2.5" style={{ color: "hsl(38 65% 56%)" }} />
                <span className="text-[10px] text-muted-foreground">{Math.round(weather.windKmh)} km/h</span>
              </div>
            )}
          </div>
          {weather.isRaining && weather.precipitationMm > 0 && (
            <div className="flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-md" style={{ background: "hsl(200 70% 50% / 0.12)" }}>
              <CloudRain className="w-2.5 h-2.5" style={{ color: "hsl(200 70% 60%)" }} />
              <span className="text-[10px] font-medium" style={{ color: "hsl(200 70% 65%)" }}>{weather.precipitationMm.toFixed(1)} mm</span>
            </div>
          )}
        </div>

        {vibe && (
          <div className="rounded-2xl border border-border/15 bg-card/90 px-2.5 py-2 backdrop-blur-md">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">{vibe.vibeEmoji}</span>
              <div>
                <p className="text-[10px] font-bold text-foreground">{vibe.vibeLabel}</p>
                <p className="text-[10px] text-muted-foreground">{vibe.crowdDensity}% {t("radar.active")}</p>
              </div>
            </div>
          </div>
        )}
        <div className="rounded-2xl border border-border/15 bg-card/90 px-2.5 py-1.5 backdrop-blur-md">
          <div className="flex items-center gap-1">
            <MapPin className="w-2.5 h-2.5" style={{ color: "hsl(38 65% 56%)" }} />
            <span className="text-[10px] font-bold text-foreground">{stats.visibleEntities}</span>
          </div>
          {stats.hotspotCount > 0 && (
            <div className="flex items-center gap-1 mt-0.5">
              <Star className="w-2.5 h-2.5 text-yellow-500" />
              <span className="text-[10px] text-muted-foreground">{stats.hotspotCount} top</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* ═══ LAYER 3: QUICK FILTERS ═══ */}
      <motion.div
        className="absolute left-0 right-0 px-3"
        style={{ zIndex: Z.overlay, bottom: panelSnap === "half" ? "50%" : panelSnap === "peek" ? "160px" : "16px" }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
          <button
            onClick={() => setRadarOverlay(radarOverlay === "off" ? "full" : "off")}
            className="flex items-center gap-1 rounded-full border border-border/15 bg-card/85 px-2.5 py-1.5 text-[10px] font-semibold whitespace-nowrap shrink-0 text-foreground backdrop-blur-md active:scale-95 transition-transform"
          >
            <CloudRain className="h-3 w-3 shrink-0" style={{ color: "hsl(38 65% 56%)" }} />
            {radarOverlay !== "off" ? t("radar.radar_on") : t("radar.radar_off")}
          </button>
          {LAYER_DEFS.map(layer => {
            const active = activeLayers.includes(layer.id);
            return (
              <motion.button
                key={layer.id}
                onClick={() => toggleLayer(layer.id)}
                whileTap={{ scale: 0.92 }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-semibold whitespace-nowrap border transition-all shrink-0"
                style={{
                  background: active ? `${layer.color}18` : "hsl(var(--card)/0.85)",
                  borderColor: active ? `${layer.color}35` : "hsl(var(--border)/0.15)",
                  color: active ? layer.color : "hsl(var(--muted-foreground))",
                  backdropFilter: "blur(8px)",
                }}
              >
                {layer.icon}
                {t(layer.labelKey)}
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* ═══ LAYER 4: RESULT PANEL — Bottom Sheet ═══ */}
      <AnimatePresence>
        {!zoneClick && (
          <motion.div
            className="absolute bottom-0 left-0 right-0 rounded-t-2xl border-t border-border/15"
            style={{ zIndex: Z.controls, background: "hsl(var(--card)/0.97)", backdropFilter: "blur(16px)" }}
            initial={{ y: 200 }}
            animate={{
              y: 0,
              height: panelSnap === "closed" ? 36 : panelSnap === "peek" ? 180 : "55dvh",
            }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
          >
            <button onClick={cyclePanelSnap} className="w-full flex flex-col items-center justify-center py-2 active:bg-muted/10">
              <div className="w-9 h-1 rounded-full bg-muted-foreground/25" />
            </button>

            {panelSnap !== "closed" && (
              <div className="px-3 pb-4 overflow-y-auto" style={{ maxHeight: panelSnap === "peek" ? 180 : "calc(55dvh - 36px)" }}>
                <RadarStoryRail />
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">
                      {t("radar.places_radius").replace("{count}", String(visibleEntities.length)).replace("{radius}", distLabel(radius))}
                    </span>
                    {stats.avgRating > 0 && (
                      <span className="flex items-center gap-0.5 text-[10px] text-yellow-500">
                        <Star className="w-2.5 h-2.5" /> {stats.avgRating}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-medium text-muted-foreground">{rhythm.emoji}</span>
                    <span className="text-[10px] font-bold capitalize" style={{ color: "hsl(38 65% 56%)" }}>
                      {vibe?.vibeLabel || rhythm.suggestedActions[0] || t("radar.scanning")}
                    </span>
                  </div>
                </div>

                {/* Smart Guidance */}
                {guidance.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">{t("radar.for_you_now")}</p>
                    <div className="flex gap-2 overflow-x-auto scrollbar-none">
                      {guidance.map(g => (
                        <motion.div
                          key={g.id}
                          whileTap={{ scale: 0.96 }}
                          className="min-w-[140px] px-3 py-2.5 rounded-xl border border-border/10 shrink-0 bg-background/50 cursor-pointer transition-colors"
                          style={{ borderLeft: `3px solid ${g.accentColor || "hsl(38 65% 56%)"}` }}
                        >
                          <p className="text-[11px] font-bold text-foreground truncate">{g.title}</p>
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5">{g.subtitle}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Transition hint */}
                {panelSnap === "peek" && rhythm.transitionHint && (
                  <div className="flex items-center gap-1.5 py-1.5 px-2 rounded-lg border" style={{ background: "hsl(38 65% 56% / 0.05)", borderColor: "hsl(38 65% 56% / 0.1)" }}>
                    <Zap className="w-3 h-3 shrink-0" style={{ color: "hsl(38 65% 56%)" }} />
                    <span className="text-[10px] text-muted-foreground">{rhythm.transitionHint}</span>
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

      {/* ═══ ENTITY DETAIL SHEET ═══ */}
      <AnimatePresence>
        {selectedEntity && (
          <RadarEntitySheet
            entity={selectedEntity}
            onClose={() => { setSelectedEntity(null); setPanelSnap("peek"); }}
          />
        )}
      </AnimatePresence>

      {/* ═══ ZONE INTELLIGENCE SHEET ═══ */}
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
