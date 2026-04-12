import { useState, useMemo, useCallback, useEffect, useDeferredValue, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useRadarResults } from "@/hooks/useRadarResults";
import { useUiEngine } from "@/hooks/useUiEngine";
import type { GeoEntity } from "@/lib/geo/geoEntityAdapter";
import type { RadarStats } from "@/lib/engines/hyper-radar-engine";
import type { VibeDensityResult } from "@/lib/engines/vibe-density-engine";
import type { WeatherStationState } from "@/hooks/useLiveWeatherStation";
import type { RadarResultItem, RadarVertical } from "@/lib/radar/radar-result-item";
import type { RadarFilterValues } from "@/lib/radar/radar-filter-schemas";
import { getDefaultFilterValues } from "@/lib/radar/radar-filter-schemas";
import { mapPointsToResultItems } from "@/services/radar/radarResultMapper";
import { filterAndDemoteResults } from "@/lib/radar/radar-quality-gate";
import { diversifyResults } from "@/lib/radar/radar-score";
import { trackRadarEvent, resetRadarSession } from "@/services/radar/radarAnalytics";
import RadarCardDispatcher from "@/components/radar/cards/RadarCardDispatcher";
import RadarFilters from "@/components/radar/RadarFilters";

type RadarGeoEntity = GeoEntity & { isSponsored?: boolean; reviewsCount?: number };
import PersonalRadarPanel from "@/components/radar/PersonalRadarPanel";
import ZoneIntelligenceSheet from "@/components/radar/ZoneIntelligenceSheet";
import { useLocationStore } from "@/stores/locationStore";
import { useRadarPlaceStore } from "@/stores/radarPlaceStore";
import {
  detectTimeSlot, generateGuidance, matchesLayer, computeRadarStats,
  type RadarLayer,
} from "@/lib/engines/hyper-radar-engine";
import { computeVibeDensity } from "@/lib/engines/vibe-density-engine";
import UnifiedMap from "@/components/map/UnifiedMap";
import RadarStoryRail from "@/components/radar/RadarStoryRail";
import RadarEntitySheet from "@/components/radar/RadarEntitySheet";
import RadarSmartSearch from "@/components/radar/RadarSmartSearch";
import { entityUrl } from "@/lib/entity/entity-url";
import { useAuth } from "@/contexts/AuthContext";
import { haptic } from "@/lib/haptics";
import {
  Radio, X, Search, Crosshair,
  Utensils, Hotel, Car, Sparkles, Moon, ShoppingBag, Building2,
  Navigation, Minus, Plus, CloudRain,
  MapPin, TrendingUp, Star, Heart, Store,
  Droplets, Wind, Map as MapIcon, List, Columns2, Zap, Loader2,
  Home, MessageCircle, Wallet, User,
} from "lucide-react";
import { useLiveWeatherStation } from "@/hooks/useLiveWeatherStation";
import { useSmartNavigation } from "@/hooks/useSmartNavigation";
import PillarOverlayHost from "@/components/overlays/PillarOverlayHost";
import { useNavigationStateMachine } from "@/stores/navigationStateMachine";
import { useWeatherDisplayStore } from "@/stores/weatherDisplayStore";
import { useI18n, tSafe } from "@/lib/i18n";
import { Z } from "@/lib/ui/z-index";
import SEOHead from "@/components/SEOHead";
import { RADAR_CATEGORIES, type RadarMainCategory } from "@/lib/taxonomy/world-class-taxonomy";

const RADAR_EMOJI_LOOKUP: Record<string, string> = Object.fromEntries(
  RADAR_CATEGORIES.map(c => [c.value, c.emoji])
);
function radarEmoji(key: string): string {
  return RADAR_EMOJI_LOOKUP[key] ?? "📍";
}

type ViewMode = "map" | "list" | "hybrid";
type SortMode = "smart" | "nearest" | "best_rated" | "trending";

const LAYER_DEFS: { id: RadarLayer; labelKey: string; icon: React.ReactNode; color: string; emoji: string; vertical: RadarVertical }[] = [
  { id: "food", labelKey: "radar.layer_food", icon: <Utensils className="w-3 h-3" />, color: "hsl(15 80% 55%)", emoji: radarEmoji("food"), vertical: "food" },
  { id: "stay", labelKey: "radar.layer_stay", icon: <Hotel className="w-3 h-3" />, color: "hsl(200 70% 50%)", emoji: radarEmoji("stay"), vertical: "stay" },
  { id: "services", labelKey: "radar.layer_services", icon: <Sparkles className="w-3 h-3" />, color: "hsl(270 60% 55%)", emoji: radarEmoji("services"), vertical: "services" },
  { id: "utility", labelKey: "radar.layer_utility", icon: <ShoppingBag className="w-3 h-3" />, color: "hsl(140 50% 45%)", emoji: radarEmoji("grocery"), vertical: "grocery" },
  { id: "mobility", labelKey: "radar.layer_mobility", icon: <Car className="w-3 h-3" />, color: "hsl(30 80% 50%)", emoji: radarEmoji("mobility"), vertical: "mobility" },
  { id: "nightlife", labelKey: "radar.layer_night", icon: <Moon className="w-3 h-3" />, color: "hsl(280 70% 55%)", emoji: radarEmoji("nightlife"), vertical: "nightlife" },
  { id: "healthcare", labelKey: "radar.layer_healthcare", icon: <Heart className="w-3 h-3" />, color: "hsl(0 65% 50%)", emoji: radarEmoji("healthcare"), vertical: "healthcare" },
  { id: "shops", labelKey: "radar.layer_shops", icon: <Store className="w-3 h-3" />, color: "hsl(38 65% 56%)", emoji: radarEmoji("shops"), vertical: "shops" },
  { id: "property", labelKey: "radar.layer_property", icon: <Building2 className="w-3 h-3" />, color: "hsl(220 40% 38%)", emoji: radarEmoji("property"), vertical: "property" },
];

const SORT_OPTIONS: { value: SortMode; icon: React.ReactNode; labelKey: string }[] = [
  { value: "smart", icon: <Zap className="w-3 h-3" />, labelKey: "radar.sort_smart" },
  { value: "nearest", icon: <Navigation className="w-3 h-3" />, labelKey: "radar.sort_nearest" },
  { value: "best_rated", icon: <Star className="w-3 h-3" />, labelKey: "radar.sort_best" },
  { value: "trending", icon: <TrendingUp className="w-3 h-3" />, labelKey: "radar.sort_trending" },
];

const RADIUS_PRESETS = [0.5, 1, 2, 5, 10, 25];
const MAX_VISIBLE_PINS = 80;

const CATEGORY_TO_LAYER: Record<string, RadarLayer> = {
  food: "food", stay: "stay", services: "services",
  utility: "utility", mobility: "mobility", nightlife: "nightlife",
  healthcare: "healthcare", shops: "shops", property: "property",
};

const PILLAR_LINKS = [
  { path: "/", icon: <Home className="w-4 h-4" />, labelKey: "radar.pillar_home", label: "Home" },
  { path: "/orbit", icon: <MessageCircle className="w-4 h-4" />, labelKey: "radar.pillar_orbit", label: "Orbit" },
  { path: "/wallet", icon: <Wallet className="w-4 h-4" />, labelKey: "radar.pillar_wallet", label: "Wallet" },
  { path: "/me", icon: <User className="w-4 h-4" />, labelKey: "radar.pillar_me", label: "Me" },
];

function getActiveVertical(activeLayers: RadarLayer[]): RadarVertical | undefined {
  if (activeLayers.length === 1) {
    const def = LAYER_DEFS.find(l => l.id === activeLayers[0]);
    return def?.vertical;
  }
  return undefined;
}

export default function HyperRadarPage() {
  useUiEngine({ enabled: true, autoRun: true, observeDom: true });
  const { t } = useI18n();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const location = useLocationStore((s) => s.currentLocation);
  const selectedPlace = useRadarPlaceStore((s) => s.selectedPlace);
  const { entities, loading } = useRadarResults({ surface: "radar" });
  const urlCategory = searchParams.get("category");
  const urlSubcategory = searchParams.get("subcategory");
  const urlSort = searchParams.get("sort") as SortMode | null;
  const urlVertical = searchParams.get("vertical");

  const [viewMode, setViewMode] = useState<ViewMode>("map");
  const [sortBy, setSortBy] = useState<SortMode>(() => {
    if (urlSort && ["smart", "nearest", "best_rated", "trending"].includes(urlSort)) return urlSort;
    return "smart";
  });
  const [activeLayers, setActiveLayers] = useState<RadarLayer[]>(() => {
    if (urlVertical && CATEGORY_TO_LAYER[urlVertical]) return [CATEGORY_TO_LAYER[urlVertical]];
    if (urlCategory && CATEGORY_TO_LAYER[urlCategory]) return [CATEGORY_TO_LAYER[urlCategory]];
    return ["food", "stay", "services", "utility"];
  });
  const [radius, setRadius] = useState(5);
  const [panelSnap, setPanelSnap] = useState<"closed" | "peek" | "half">("peek");
  const [zoneClick, setZoneClick] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<RadarGeoEntity | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearch = useDeferredValue(searchQuery);
  const radarOverlay = useWeatherDisplayStore(s => s.radarOverlay);
  const { smartNavigate, overlayState, closeOverlay } = useSmartNavigation();
  const setRadarOverlay = useWeatherDisplayStore(s => s.setRadarOverlay);
  const weather = useLiveWeatherStation({ lat: location?.lat, lng: location?.lng });
  const fsmSetSubState = useNavigationStateMachine((s) => s.setPillarSubState);
  const fsmUpdateCtx = useNavigationStateMachine((s) => s.updatePillarContext);

  const activeVertical = useMemo(() => getActiveVertical(activeLayers), [activeLayers]);
  const [filterValues, setFilterValues] = useState<RadarFilterValues>(() =>
    getDefaultFilterValues(activeVertical ?? "shops")
  );
  const [mapMovedCenter, setMapMovedCenter] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (selectedEntity) {
      fsmSetSubState("RADAR_DETAIL_PREVIEW");
    } else if (deferredSearch) {
      fsmSetSubState("RADAR_SEARCHING");
    } else if (entities.length > 0 && !loading) {
      fsmSetSubState("RADAR_RESULTS");
    } else {
      fsmSetSubState("RADAR_IDLE");
    }
  }, [selectedEntity, deferredSearch, entities.length, loading, fsmSetSubState]);

  useEffect(() => {
    fsmUpdateCtx("radar", {
      lastQuery: deferredSearch || undefined,
      lastFilters: filterValues as Record<string, unknown>,
      lastEntity: selectedEntity ? { id: selectedEntity.id, name: selectedEntity.name, type: selectedEntity.type } : undefined,
    });
  }, [deferredSearch, filterValues, selectedEntity, fsmUpdateCtx]);
  const [showSearchHere, setShowSearchHere] = useState(false);
  const lastSearchCenter = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    resetRadarSession();
    trackRadarEvent("search_started", { surface: "radar", viewMode });
  }, []);

  useEffect(() => {
    const key = urlVertical || urlCategory;
    if (key && CATEGORY_TO_LAYER[key]) {
      setActiveLayers([CATEGORY_TO_LAYER[key]]);
      setPanelSnap("half");
    }
  }, [urlCategory, urlVertical]);

  useEffect(() => {
    if (activeVertical) {
      setFilterValues(getDefaultFilterValues(activeVertical));
    }
  }, [activeVertical]);

  const mapCenter = useMemo(() => {
    if (selectedPlace?.lat && selectedPlace?.lng) return { lat: selectedPlace.lat, lng: selectedPlace.lng };
    return location ? { lat: location.lat, lng: location.lng } : undefined;
  }, [selectedPlace, location]);

  const radarItems = useMemo<RadarResultItem[]>(() => {
    if (!entities.length) return [];

    const userLat = mapCenter?.lat ?? location?.lat ?? 25.2;
    const userLng = mapCenter?.lng ?? location?.lng ?? 55.27;

    const points = entities.map(e => ({
      id: e.id,
      title: e.title || e.name,
      subtitle: e.subtitle || e.address || null,
      imageUrl: e.imageUrl || e.image_url || null,
      category: (e.category || e.type || "shops") as "food" | "shops" | "grocery" | "property" | "services",
      subcategory: e.subcategory || e.category || null,
      lat: e.lat,
      lng: e.lng,
      rating: e.rating ?? null,
      reviewsCount: e.reviewsCount ?? null,
      isSponsored: e.isSponsored ?? false,
      distanceKm: e.distance,
      slug: e.slug || null,
      district: null,
      cityName: null,
    }));

    let items = mapPointsToResultItems(points, {
      userLat,
      userLng,
      searchQuery: deferredSearch || undefined,
      vertical: activeVertical,
    });

    items = filterAndDemoteResults(items);

    if (activeLayers.length > 0 && activeLayers.length < LAYER_DEFS.length) {
      const verticals = new Set(activeLayers.map(l => LAYER_DEFS.find(d => d.id === l)?.vertical).filter(Boolean));
      items = items.filter(i => {
        if (verticals.has(i.type)) return true;
        const cat = (i.category || "").toLowerCase();
        return activeLayers.some(layer => matchesLayer(cat, layer));
      });
    }

    if (urlSubcategory) {
      const sub = urlSubcategory.toLowerCase();
      items = items.filter(i => {
        const cat = (i.category || i.subcategory || "").toLowerCase();
        return cat.includes(sub);
      });
    }

    if (deferredSearch.trim()) {
      const q = deferredSearch.toLowerCase();
      items = items.filter(i =>
        i.title.toLowerCase().includes(q) ||
        (i.category || "").toLowerCase().includes(q) ||
        (i.subcategory || "").toLowerCase().includes(q)
      );
    }

    if (filterValues.open_now === true) {
      items = items.filter(i => i.available !== false);
    }
    if (typeof filterValues.rating_min === "number" && (filterValues.rating_min as number) > 0) {
      items = items.filter(i => (i.ratingValue ?? 0) >= (filterValues.rating_min as number));
    }
    if (filterValues.distance_max && filterValues.distance_max !== "any") {
      const maxKm = parseFloat(filterValues.distance_max as string);
      items = items.filter(i => i.distanceKm == null || i.distanceKm <= maxKm);
    }
    if (filterValues.cuisine && typeof filterValues.cuisine === "string" && filterValues.cuisine !== "") {
      const c = (filterValues.cuisine as string).toLowerCase();
      items = items.filter(i =>
        (i.subcategory || "").toLowerCase().includes(c) ||
        (i.category || "").toLowerCase().includes(c)
      );
    }
    if (typeof filterValues.price_level === "string" && filterValues.price_level !== "") {
      const level = parseInt(filterValues.price_level as string, 10);
      if (!isNaN(level)) {
        items = items.filter(i => {
          const meta = i.meta as Record<string, unknown>;
          return meta.priceLevel == null || (meta.priceLevel as number) <= level;
        });
      }
    }
    if (filterValues.listing_type && typeof filterValues.listing_type === "string" && filterValues.listing_type !== "") {
      items = items.filter(i => {
        const meta = i.meta as Record<string, unknown>;
        return !meta.listingType || meta.listingType === filterValues.listing_type;
      });
    }
    if (filterValues.delivery === true) {
      items = items.filter(i => {
        const meta = i.meta as Record<string, unknown>;
        return meta.delivery !== false;
      });
    }

    if (sortBy === "smart") {
      items.sort((a, b) => b.radarScore - a.radarScore);
      items = diversifyResults(items, 3);
    } else if (sortBy === "nearest") {
      items.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
    } else if (sortBy === "best_rated") {
      items.sort((a, b) => (b.ratingValue ?? 0) - (a.ratingValue ?? 0));
    } else if (sortBy === "trending") {
      items.sort((a, b) => {
        const aS = (a.isSponsored ? 50 : 0) + a.reviewsCount * 0.5 + (a.ratingValue ?? 0) * 5;
        const bS = (b.isSponsored ? 50 : 0) + b.reviewsCount * 0.5 + (b.ratingValue ?? 0) * 5;
        return bS - aS;
      });
    }

    if (items.length > MAX_VISIBLE_PINS) items = items.slice(0, MAX_VISIBLE_PINS);

    return items;
  }, [entities, activeLayers, deferredSearch, urlSubcategory, sortBy, location, mapCenter, activeVertical, filterValues]);

  useEffect(() => {
    trackRadarEvent("search_completed", {
      total: radarItems.length,
      vertical: activeVertical,
      sortBy,
      query: deferredSearch || null,
    });
  }, [radarItems.length, activeVertical, sortBy, deferredSearch]);

  const visibleEntities = useMemo<RadarGeoEntity[]>(() => {
    return radarItems.map(item => ({
      id: item.id,
      type: item.type === "food" ? "restaurant" as const : item.type === "hotel" ? "service" as const : item.type === "grocery" ? "grocery" as const : item.type === "property" ? "property" as const : "shop" as const,
      name: item.title,
      title: item.title,
      subtitle: item.subtitle || undefined,
      lat: item.lat,
      lng: item.lng,
      imageUrl: item.image || undefined,
      image_url: item.image || undefined,
      rating: item.ratingValue ?? undefined,
      category: item.category,
      address: item.address || undefined,
      slug: item.slug || undefined,
      distance: item.distanceKm ?? undefined,
      isSponsored: item.isSponsored,
      reviewsCount: item.reviewsCount,
    }));
  }, [radarItems]);

  const handleZoneClick = useCallback((lat: number, lng: number) => {
    setZoneClick({ lat, lng });
    setSelectedEntity(null);
    setPanelSnap("closed");
  }, []);

  const handleSelectEntity = useCallback((entity: GeoEntity) => {
    setSelectedEntity(entity as RadarGeoEntity);
    setZoneClick(null);
    setPanelSnap("closed");
    trackRadarEvent("result_clicked", { entityId: entity.id });
  }, []);

  const handleSelectRadarItem = useCallback((item: RadarResultItem) => {
    const geo: RadarGeoEntity = {
      id: item.id,
      type: item.type === "food" ? "restaurant" : item.type === "hotel" ? "service" : item.type === "grocery" ? "grocery" : item.type === "property" ? "property" : "shop",
      name: item.title,
      title: item.title,
      subtitle: item.subtitle || undefined,
      lat: item.lat,
      lng: item.lng,
      imageUrl: item.image || undefined,
      image_url: item.image || undefined,
      rating: item.ratingValue ?? undefined,
      category: item.category,
      slug: item.slug || undefined,
      distance: item.distanceKm ?? undefined,
      isSponsored: item.isSponsored,
      reviewsCount: item.reviewsCount,
    };
    setSelectedEntity(geo);
    setZoneClick(null);
    setPanelSnap("closed");
    trackRadarEvent("result_clicked", { entityId: item.id, vertical: item.type, score: item.radarScore });
  }, []);

  const handleNavigateItem = useCallback((item: RadarResultItem) => {
    haptic("medium");
    const q = item.address || `${item.lat},${item.lng}`;
    window.open(`https://maps.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`, "_blank", "noopener,noreferrer");
    trackRadarEvent("cta_used", { action: "navigate", entityId: item.id });
  }, []);

  const handleMessageItem = useCallback(async (item: RadarResultItem) => {
    if (!user?.id) { navigate("/login"); return; }
    haptic("light");
    smartNavigate("/orbit", "contact_entity", {
      entityId: item.id,
      entityName: item.title,
      entityType: item.type,
      entityImage: item.image || undefined,
    });
    trackRadarEvent("cta_used", { action: "message", entityId: item.id });
  }, [user?.id, navigate, smartNavigate]);

  const handleNavigateEntity = useCallback((entity: RadarGeoEntity) => {
    haptic("medium");
    const q = entity.address || `${entity.lat},${entity.lng}`;
    window.open(`https://maps.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`, "_blank", "noopener,noreferrer");
  }, []);

  const handleMessageEntity = useCallback(async (entity: RadarGeoEntity) => {
    if (!user?.id) { navigate("/login"); return; }
    haptic("light");
    smartNavigate("/orbit", "contact_entity", {
      entityId: entity.id,
      entityName: entity.name,
      entityType: entity.type,
      entityImage: entity.imageUrl || entity.image_url || undefined,
    });
  }, [user?.id, navigate, smartNavigate]);

  const handleCategorySelect = useCallback((layer: RadarLayer) => {
    haptic("light");
    setActiveLayers([layer]);
    setPanelSnap("half");
    trackRadarEvent("filter_used", { filter: "category", value: layer });
  }, []);

  const handleSearchHere = useCallback(() => {
    if (mapMovedCenter) {
      useRadarPlaceStore.getState().setSelectedPlace({
        lat: mapMovedCenter.lat,
        lng: mapMovedCenter.lng,
        label: "Map area",
      });
      lastSearchCenter.current = mapMovedCenter;
      setShowSearchHere(false);
      trackRadarEvent("area_research", { lat: mapMovedCenter.lat, lng: mapMovedCenter.lng });
    }
  }, [mapMovedCenter]);

  const handleRecenter = useCallback(() => {
    if (location) {
      useRadarPlaceStore.getState().setSelectedPlace(null);
      setMapMovedCenter(null);
      setShowSearchHere(false);
      haptic("light");
    }
  }, [location]);

  const handleMapMove = useCallback((center: { lat: number; lng: number }) => {
    setMapMovedCenter(center);
    const ref = lastSearchCenter.current ?? mapCenter;
    if (ref) {
      const dlat = Math.abs(center.lat - ref.lat);
      const dlng = Math.abs(center.lng - ref.lng);
      if (dlat > 0.005 || dlng > 0.005) {
        setShowSearchHere(true);
      }
    }
  }, [mapCenter]);

  const handleFilterChange = useCallback((values: RadarFilterValues) => {
    setFilterValues(values);
    trackRadarEvent("filter_used", { filters: values });
  }, []);

  const handleSortChange = useCallback((s: SortMode) => {
    haptic("light");
    setSortBy(s);
    trackRadarEvent("sort_changed", { sortBy: s });
  }, []);

  const handleViewModeChange = useCallback((v: ViewMode) => {
    haptic("light");
    setViewMode(v);
    trackRadarEvent("view_mode_changed", { mode: v });
  }, []);

  const hour = new Date().getHours();
  const timeSlot = useMemo(() => detectTimeSlot(), []);
  const vibe = useMemo(() => {
    if (!visibleEntities.length) return null;
    return computeVibeDensity("current", visibleEntities.map(e => ({
      category: e.category || "service", rating: e.rating, reviewsCount: e.reviewsCount,
    })), hour);
  }, [visibleEntities, hour]);

  const guidance = useMemo(() => {
    if (!location) return [];
    return generateGuidance(timeSlot, location.lat, location.lng, visibleEntities.slice(0, 25).map(e => ({
      name: e.name, category: e.category || "service", distanceKm: e.distance ?? 99, id: e.id, rating: e.rating,
    }))).slice(0, 6);
  }, [timeSlot, location, visibleEntities]);

  const stats = useMemo(() => computeRadarStats(entities.length, visibleEntities), [entities.length, visibleEntities]);

  const toggleLayer = useCallback((id: RadarLayer) => {
    setActiveLayers(prev => prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]);
  }, []);

  const cycleRadius = useCallback((dir: 1 | -1) => {
    const idx = RADIUS_PRESETS.indexOf(radius);
    const next = idx === -1 ? 2 : Math.max(0, Math.min(RADIUS_PRESETS.length - 1, idx + dir));
    setRadius(RADIUS_PRESETS[next]);
  }, [radius]);

  const cyclePanelSnap = useCallback(() => {
    setPanelSnap(prev => prev === "closed" ? "peek" : prev === "peek" ? "half" : "closed");
  }, []);

  const distLabel = (r: number) => r >= 1 ? `${r}${tSafe(t, "radar.km", "km")}` : `${r * 1000}${tSafe(t, "radar.m", "m")}`;

  const mapComponent = (
    <UnifiedMap
      entities={visibleEntities}
      showUserLocation
      userLat={mapCenter?.lat ?? location?.lat ?? 25.2}
      userLng={mapCenter?.lng ?? location?.lng ?? 55.27}
      showHeatmap={visibleEntities.length > 30}
      heatmapPoints={visibleEntities.map(e => ({ lat: e.lat, lng: e.lng, intensity: 0.5 }))}
      radiusKm={radius}
      showWeatherLayer={radarOverlay !== "off"}
      selectedId={selectedEntity?.id}
      onSelectEntity={handleSelectEntity}
      onZoneClick={handleZoneClick}
      onMapMove={handleMapMove}
      hideWeatherBadge
    />
  );

  const resultListContent = (
    <div className="space-y-1.5">
      {loading && (
        <div className="flex flex-col items-center gap-2 py-8">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: "hsl(38 65% 56%)" }} />
          <p className="text-[10px] text-muted-foreground">{tSafe(t, "radar.loading", "Scanning...")}</p>
        </div>
      )}
      {radarItems.length === 0 && !loading && (
        <div className="flex flex-col items-center gap-2.5 py-12 text-center">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "hsl(38 65% 56% / 0.08)" }}>
            <MapPin className="w-6 h-6" style={{ color: "hsl(38 65% 56% / 0.5)" }} />
          </div>
          <p className="text-xs font-bold text-foreground">{tSafe(t, "radar.no_results", "No results nearby")}</p>
          <p className="text-[10px] text-muted-foreground max-w-[200px]">{tSafe(t, "radar.no_results_hint", "Try expanding your radius or changing filters")}</p>
          <button
            onClick={() => {
              setActiveLayers(["food", "stay", "services", "utility"]);
              setFilterValues(getDefaultFilterValues("shops"));
              trackRadarEvent("filter_reset", {});
            }}
            className="mt-1 px-4 py-1.5 rounded-full text-[10px] font-bold active:scale-95 transition-transform"
            style={{ background: "hsl(38 65% 56% / 0.1)", color: "hsl(38 65% 56%)" }}
          >
            {tSafe(t, "radar.reset_all", "Reset all filters")}
          </button>
        </div>
      )}
      {radarItems.map((item, idx) => (
        <RadarCardDispatcher
          key={item.id}
          item={item}
          rank={sortBy === "smart" ? idx + 1 : undefined}
          selected={selectedEntity?.id === item.id}
          onSelect={() => handleSelectRadarItem(item)}
          onNavigate={() => handleNavigateItem(item)}
          onMessage={() => handleMessageItem(item)}
        />
      ))}
    </div>
  );

  return (
    <div className="h-[100dvh] w-full relative overflow-hidden bg-background pillar-page">
      <SEOHead
        title={tSafe(t, "radar.seo_title", "Radar — Discover nearby")}
        description={tSafe(t, "radar.seo_desc", "Real-time discovery engine")}
        canonical="https://www.easy-locs.com/radar"
        keywords={tSafe(t, "radar.seo_keywords", "radar, discover, nearby")}
      />

      {viewMode === "map" && (
        <>
          {!loading && radarItems.length === 0 && (
            <div className="absolute inset-0 z-[5] flex items-center justify-center pointer-events-none">
              <div className="flex flex-col items-center gap-2 px-6 py-4 rounded-2xl bg-card/90 backdrop-blur-md border border-border/15 max-w-[240px] text-center">
                <MapPin className="w-6 h-6 text-muted-foreground/50" />
                <span className="text-xs font-bold text-foreground">{tSafe(t, "radar.no_results", "No results nearby")}</span>
                <span className="text-[10px] text-muted-foreground">{tSafe(t, "radar.no_results_hint", "Try expanding your radius")}</span>
              </div>
            </div>
          )}

          <div className="absolute inset-0 z-0">{mapComponent}</div>
        </>
      )}

      {viewMode === "hybrid" && (
        <div className="flex flex-col h-full">
          <div className="h-[45%] relative shrink-0">
            {mapComponent}
            {showSearchHere && (
              <SearchHereButton onClick={handleSearchHere} t={t} />
            )}
          </div>
          <div className="flex-1 overflow-y-auto bg-background">
            <div className="px-4 pt-3 pb-2 space-y-2">
              {activeVertical && (
                <RadarFilters
                  vertical={activeVertical}
                  values={filterValues}
                  onChange={handleFilterChange}
                  resultCount={radarItems.length}
                />
              )}
              <SortBar sortBy={sortBy} setSortBy={handleSortChange} t={t} />
            </div>
            <div className="px-4 pb-24">{resultListContent}</div>
          </div>
        </div>
      )}

      {viewMode === "list" && (
        <div className="flex flex-col h-full">
          <div className="shrink-0 px-4 pt-[env(safe-area-inset-top,8px)] pb-2" style={{ background: "hsl(var(--background))" }}>
            <TopBar t={t} navigate={navigate} viewMode={viewMode} setViewMode={handleViewModeChange} />
            <div className="mt-2">
              <RadarSmartSearch onCategorySelect={handleCategorySelect} onSearchFilter={setSearchQuery} />
            </div>
            <div className="mt-2">
              <LayerChips activeLayers={activeLayers} toggleLayer={toggleLayer} radarOverlay={radarOverlay} setRadarOverlay={setRadarOverlay} t={t} />
            </div>
            {activeVertical && (
              <div className="mt-2">
                <RadarFilters
                  vertical={activeVertical}
                  values={filterValues}
                  onChange={handleFilterChange}
                  resultCount={radarItems.length}
                />
              </div>
            )}
            <div className="mt-2">
              <SortBar sortBy={sortBy} setSortBy={handleSortChange} t={t} />
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] text-muted-foreground">
                {loading ? tSafe(t, "radar.loading", "Scanning...") : `${radarItems.length} ${tSafe(t, "radar.places_found", "places found")}`}
              </span>
              <PillarNav onNavigate={smartNavigate} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-24">{resultListContent}</div>
        </div>
      )}

      {(viewMode === "map" || viewMode === "hybrid") && (
        <>
          <div
            className="absolute top-0 left-0 right-0 flex items-center justify-between px-3 pt-[env(safe-area-inset-top,8px)] pb-2"
            style={{ zIndex: Z.overlay, background: viewMode === "map" ? "linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--background)/0.85) 60%, transparent 100%)" : "hsl(var(--background))" }}
          >
            <button onClick={() => navigate(-1)} aria-label="Close" className="w-9 h-9 rounded-xl bg-card/90 border border-border/15 flex items-center justify-center active:scale-95 transition-transform backdrop-blur-md">
              <X className="w-4 h-4 text-foreground" />
            </button>

            <div className="min-w-0 flex flex-col items-center gap-1">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "hsl(38 65% 56% / 0.12)" }}>
                  <Radio className="w-3 h-3" style={{ color: "hsl(38 65% 56%)" }} />
                </div>
                <span className="text-xs font-bold text-foreground">{tSafe(t, "radar.title", "Radar")}</span>
              </div>
            </div>

            <ViewModeToggle viewMode={viewMode} setViewMode={handleViewModeChange} />
          </div>

          {viewMode === "map" && (
            <motion.div
              className="absolute left-3 right-3 top-[74px]"
              style={{ zIndex: Z.overlay }}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <RadarSmartSearch onCategorySelect={handleCategorySelect} onSearchFilter={setSearchQuery} />
            </motion.div>
          )}

          {viewMode === "map" && (
            <>
              <motion.div
                className="absolute right-3 top-[130px] flex flex-col items-center gap-1.5 rounded-2xl border border-border/15 bg-card/90 px-2 py-2.5 backdrop-blur-md"
                style={{ zIndex: Z.overlay }}
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 }}
              >
                <button onClick={() => cycleRadius(1)} aria-label="Increase radius" className="w-8 h-8 rounded-xl flex items-center justify-center active:scale-90 transition-transform" style={{ background: "hsl(38 65% 56% / 0.1)" }}>
                  <Plus className="w-3.5 h-3.5" style={{ color: "hsl(38 65% 56%)" }} />
                </button>
                <div className="text-center py-0.5">
                  <p className="text-[11px] font-bold text-foreground">{radius >= 1 ? `${radius}` : `${radius * 1000}`}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{radius >= 1 ? tSafe(t, "radar.km", "km") : tSafe(t, "radar.m", "m")}</p>
                </div>
                <button onClick={() => cycleRadius(-1)} aria-label="Decrease radius" className="w-8 h-8 rounded-xl flex items-center justify-center active:scale-90 transition-transform bg-muted/15">
                  <Minus className="w-3.5 h-3.5 text-muted-foreground" />
                </button>

                <div className="w-full h-px my-0.5" style={{ background: "hsl(var(--border) / 0.15)" }} />

                <button onClick={handleRecenter} aria-label="Recenter" className="w-8 h-8 rounded-xl flex items-center justify-center active:scale-90 transition-transform" style={{ background: "hsl(38 65% 56% / 0.1)" }}>
                  <Crosshair className="w-3.5 h-3.5" style={{ color: "hsl(38 65% 56%)" }} />
                </button>
              </motion.div>

              {showSearchHere && (
                <SearchHereButton onClick={handleSearchHere} t={t} />
              )}

              <WeatherWidget weather={weather} vibe={vibe} stats={stats} t={t} />

              <motion.div
                className="absolute left-0 right-0 px-3"
                style={{ zIndex: Z.overlay, bottom: panelSnap === "half" ? "50%" : panelSnap === "peek" ? "200px" : "16px" }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                <LayerChips activeLayers={activeLayers} toggleLayer={toggleLayer} radarOverlay={radarOverlay} setRadarOverlay={setRadarOverlay} t={t} />
              </motion.div>
            </>
          )}
        </>
      )}

      {viewMode === "map" && (
        <AnimatePresence>
          {!zoneClick && (
            <motion.div
              className="absolute bottom-0 left-0 right-0 rounded-t-2xl border-t border-border/15"
              style={{ zIndex: Z.controls, background: "hsl(var(--card)/0.97)", backdropFilter: "blur(16px)" }}
              initial={{ y: 200 }}
              animate={{
                y: 0,
                height: panelSnap === "closed" ? 36 : panelSnap === "peek" ? 220 : "60dvh",
              }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
            >
              <button onClick={cyclePanelSnap} className="w-full flex flex-col items-center justify-center py-2 active:bg-muted/10">
                <div className="w-9 h-1 rounded-full bg-muted-foreground/25" />
              </button>

              {panelSnap !== "closed" && (
                <div className="px-4 pb-4 overflow-y-auto" style={{ maxHeight: panelSnap === "peek" ? 220 : "calc(60dvh - 36px)" }}>
                  <RadarStoryRail />

                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">
                        {tSafe(t, "radar.places_radius", "{count} places within {radius}").replace("{count}", String(radarItems.length)).replace("{radius}", distLabel(radius))}
                      </span>
                      {stats.avgRating > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px] text-yellow-500">
                          <Star className="w-2.5 h-2.5" /> {stats.avgRating}
                        </span>
                      )}
                    </div>
                    <PillarNav onNavigate={smartNavigate} />
                  </div>

                  <SortBar sortBy={sortBy} setSortBy={handleSortChange} t={t} />

                  {activeVertical && panelSnap === "half" && (
                    <div className="mt-2">
                      <RadarFilters
                        vertical={activeVertical}
                        values={filterValues}
                        onChange={handleFilterChange}
                        resultCount={radarItems.length}
                      />
                    </div>
                  )}

                  {guidance.length > 0 && (
                    <div className="mb-3 mt-2">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">{tSafe(t, "radar.for_you_now", "For You Now")}</p>
                      <div className="flex gap-2 overflow-x-auto scrollbar-none">
                        {guidance.map(g => (
                          <motion.div
                            key={g.id}
                            whileTap={{ scale: 0.96 }}
                            className="min-w-[140px] px-3 py-2.5 rounded-xl border border-border/10 shrink-0 bg-background/50 cursor-pointer transition-colors"
                            style={{ borderLeft: `3px solid ${g.accentColor || "hsl(38 65% 56%)"}` }}
                            onClick={() => {
                              const entity = visibleEntities.find(e => e.id === g.targetEntityId);
                              if (entity) handleSelectEntity(entity);
                            }}
                          >
                            <p className="text-[11px] font-bold text-foreground truncate">{g.title}</p>
                            <p className="text-[10px] text-muted-foreground truncate mt-0.5">{g.subtitle}</p>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-2">{resultListContent}</div>

                  {panelSnap === "half" && (
                    <div className="mt-3">
                      <PersonalRadarPanel entities={visibleEntities} open />
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      <AnimatePresence>
        {selectedEntity && (
          <RadarEntitySheet
            entity={selectedEntity}
            onClose={() => { setSelectedEntity(null); setPanelSnap("peek"); }}
            onSmartNavigate={smartNavigate}
          />
        )}
      </AnimatePresence>

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

      <PillarOverlayHost
        activeOverlay={overlayState.activeOverlay}
        overlayRoute={overlayState.overlayRoute}
        overlayContext={overlayState.overlayContext}
        onClose={closeOverlay}
      />
    </div>
  );
}

function SearchHereButton({ onClick, t }: { onClick: () => void; t: (key: string) => string }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      onClick={onClick}
      className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-4 py-2 rounded-full border shadow-lg active:scale-95 transition-transform"
      style={{
        zIndex: Z.overlay + 1,
        background: "hsl(220 40% 18% / 0.95)",
        borderColor: "hsl(38 65% 56% / 0.3)",
        color: "hsl(38 65% 56%)",
        backdropFilter: "blur(12px)",
      }}
    >
      <Search className="w-3.5 h-3.5" />
      <span className="text-[11px] font-bold">{tSafe(t, "radar.search_here", "Search this area")}</span>
    </motion.button>
  );
}

function ViewModeToggle({ viewMode, setViewMode }: { viewMode: ViewMode; setViewMode: (v: ViewMode) => void }) {
  const modes: { value: ViewMode; icon: React.ReactNode; label: string }[] = [
    { value: "map", icon: <MapIcon className="w-3.5 h-3.5" />, label: "Map view" },
    { value: "hybrid", icon: <Columns2 className="w-3.5 h-3.5" />, label: "Hybrid view" },
    { value: "list", icon: <List className="w-3.5 h-3.5" />, label: "List view" },
  ];

  return (
    <div className="flex rounded-xl p-0.5 bg-card/90 border border-border/15 backdrop-blur-md" role="group" aria-label="View mode">
      {modes.map(m => (
        <button
          key={m.value}
          onClick={() => setViewMode(m.value)}
          aria-label={m.label}
          aria-pressed={viewMode === m.value}
          className="p-1.5 rounded-lg transition-all"
          style={{
            background: viewMode === m.value ? "hsl(38 65% 56% / 0.15)" : "transparent",
            color: viewMode === m.value ? "hsl(38 65% 56%)" : "hsl(var(--muted-foreground))",
          }}
        >
          {m.icon}
        </button>
      ))}
    </div>
  );
}

type TFn = (key: string) => string;

function TopBar({ t, navigate, viewMode, setViewMode }: { t: TFn; navigate: (to: string | number) => void; viewMode: ViewMode; setViewMode: (v: ViewMode) => void }) {
  return (
    <div className="flex items-center justify-between">
      <button onClick={() => navigate(-1)} aria-label="Close" className="w-9 h-9 rounded-xl bg-card border border-border/15 flex items-center justify-center active:scale-95 transition-transform">
        <X className="w-4 h-4 text-foreground" />
      </button>
      <div className="flex items-center gap-1.5">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "hsl(38 65% 56% / 0.12)" }}>
          <Radio className="w-3 h-3" style={{ color: "hsl(38 65% 56%)" }} />
        </div>
        <span className="text-xs font-bold text-foreground">{tSafe(t, "radar.title", "Radar")}</span>
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full ml-1" style={{ background: "hsl(var(--success)/0.1)", border: "1px solid hsl(var(--success)/0.2)" }}>
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "hsl(var(--success))" }} />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: "hsl(var(--success))" }} />
          </span>
          <span className="text-[10px] font-bold" style={{ color: "hsl(var(--success))" }}>{tSafe(t, "radar.live", "Live")}</span>
        </div>
      </div>
      <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
    </div>
  );
}

function SortBar({ sortBy, setSortBy, t }: { sortBy: SortMode; setSortBy: (s: SortMode) => void; t: TFn }) {
  return (
    <div className="flex gap-1 overflow-x-auto scrollbar-none">
      {SORT_OPTIONS.map(s => (
        <button
          key={s.value}
          onClick={() => setSortBy(s.value)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-semibold whitespace-nowrap shrink-0 border transition-all active:scale-95"
          style={{
            background: sortBy === s.value ? "hsl(38 65% 56% / 0.12)" : "hsl(var(--card) / 0.6)",
            borderColor: sortBy === s.value ? "hsl(38 65% 56% / 0.3)" : "hsl(var(--border) / 0.15)",
            color: sortBy === s.value ? "hsl(38 65% 56%)" : "hsl(var(--muted-foreground))",
          }}
        >
          {s.icon}
          {tSafe(t, s.labelKey, s.value.replace("_", " "))}
        </button>
      ))}
    </div>
  );
}

function LayerChips({ activeLayers, toggleLayer, radarOverlay, setRadarOverlay, t }: {
  activeLayers: RadarLayer[];
  toggleLayer: (id: RadarLayer) => void;
  radarOverlay: string;
  setRadarOverlay: (v: string) => void;
  t: TFn;
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
      <button
        onClick={() => setRadarOverlay(radarOverlay === "off" ? "full" : "off")}
        className="flex items-center gap-1 rounded-full border border-border/15 bg-card/85 px-2.5 py-1.5 text-[10px] font-semibold whitespace-nowrap shrink-0 text-foreground backdrop-blur-md active:scale-95 transition-transform"
      >
        <CloudRain className="h-3 w-3 shrink-0" style={{ color: "hsl(38 65% 56%)" }} />
        {radarOverlay !== "off" ? tSafe(t, "radar.radar_on", "Radar On") : tSafe(t, "radar.radar_off", "Radar")}
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
  );
}

function WeatherWidget({ weather, vibe, stats, t }: { weather: WeatherStationState; vibe: VibeDensityResult | null; stats: RadarStats; t: TFn }) {
  return (
    <motion.div
      className="absolute left-3 top-[46px] flex flex-col gap-1.5"
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
              <p className="text-[10px] text-muted-foreground">{vibe.crowdDensity}% {tSafe(t, "radar.active", "active")}</p>
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
            <span className="text-[10px] text-muted-foreground">{stats.hotspotCount} {tSafe(t, "radar.hotspots", "hotspots")}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function PillarNav({ onNavigate }: { onNavigate: (path: string, action?: string) => void }) {
  return (
    <nav className="flex items-center gap-0.5" aria-label="Quick navigation">
      {PILLAR_LINKS.map(p => (
        <button
          key={p.path}
          onClick={() => { haptic("light"); onNavigate(p.path, "pillar_switch"); }}
          aria-label={p.label}
          className="w-7 h-7 rounded-lg flex items-center justify-center active:scale-90 transition-transform text-muted-foreground/60 hover:text-foreground"
        >
          {p.icon}
        </button>
      ))}
    </nav>
  );
}
