import { useState, useMemo, useCallback, useEffect, useDeferredValue, useRef } from "react";
import type mapboxgl from "mapbox-gl";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useRadarResults } from "@/hooks/useRadarResults";
import { useUiEngine } from "@/hooks/useUiEngine";
import type { GeoEntity } from "@/lib/geo/geoEntityAdapter";
import type { RadarStats } from "@/lib/engines/hyper-radar-engine";
import type { VibeDensityResult } from "@/lib/engines/vibe-density-engine";
import type { RadarResultItem, RadarVertical } from "@/lib/radar/radar-result-item";
import type { RadarFilterValues } from "@/lib/radar/radar-filter-schemas";
import { getDefaultFilterValues } from "@/lib/radar/radar-filter-schemas";
import { mapPointsToResultItems } from "@/services/radar/radarResultMapper";
import { filterAndDemoteResults } from "@/lib/radar/radar-quality-gate";
import { diversifyResults } from "@/lib/radar/radar-score";
import { trackRadarEvent, resetRadarSession } from "@/services/radar/radarAnalytics";
import RadarCardDispatcher from "@/components/radar/cards/RadarCardDispatcher";
import RadarFilters from "@/components/radar/RadarFilters";
import type { HeatmapMode } from "@/lib/map/heatmap-engine";
import { radarPointsToHeatmap } from "@/lib/map/heatmap-engine";
import type { RadarPoint, RadarCategory } from "@/lib/radar/types";

type RadarGeoEntity = GeoEntity & { isSponsored?: boolean; reviewsCount?: number; vertical?: string };
import ZoneIntelligenceSheet from "@/components/radar/ZoneIntelligenceSheet";
import { useLocationStore } from "@/stores/locationStore";
import { useRadarPlaceStore } from "@/stores/radarPlaceStore";
import {
  detectTimeSlot, generateGuidance, matchesLayer, computeRadarStats,
  type RadarLayer,
} from "@/lib/engines/hyper-radar-engine";
import { computeVibeDensity } from "@/lib/engines/vibe-density-engine";
import UnifiedMap from "@/components/map/UnifiedMap";
import RadarEntitySheet from "@/components/radar/RadarEntitySheet";
import RadarSmartSearch from "@/components/radar/RadarSmartSearch";
import SnapBottomSheet, { type SnapPoint } from "@/components/radar/SnapBottomSheet";
import WeatherCapsule from "@/components/radar/WeatherCapsule";
import HeatmapModeSelector from "@/components/radar/HeatmapModeSelector";
import NightlifeZonesLayer from "@/components/radar/NightlifeZonesLayer";
import { entityUrl } from "@/lib/entity/entity-url";
import { useAuth } from "@/contexts/AuthContext";
import { haptic } from "@/lib/haptics";
import { useInAppNavigation } from "@/stores/useInAppNavigation";
import { platformBus } from "@/lib/shared/platform-bus";
import type { RadarDecision } from "@/lib/radar/radar-brain-orchestrator";
import {
  Crosshair,
  Layers, MapPin, TrendingUp, Star,
  CloudRain, Loader2, Zap, Navigation,
} from "lucide-react";
import { useLiveWeatherStation } from "@/hooks/useLiveWeatherStation";
import { useSmartNavigation } from "@/hooks/useSmartNavigation";
import PillarOverlayHost from "@/components/overlays/PillarOverlayHost";
import { useNavigationStateMachine } from "@/stores/navigationStateMachine";
import { useWeatherDisplayStore } from "@/stores/weatherDisplayStore";
import { useWeatherAutoMode } from "@/hooks/map/useWeatherAutoMode";
import MapWeatherEffectsOverlay from "@/components/map/MapWeatherEffectsOverlay";
import { useRadarContact } from "@/hooks/useRadarContact";
import { useRadarStore } from "@/stores/radarStore";
import { useI18n, tSafe } from "@/lib/i18n";
import { Z } from "@/lib/ui/z-index";
import SEOHead from "@/components/SEOHead";
import ErrorBoundary from "@/components/ErrorBoundary";
import { RADAR_CATEGORIES } from "@/lib/taxonomy/world-class-taxonomy";
import { getRadarLayerDefs as getWiringRadarLayers, getRadarCategoryToLayerMap } from "@/lib/taxonomy/wiring-helpers";
import PillarPage from "@/components/layout/PillarPage";

type SortMode = "smart" | "nearest" | "best_rated" | "trending";

const LAYER_DEFS: { id: RadarLayer; labelKey: string; color: string; emoji: string; vertical: RadarVertical }[] = (() => {
  const wiringLayers = getWiringRadarLayers();
  return wiringLayers.map(wl => ({
    id: wl.id as RadarLayer,
    labelKey: wl.labelKey,
    color: wl.color,
    emoji: wl.emoji,
    vertical: wl.id as RadarVertical,
  }));
})();

const SORT_OPTIONS: { value: SortMode; icon: React.ReactNode; labelKey: string }[] = [
  { value: "smart", icon: <Zap className="w-3 h-3" />, labelKey: "radar.sort_smart" },
  { value: "nearest", icon: <Navigation className="w-3 h-3" />, labelKey: "radar.sort_nearest" },
  { value: "best_rated", icon: <Star className="w-3 h-3" />, labelKey: "radar.sort_best" },
  { value: "trending", icon: <TrendingUp className="w-3 h-3" />, labelKey: "radar.sort_trending" },
];

const MAX_VISIBLE_PINS = 80;

const WIRING_CATEGORY_MAP = getRadarCategoryToLayerMap();
const CATEGORY_TO_LAYER: Record<string, RadarLayer> = Object.fromEntries(
  Object.entries(WIRING_CATEGORY_MAP).map(([k, v]) => [k, v as RadarLayer])
);

const LAYER_LABEL_FALLBACKS: Record<string, string> = {
  food: "Food", grocery: "Grocery", shops: "Shops", services: "Services",
  property: "Property", stay: "Stay", utility: "Utility", nightlife: "Nightlife",
  experiences: "Experiences", mobility: "Mobility", healthcare: "Health",
};

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
  const [heatmapEnabled, setHeatmapEnabled] = useState(false);
  const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>("density");
  const [sheetSnap, setSheetSnap] = useState<SnapPoint>("peek");
  const [zoneClick, setZoneClick] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<RadarGeoEntity | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearch = useDeferredValue(searchQuery);
  const radarOverlay = useWeatherDisplayStore(s => s.radarOverlay);
  const { smartNavigate, overlayState, closeOverlay } = useSmartNavigation();
  const { contact: contactEntity } = useRadarContact();
  const merchantStatus = useRadarStore(s => s.merchantStatus);
  const setRadarOverlay = useWeatherDisplayStore(s => s.setRadarOverlay);
  const weather = useLiveWeatherStation({ lat: location?.lat, lng: location?.lng });
  useWeatherAutoMode({
    isRaining: weather.isRaining,
    precipitationMm: weather.precipitationMm,
    windKmh: weather.windKmh,
    weatherCode: weather.weatherCode,
    isDay: weather.isDay,
  });
  const effectsLevel = useWeatherDisplayStore(s => s.effectsLevel);
  const fsmSetSubState = useNavigationStateMachine((s) => s.setPillarSubState);
  const fsmUpdateCtx = useNavigationStateMachine((s) => s.updatePillarContext);

  const activeVertical = useMemo(() => getActiveVertical(activeLayers), [activeLayers]);
  const [filterValues, setFilterValues] = useState<RadarFilterValues>(() =>
    getDefaultFilterValues(activeVertical ?? "shops")
  );
  const [mapMovedCenter, setMapMovedCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [showSearchHere, setShowSearchHere] = useState(false);
  const lastSearchCenter = useRef<{ lat: number; lng: number } | null>(null);
  const [radarAlerts, setRadarAlerts] = useState<RadarDecision[]>([]);
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [mapboxMap, setMapboxMap] = useState<mapboxgl.Map | null>(null);

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

  useEffect(() => {
    const decisionTypes = [
      "radar:decision_weather_alert",
      "radar:decision_surge_pricing",
      "radar:decision_block_zone",
      "radar:decision_demand_alert",
    ];
    const getZoneKey = (d: RadarDecision): string =>
      "zoneKey" in d ? `${d.type}:${d.zoneKey}` : d.type;

    const unsubs: Array<() => void> = [];
    for (const eventType of decisionTypes) {
      const unsub = platformBus.on(eventType, (event) => {
        const decision = event.payload as RadarDecision;
        setRadarAlerts(prev => {
          const key = getZoneKey(decision);
          if (prev.some(a => getZoneKey(a) === key)) return prev;
          return [...prev, decision].slice(-3);
        });
        setTimeout(() => {
          setRadarAlerts(prev => prev.filter(a => a !== decision));
        }, 8000);
      });
      unsubs.push(unsub);
    }
    return () => { unsubs.forEach((unsub) => unsub()); };
  }, []);

  useEffect(() => {
    resetRadarSession();
    trackRadarEvent("search_started", { surface: "radar", viewMode: "map" });
  }, []);

  useEffect(() => {
    const key = urlVertical || urlCategory;
    if (key && CATEGORY_TO_LAYER[key]) {
      setActiveLayers([CATEGORY_TO_LAYER[key]]);
      setSheetSnap("half");
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
      userLat, userLng,
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

    if (filterValues.open_now === true) items = items.filter(i => i.available !== false);
    if (typeof filterValues.rating_min === "number" && (filterValues.rating_min as number) > 0)
      items = items.filter(i => (i.ratingValue ?? 0) >= (filterValues.rating_min as number));
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
    if (filterValues.listing_type && typeof filterValues.listing_type === "string" && filterValues.listing_type !== "")
      items = items.filter(i => {
        const meta = i.meta as Record<string, unknown>;
        return !meta.listingType || meta.listingType === filterValues.listing_type;
      });
    if (filterValues.delivery === true)
      items = items.filter(i => {
        const meta = i.meta as Record<string, unknown>;
        return meta.delivery !== false;
      });

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

  const radarItemsWithStatus = useMemo(() => {
    if (!merchantStatus || Object.keys(merchantStatus).length === 0) return radarItems;
    return radarItems.map(item => {
      const online = merchantStatus[item.id];
      if (online === undefined) return item;
      return { ...item, isOnline: online };
    });
  }, [radarItems, merchantStatus]);

  useEffect(() => {
    trackRadarEvent("search_completed", {
      total: radarItems.length, vertical: activeVertical, sortBy, query: deferredSearch || null,
    });
  }, [radarItems.length, activeVertical, sortBy, deferredSearch]);

  const visibleEntities = useMemo<RadarGeoEntity[]>(() => {
    return radarItemsWithStatus.map(item => ({
      id: item.id,
      type: item.type === "food" ? "restaurant" as const : item.type === "stay" ? "hotel" as const : item.type === "hotel" ? "hotel" as const : item.type === "grocery" ? "grocery" as const : item.type === "property" ? "property" as const : item.type === "healthcare" ? "service" as const : item.type === "mobility" ? "service" as const : item.type === "nightlife" ? "restaurant" as const : item.type === "experiences" ? "service" as const : "shop" as const,
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
      vertical: item.vertical,
      isOnline: item.isOnline,
    }));
  }, [radarItemsWithStatus]);

  const heatmapPoints = useMemo(() => {
    if (!heatmapEnabled) return [];
    const radarPts: RadarPoint[] = visibleEntities.map(e => ({
      id: e.id,
      title: e.name || e.title || "",
      lat: e.lat,
      lng: e.lng,
      category: (e.category || e.type || "all") as RadarCategory,
      rating: e.rating ?? undefined,
      reviewsCount: e.reviewsCount ?? undefined,
      isSponsored: e.isSponsored ?? undefined,
    }));
    return radarPointsToHeatmap(radarPts, heatmapMode);
  }, [visibleEntities, heatmapEnabled, heatmapMode]);

  const handleZoneClick = useCallback((lat: number, lng: number) => {
    setZoneClick({ lat, lng });
    setSelectedEntity(null);
    setSheetSnap("peek");
  }, []);

  const handleSelectEntity = useCallback((entity: GeoEntity) => {
    setSelectedEntity(entity as RadarGeoEntity);
    setZoneClick(null);
    setSheetSnap("peek");
    trackRadarEvent("result_clicked", { entityId: entity.id });
  }, []);

  const handleSelectRadarItem = useCallback((item: RadarResultItem) => {
    const geo: RadarGeoEntity = {
      id: item.id,
      type: item.type === "food" ? "restaurant" : item.type === "stay" ? "hotel" : item.type === "hotel" ? "hotel" : item.type === "grocery" ? "grocery" : item.type === "property" ? "property" : item.type === "healthcare" ? "service" : item.type === "mobility" ? "service" : item.type === "nightlife" ? "restaurant" : item.type === "experiences" ? "service" : "shop",
      name: item.title, title: item.title, subtitle: item.subtitle || undefined,
      lat: item.lat, lng: item.lng,
      imageUrl: item.image || undefined, image_url: item.image || undefined,
      rating: item.ratingValue ?? undefined, category: item.category,
      slug: item.slug || undefined, distance: item.distanceKm ?? undefined,
      isSponsored: item.isSponsored, reviewsCount: item.reviewsCount, vertical: item.vertical,
    };
    setSelectedEntity(geo);
    setZoneClick(null);
    setSheetSnap("peek");
    trackRadarEvent("result_clicked", { entityId: item.id, vertical: item.vertical || item.type, score: item.radarScore });
  }, []);

  const handleNavigateItem = useCallback((item: RadarResultItem) => {
    haptic("medium");
    useInAppNavigation.getState().openNavigation({ lat: item.lat, lng: item.lng, label: item.title || item.address || undefined });
    trackRadarEvent("cta_used", { action: "navigate", entityId: item.id });
  }, []);

  const handleMessageItem = useCallback(async (item: RadarResultItem) => {
    if (!user?.id) { navigate("/login"); return; }
    haptic("light");
    await contactEntity({
      entityId: item.id, entityName: item.title, entityType: item.type,
      autoMessage: `Hi, I found "${item.title}" on Easy-Locs and I'd like to know more.`,
    });
    trackRadarEvent("cta_used", { action: "message", entityId: item.id });
  }, [user?.id, navigate, contactEntity]);

  const handleCategorySelect = useCallback((layer: RadarLayer) => {
    haptic("light");
    setActiveLayers([layer]);
    setSheetSnap("half");
    trackRadarEvent("filter_used", { filter: "category", value: layer });
  }, []);

  const handleSearchHere = useCallback(() => {
    if (mapMovedCenter) {
      useRadarPlaceStore.getState().setSelectedPlace({
        lat: mapMovedCenter.lat, lng: mapMovedCenter.lng, label: "Map area",
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
      if (dlat > 0.005 || dlng > 0.005) setShowSearchHere(true);
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

  const toggleLayer = useCallback((id: RadarLayer) => {
    setActiveLayers(prev => prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]);
  }, []);

  const hour = new Date().getHours();
  const stats = useMemo(() => computeRadarStats(entities.length, visibleEntities), [entities.length, visibleEntities]);

  const handleNightlifeZoneTap = useCallback((lat: number, lng: number) => {
    setZoneClick({ lat, lng });
    setSelectedEntity(null);
    setSheetSnap("peek");
  }, []);

  const sheetBottomOffset = sheetSnap === "peek" ? 84 : sheetSnap === "half" ? "calc(50vh + 12px)" : "calc(85vh + 12px)";

  return (
    <PillarPage noPadding className="h-[100dvh] w-full relative overflow-hidden bg-background">
      <SEOHead
        title={tSafe(t, "radar.seo_title", "Radar — Discover nearby")}
        description={tSafe(t, "radar.seo_desc", "Real-time discovery engine")}
        canonical="https://www.easy-locs.com/radar"
        keywords={tSafe(t, "radar.seo_keywords", "radar, discover, nearby")}
      />

      <ErrorBoundary>
      <div className="absolute inset-0 z-0">
        <UnifiedMap
          entities={visibleEntities}
          showUserLocation
          userLat={mapCenter?.lat ?? location?.lat ?? 25.2}
          userLng={mapCenter?.lng ?? location?.lng ?? 55.27}
          showHeatmap={heatmapEnabled}
          heatmapPoints={heatmapPoints}
          radiusKm={radius}
          showWeatherLayer={radarOverlay !== "off"}
          selectedId={selectedEntity?.id}
          onSelectEntity={handleSelectEntity}
          onZoneClick={handleZoneClick}
          onMapMove={handleMapMove}
          hideWeatherBadge
          onMapReady={setMapboxMap}
        />
        <MapWeatherEffectsOverlay weather={weather} effectsLevel={effectsLevel} />
      </div>

      <NightlifeZonesLayer
        map={mapboxMap}
        entities={visibleEntities}
        onZoneTap={handleNightlifeZoneTap}
        visible={activeLayers.includes("nightlife" as RadarLayer)}
      />

      <motion.div
        className="absolute left-3 right-3"
        style={{ zIndex: Z.overlay, top: "env(safe-area-inset-top, 12px)" }}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-2 pt-2">
          <div className="flex-1">
            <RadarSmartSearch
              onCategorySelect={handleCategorySelect}
              onSearchFilter={setSearchQuery}
              showSearchHere={showSearchHere}
              onSearchHere={handleSearchHere}
            />
          </div>
        </div>
      </motion.div>

      <motion.div
        className="absolute right-3"
        style={{ zIndex: Z.overlay, top: "calc(env(safe-area-inset-top, 12px) + 62px)" }}
        initial={{ opacity: 0, x: 15 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.25 }}
      >
        <WeatherCapsule weather={weather} />
      </motion.div>

      <motion.div
        className="absolute right-3 flex flex-col items-center gap-2"
        style={{ zIndex: Z.overlay, bottom: sheetBottomOffset }}
        initial={{ opacity: 0, x: 15 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
      >
        <FloatingButton
          icon={<Crosshair className="w-4 h-4" />}
          onClick={handleRecenter}
          label="Recenter"
        />
        <FloatingButton
          icon={<Layers className="w-4 h-4" />}
          onClick={() => setShowLayerPanel(prev => !prev)}
          label="Layers"
          active={showLayerPanel}
        />
        <FloatingButton
          icon={<TrendingUp className="w-4 h-4" />}
          onClick={() => setHeatmapEnabled(prev => !prev)}
          label="Heatmap"
          active={heatmapEnabled}
          color={heatmapEnabled ? "hsl(15 80% 55%)" : undefined}
        />
      </motion.div>

      <HeatmapModeSelector
        enabled={heatmapEnabled}
        mode={heatmapMode}
        onModeChange={setHeatmapMode}
        onToggle={() => setHeatmapEnabled(prev => !prev)}
      />

      <AnimatePresence>
        {showLayerPanel && (
          <>
            <div className="fixed inset-0" style={{ zIndex: Z.popover - 1 }} onClick={() => setShowLayerPanel(false)} />
            <motion.div
              className="absolute right-3 rounded-2xl border overflow-hidden w-[240px]"
              style={{
                zIndex: Z.popover,
                bottom: sheetBottomOffset,
                background: "hsl(var(--card) / 0.97)",
                borderColor: "hsl(var(--border) / 0.12)",
                backdropFilter: "blur(20px)",
                boxShadow: "0 12px 40px hsl(var(--background) / 0.4)",
              }}
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{ duration: 0.15 }}
            >
              <div className="p-3 space-y-3">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                    {tSafe(t, "radar.categories", "Categories")}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {LAYER_DEFS.map(layer => {
                      const active = activeLayers.includes(layer.id);
                      return (
                        <button
                          key={layer.id}
                          onClick={() => toggleLayer(layer.id)}
                          className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap border transition-all active:scale-95"
                          style={{
                            background: active ? `${layer.color}18` : "hsl(var(--muted) / 0.3)",
                            borderColor: active ? `${layer.color}35` : "hsl(var(--border) / 0.15)",
                            color: active ? layer.color : "hsl(var(--muted-foreground))",
                          }}
                        >
                          <span className="text-xs">{layer.emoji}</span>
                          {tSafe(t, layer.labelKey, LAYER_LABEL_FALLBACKS[layer.id] ?? layer.id)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                    {tSafe(t, "radar.weather", "Weather")}
                  </p>
                  <button
                    onClick={() => setRadarOverlay(radarOverlay === "off" ? "full" : "off")}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-semibold border transition-all active:scale-95"
                    style={{
                      background: radarOverlay !== "off" ? "hsl(200 70% 50% / 0.12)" : "hsl(var(--muted) / 0.3)",
                      borderColor: radarOverlay !== "off" ? "hsl(200 70% 50% / 0.3)" : "hsl(var(--border) / 0.15)",
                      color: radarOverlay !== "off" ? "hsl(200 70% 60%)" : "hsl(var(--muted-foreground))",
                    }}
                  >
                    <CloudRain className="h-3 w-3" />
                    {radarOverlay !== "off" ? tSafe(t, "radar.radar_on", "Rain Radar On") : tSafe(t, "radar.radar_off", "Rain Radar")}
                  </button>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                    {tSafe(t, "radar.sort", "Sort")}
                  </p>
                  <div className="flex gap-1 flex-wrap">
                    {SORT_OPTIONS.map(s => (
                      <button
                        key={s.value}
                        onClick={() => handleSortChange(s.value)}
                        className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold border transition-all active:scale-95"
                        style={{
                          background: sortBy === s.value ? "hsl(var(--accent) / 0.12)" : "hsl(var(--muted) / 0.3)",
                          borderColor: sortBy === s.value ? "hsl(var(--accent) / 0.3)" : "hsl(var(--border) / 0.15)",
                          color: sortBy === s.value ? "hsl(var(--accent))" : "hsl(var(--muted-foreground))",
                        }}
                      >
                        {s.icon}
                        {tSafe(t, s.labelKey, s.value.replace("_", " "))}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>


      {!loading && radarItems.length === 0 && (
        <div className="absolute inset-0 z-[5] flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-2 px-6 py-4 rounded-2xl bg-card/90 backdrop-blur-md border border-border/15 max-w-[240px] text-center">
            <MapPin className="w-6 h-6 text-muted-foreground/50" />
            <span className="text-xs font-bold text-foreground">{tSafe(t, "radar.no_results", "No results nearby")}</span>
            <span className="text-[10px] text-muted-foreground">{tSafe(t, "radar.no_results_hint", "Try expanding your radius")}</span>
          </div>
        </div>
      )}

      {!selectedEntity && !zoneClick && (
        <SnapBottomSheet
          snap={sheetSnap}
          onSnapChange={setSheetSnap}
          resultCount={radarItems.length}
          peekContent={
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground">
                {loading
                  ? tSafe(t, "radar.loading", "Scanning...")
                  : `${radarItems.length} ${tSafe(t, "radar.places_found", "places nearby")}`
                }
              </span>
              {stats.hotspotCount > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-yellow-500">
                  <Star className="w-2.5 h-2.5" /> {stats.hotspotCount} hotspots
                </span>
              )}
            </div>
          }
        >
          <div className="space-y-3">
            <div className="flex gap-1 overflow-x-auto scrollbar-none">
              {SORT_OPTIONS.map(s => (
                <button
                  key={s.value}
                  onClick={() => handleSortChange(s.value)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-semibold whitespace-nowrap shrink-0 border transition-all active:scale-95"
                  style={{
                    background: sortBy === s.value ? "hsl(var(--accent) / 0.12)" : "hsl(var(--card) / 0.6)",
                    borderColor: sortBy === s.value ? "hsl(var(--accent) / 0.3)" : "hsl(var(--border) / 0.15)",
                    color: sortBy === s.value ? "hsl(var(--accent))" : "hsl(var(--muted-foreground))",
                  }}
                >
                  {s.icon}
                  {tSafe(t, s.labelKey, s.value.replace("_", " "))}
                </button>
              ))}
            </div>

            {activeVertical && (
              <RadarFilters
                vertical={activeVertical}
                values={filterValues}
                onChange={handleFilterChange}
                resultCount={radarItems.length}
              />
            )}

            {loading && (
              <div className="flex flex-col items-center gap-2 py-8">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: "hsl(var(--accent))" }} />
                <p className="text-[10px] text-muted-foreground">{tSafe(t, "radar.loading", "Scanning...")}</p>
              </div>
            )}

            {radarItems.length === 0 && !loading && (
              <div className="flex flex-col items-center gap-2.5 py-12 text-center">
                <MapPin className="w-6 h-6" style={{ color: "hsl(var(--accent) / 0.5)" }} />
                <p className="text-xs font-bold text-foreground">{tSafe(t, "radar.no_results", "No results nearby")}</p>
                <p className="text-[10px] text-muted-foreground max-w-[200px]">{tSafe(t, "radar.no_results_hint", "Try expanding your radius or changing filters")}</p>
              </div>
            )}

            <div className="space-y-1.5">
              {radarItemsWithStatus.map((item, idx) => (
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
          </div>
        </SnapBottomSheet>
      )}

      <AnimatePresence>
        {selectedEntity && (
          <RadarEntitySheet
            entity={selectedEntity}
            onClose={() => { setSelectedEntity(null); setSheetSnap("peek"); }}
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
            onClose={() => { setZoneClick(null); setSheetSnap("peek"); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {radarAlerts.length > 0 && (
          <motion.div
            className="absolute left-3 right-3 flex flex-col gap-1.5 pointer-events-none"
            style={{ zIndex: Z.overlay + 2, top: "calc(env(safe-area-inset-top, 12px) + 110px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {radarAlerts.map((alert, idx) => (
              <RadarDecisionAlertBanner key={`${alert.type}-${idx}`} decision={alert} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <PillarOverlayHost
        activeOverlay={overlayState.activeOverlay}
        overlayRoute={overlayState.overlayRoute}
        overlayContext={overlayState.overlayContext}
        onClose={closeOverlay}
      />
      </ErrorBoundary>
    </PillarPage>
  );
}

function FloatingButton({ icon, onClick, label, active, color }: {
  icon: React.ReactNode;
  onClick: () => void;
  label: string;
  active?: boolean;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="w-11 h-11 rounded-full flex items-center justify-center active:scale-90 transition-all"
      style={{
        background: "hsl(var(--card) / 0.95)",
        border: active ? `1.5px solid ${color || "hsl(var(--accent))"}` : "1px solid hsl(var(--border) / 0.15)",
        backdropFilter: "blur(12px)",
        boxShadow: "0 4px 16px hsl(var(--background) / 0.3)",
        color: active ? (color || "hsl(var(--accent))") : "hsl(var(--foreground))",
      }}
    >
      {icon}
    </button>
  );
}

function RadarDecisionAlertBanner({ decision }: { decision: RadarDecision }) {
  let icon = "⚡";
  let label = "";

  if (decision.type === "weather_alert") {
    const isSevere = decision.weatherType === "flood" || decision.weatherType === "storm";
    icon = isSevere ? "🌩️" : "🌧️";
    label = decision.severity === "critical"
      ? `⚠️ Severe ${decision.weatherType} — zone may be restricted`
      : `Rain detected — delays possible`;
  } else if (decision.type === "surge_pricing") {
    icon = "💰";
    label = `High demand — ${Math.round((decision.multiplier - 1) * 100)}% surge pricing active`;
  } else if (decision.type === "block_zone") {
    icon = "🚫";
    label = `Zone restricted: ${decision.reason}`;
  } else if (decision.type === "demand_alert") {
    icon = "📈";
    label = `Demand rising — ${decision.trend} trend in this area`;
  }

  if (!label) return null;

  const bgStyle = decision.type === "block_zone" || (decision.type === "weather_alert" && decision.severity === "critical")
    ? { background: "hsl(0 70% 55% / 0.15)", border: "1px solid hsl(0 70% 55% / 0.3)" }
    : decision.type === "surge_pricing"
      ? { background: "hsl(var(--accent) / 0.15)", border: "1px solid hsl(var(--accent) / 0.3)" }
      : decision.type === "demand_alert"
        ? { background: "hsl(160 60% 45% / 0.15)", border: "1px solid hsl(160 60% 45% / 0.3)" }
        : { background: "hsl(200 70% 50% / 0.15)", border: "1px solid hsl(200 70% 50% / 0.3)" };

  return (
    <motion.div
      className="flex items-center gap-2 px-3 py-2 rounded-xl backdrop-blur-md pointer-events-auto"
      style={bgStyle}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
    >
      <span className="text-sm shrink-0">{icon}</span>
      <span className="text-[11px] font-semibold text-foreground leading-snug">{label}</span>
    </motion.div>
  );
}
