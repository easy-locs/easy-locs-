/**
 * RadarView — Premium discovery hub with clustered map, rich pins, radius circle,
 * advanced filters (rating, promoted, open now), smart ranking,
 * and real-time live layers (weather, traffic, demand, zone events).
 */
import { useState, useCallback, useMemo, memo, useEffect } from "react";
import { BoostSlotRenderer } from "@/components/boost/BoostSlotRenderer";
import { useNavigate } from "react-router-dom";
import { useRadarResults } from "@/hooks/useRadarResults";
import { useRadarLiveContext, type RadarMode } from "@/hooks/useRadarLiveContext";
import {
  LayerToggleBar, WeatherOverlay, TrafficOverlay, ZoneEventAlerts,
  DemandPredictionCard, RiderSupplyChip, DEFAULT_LAYERS,
  type LayerToggles,
} from "@/components/radar/RadarLiveLayers";
import { predictDemand } from "@/lib/radar/predictive-demand-engine";
import { contactFromDiscovery } from "@/lib/radar/contactBridge";
import { eventBus } from "@/lib/events/eventBus";
import UnifiedMap from "@/components/map/UnifiedMap";
import { formatGeoDistance, formatGeoETA, type SortMode } from "@/lib/geo/geoRanking";
import type { GeoEntity } from "@/lib/geo/geoEntityAdapter";
import { useDiscoveryStore } from "@/stores/discoveryStore";
import { rankEntities, DISCOVERY_WEIGHTS, type RankableEntity, type RankContext } from "@/lib/ranking-engine";
import { useCanonicalUI } from "@/hooks/useCanonicalUI";
import { useV2AuthStore } from "@/stores/v2AuthStore";
import {
  MapPin, List, Star, Navigation, Flame, Filter,
  TrendingUp, Zap, ChevronDown, Clock, SlidersHorizontal, MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ═══ Constants ═══ */

const TYPE_FILTERS: { label: string; value: GeoEntity["type"] | "all"; icon: string }[] = [
  { label: "All", value: "all", icon: "🌐" },
  { label: "Food", value: "restaurant", icon: "🍽️" },
  { label: "Shops", value: "shop", icon: "🛍️" },
  { label: "Grocery", value: "grocery", icon: "🛒" },
  { label: "Property", value: "property", icon: "🏠" },
  { label: "Services", value: "service", icon: "🔧" },
];

type RadarSortMode = "smart" | "nearest" | "best_rated" | "trending";

const SORT_OPTIONS: { label: string; value: RadarSortMode; icon: React.ReactNode }[] = [
  { label: "Smart", value: "smart", icon: <Zap className="w-3 h-3" /> },
  { label: "Nearest", value: "nearest", icon: <Navigation className="w-3 h-3" /> },
  { label: "Top Rated", value: "best_rated", icon: <Star className="w-3 h-3" /> },
  { label: "Trending", value: "trending", icon: <TrendingUp className="w-3 h-3" /> },
];

const RADIUS_PRESETS = [1, 3, 5, 10, 25];

const RATING_FILTERS = [
  { label: "Any", value: 0 },
  { label: "3+", value: 3 },
  { label: "4+", value: 4 },
  { label: "4.5+", value: 4.5 },
];

/* ═══ Helpers ═══ */

/** Bridge GeoEntity to RankableEntity for the unified ranking engine */
function toRankable(e: GeoEntity & { isSponsored?: boolean; reviewsCount?: number }): RankableEntity {
  return {
    id: e.id,
    entityType: "business",
    vertical: e.type,
    subcategory: e.category,
    rating: e.rating,
    reviewCount: e.reviewsCount,
    lat: e.lat,
    lng: e.lng,
    isSponsored: e.isSponsored,
    title: e.title || e.name,
    profileScore: (e.imageUrl || e.image_url ? 0.3 : 0) + (e.rating ? 0.3 : 0) + (e.subtitle ? 0.2 : 0) + (e.category ? 0.2 : 0),
  };
}

/* ═══ Component ═══ */

interface RadarViewProps {
  initialType?: GeoEntity["type"];
  radiusKm?: number;
  showMap?: boolean;
}

export default memo(function RadarView({ initialType, radiusKm: initialRadius, showMap = true }: RadarViewProps) {
  const navigate = useNavigate();
  const [activeType, setActiveType] = useState<GeoEntity["type"] | "all">(initialType || "all");
  const [sortBy, setSortBy] = useState<RadarSortMode>("smart");
  const [viewMode, setViewMode] = useState<"map" | "list" | "heatmap">(showMap ? "map" : "list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [minRating, setMinRating] = useState(0);
  const [showPromotedOnly, setShowPromotedOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const currentUser = useV2AuthStore((s) => s.user);

  // Canonical UI for active vertical
  const activeVertical = activeType === "all" ? undefined : activeType === "restaurant" ? "food" : activeType === "shop" ? "shops" : activeType === "grocery" ? "grocery" : activeType === "property" ? "property" : activeType === "service" ? "services" : undefined;
  const canonicalUI = useCanonicalUI(activeVertical);

  // Radius from global discovery store
  const globalRadius = useDiscoveryStore((s) => s.radiusKm);
  const setGlobalRadius = useDiscoveryStore((s) => s.setRadiusKm);
  const activeRadius = initialRadius ?? globalRadius ?? 10;

  const type = activeType === "all" ? undefined : activeType;
  const { entities: rawResults, loading, location } = useRadarResults({ type, radiusKm: activeRadius });
  const userLat = location?.lat ?? 25.2;
  const userLng = location?.lng ?? 55.27;

  // ── Filters + Ranking ──
  const results = useMemo(() => {
    let filtered = rawResults;

    // Rating filter
    if (minRating > 0) {
      filtered = filtered.filter(e => (e.rating ?? 0) >= minRating);
    }

    // Promoted filter
    if (showPromotedOnly) {
      filtered = filtered.filter(e => (e as any).isSponsored);
    }

    // ── Apply ranking engine for "smart" mode ──
    if (sortBy === "smart") {
      const rankables = filtered.map(toRankable);
      const ctx: RankContext = {
        userLat,
        userLng,
        targetVertical: activeType !== "all" ? activeType : undefined,
      };
      const ranked = rankEntities(rankables, ctx, DISCOVERY_WEIGHTS);
      // Re-order filtered by ranked order
      const idOrder = new Map(ranked.map((r, i) => [r.id, i]));
      return [...filtered].sort((a, b) => (idOrder.get(a.id) ?? 999) - (idOrder.get(b.id) ?? 999));
    }

    // Basic sort modes
    if (sortBy === "nearest") {
      return [...filtered].sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));
    }
    if (sortBy === "best_rated") {
      return [...filtered].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    }
    if (sortBy === "trending") {
      return [...filtered].sort((a, b) => {
        const aS = ((a as any).isSponsored ? 50 : 0) + ((a as any).reviewsCount ?? 0) * 0.5 + (a.rating ?? 0) * 5;
        const bS = ((b as any).isSponsored ? 50 : 0) + ((b as any).reviewsCount ?? 0) * 0.5 + (b.rating ?? 0) * 5;
        return bS - aS;
      });
    }

    return filtered;
  }, [rawResults, minRating, showPromotedOnly, sortBy, userLat, userLng, activeType]);

  // Emit scan completed event when results change
  useEffect(() => {
    if (!loading && rawResults.length > 0) {
      eventBus.emit("RADAR_SCAN_COMPLETED", {
        count: results.length,
        radiusKm: activeRadius,
        lat: userLat,
        lng: userLng,
      });
    }
  }, [loading, results.length, activeRadius, userLat, userLng]);

  const handleSelect = useCallback((entity: GeoEntity) => {
    setSelectedId(entity.id);
  }, []);

  const handleOpen = useCallback((entity: GeoEntity) => {
    eventBus.emit("ENTITY_OPENED", { id: entity.id, type: entity.type, source: "radar" });
    navigate(entity.route_path || `/s/${entity.slug || entity.id}`);
  }, [navigate]);

  const handleContact = useCallback((entity: GeoEntity) => {
    if (!currentUser?.id) return;
    contactFromDiscovery({
      currentUserId: currentUser.id,
      entityId: entity.id,
      entityType: "shop",
      entityName: entity.title || entity.name || "",
      navigate,
      source: "radar",
      autoMessage: `Hi, I found your business "${entity.title || entity.name}" on the platform and I'd like to know more.`,
    });
  }, [currentUser?.id, navigate]);

  const selected = results.find(e => e.id === selectedId);

  // ── Heatmap points with real intensity ──
  const heatmapPoints = useMemo(() => {
    const maxReviews = Math.max(1, ...results.map(e => (e as any).reviewsCount ?? 0));
    return results.map(e => ({
      lat: e.lat,
      lng: e.lng,
      intensity: Math.min(1,
        ((e.rating ?? 3) / 5) * 0.4 +
        (((e as any).reviewsCount ?? 0) / maxReviews) * 0.35 +
        ((e as any).isSponsored ? 0.15 : 0) +
        0.1
      ),
    }));
  }, [results]);

  const activeFilterCount = (minRating > 0 ? 1 : 0) + (showPromotedOnly ? 1 : 0) + (activeRadius !== 10 ? 1 : 0);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── Category chips ── */}
      <div className="flex gap-1.5 overflow-x-auto px-4 py-2 scrollbar-hide shrink-0">
        {TYPE_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setActiveType(f.value as any)}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap active:scale-95 transition-all",
              activeType === f.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {f.icon} {f.label}
          </button>
        ))}
      </div>

      {/* ── Controls row ── */}
      <div className="flex items-center justify-between px-4 py-1 shrink-0 gap-2">
        {/* Sort options */}
        <div className="flex gap-0.5 shrink-0">
          {SORT_OPTIONS.map(s => (
            <button
              key={s.value}
              onClick={() => setSortBy(s.value)}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all",
                sortBy === s.value
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {s.icon}
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          {/* Filters toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-1 p-1.5 rounded-lg transition-all",
              showFilters ? "bg-primary/15 text-primary" : "text-muted-foreground"
            )}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* View mode toggle */}
          <div className="flex rounded-lg p-0.5 bg-muted">
            {([
              { mode: "map" as const, icon: <MapPin className="w-3.5 h-3.5" /> },
              { mode: "list" as const, icon: <List className="w-3.5 h-3.5" /> },
              { mode: "heatmap" as const, icon: <Flame className="w-3.5 h-3.5" /> },
            ]).map(v => (
              <button
                key={v.mode}
                onClick={() => setViewMode(v.mode)}
                className={cn("p-1.5 rounded-md transition-all", viewMode === v.mode ? "bg-background shadow-sm text-foreground" : "text-muted-foreground")}
              >
                {v.icon}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Advanced filters panel ── */}
      {showFilters && (
        <div className="px-4 py-2 space-y-2 shrink-0 animate-in slide-in-from-top-2 duration-150 border-b border-border/30">
          {/* Radius */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-muted-foreground w-12 shrink-0">Radius</span>
            {RADIUS_PRESETS.map(r => (
              <button
                key={r}
                onClick={() => setGlobalRadius(r)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all",
                  activeRadius === r
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {r}km
              </button>
            ))}
          </div>

          {/* Rating filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-muted-foreground w-12 shrink-0">Rating</span>
            {RATING_FILTERS.map(r => (
              <button
                key={r.value}
                onClick={() => setMinRating(r.value)}
                className={cn(
                  "flex items-center gap-0.5 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all",
                  minRating === r.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {r.value > 0 && <Star className="w-2.5 h-2.5" />}
                {r.label}
              </button>
            ))}
          </div>

          {/* Promoted toggle — hidden until sponsored data exists */}
          {results.some((e: any) => e.isSponsored) && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-muted-foreground w-12 shrink-0">Show</span>
              <button
                onClick={() => setShowPromotedOnly(!showPromotedOnly)}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all",
                  showPromotedOnly
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                <Zap className="w-2.5 h-2.5" />
                Promoted only
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Results count — canonical wording ── */}
      <div className="px-4 py-1 shrink-0">
        <p className="text-[10px] text-muted-foreground">
          {loading ? canonicalUI.wording.loadingText : canonicalUI.wording.resultsFormat.replace("{count}", String(results.length))}
          {!loading && ` within ${activeRadius}km`}
          {minRating > 0 && ` · ★${minRating}+`}
          {showPromotedOnly && " · ⚡ Promoted"}
          {sortBy === "smart" && " · Smart ranked"}
        </p>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 min-h-0 relative">
        {(viewMode === "map" || viewMode === "heatmap") ? (
          <div className="h-full px-4 pb-2">
            <UnifiedMap
              entities={results}
              userLat={userLat}
              userLng={userLng}
              selectedId={selectedId}
              onSelectEntity={handleSelect}
              showHeatmap={viewMode === "heatmap"}
              heatmapPoints={heatmapPoints}
              radiusKm={activeRadius}
              className="h-full"
            />
            {/* Selected entity card */}
            {selected && (
              <div
                className="absolute bottom-4 left-4 right-4 rounded-2xl p-3 flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-200 bg-card border border-border/50"
                style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}
              >
                {selected.image_url || selected.imageUrl ? (
                  <img src={(selected.image_url || selected.imageUrl)!} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 bg-muted">
                    <span className="text-xl">📍</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold truncate text-foreground">{selected.title || selected.name}</p>
                    {(selected as any).isSponsored && (
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-500/20 text-amber-400">⚡</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {selected.rating != null && selected.rating > 0 && (
                      <span className="flex items-center gap-0.5 text-[10px] font-semibold text-amber-400">
                        <Star className="w-2.5 h-2.5 fill-current" />
                        {selected.rating.toFixed(1)}
                      </span>
                    )}
                    {selected.distance != null && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Navigation className="w-2.5 h-2.5" />{formatGeoDistance((selected.distance ?? 0) * 1000)}
                      </span>
                    )}
                    {selected.category && (
                      <span className="text-[10px] text-muted-foreground capitalize">{selected.category}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {currentUser?.id && (
                    <button
                      onClick={() => handleContact(selected)}
                      className="p-2 rounded-xl active:scale-95 bg-muted text-foreground"
                      title="Chat"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleOpen(selected)}
                    className="px-4 py-2 rounded-xl text-xs font-bold active:scale-95 bg-primary text-primary-foreground"
                  >
                    Open
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ── List view ── */
          <div className="h-full overflow-y-auto px-4 pb-24 space-y-2">
            {/* ═══ BOOST SLOT — Radar Top ═══ */}
            <BoostSlotRenderer surface="radar" slotKey="hero_primary" variant="inline" className="mb-2" />

            {results.length === 0 && !loading && (
              <div className="text-center py-12">
                <span className="text-3xl">{canonicalUI.emoji}</span>
                <p className="text-sm font-semibold text-foreground mt-2">{canonicalUI.wording.emptyTitle}</p>
                <p className="text-xs text-muted-foreground mt-1">{canonicalUI.wording.emptySubtitle}</p>
              </div>
            )}
            {results.map((entity, idx) => (
              <button
                key={entity.id}
                onClick={() => handleOpen(entity)}
                className={cn(
                  "w-full rounded-2xl p-3 flex items-center gap-3 active:scale-[0.98] transition-transform text-left bg-card border border-border/10",
                  (entity as any).isSponsored && "border-amber-500/20"
                )}
              >
                {(entity.image_url || entity.imageUrl) ? (
                  <img
                    src={(entity.image_url || entity.imageUrl)!}
                    alt=""
                    className="w-14 h-14 rounded-xl object-cover shrink-0"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 bg-muted">
                    <span className="text-xl">📍</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold truncate text-foreground">{entity.title || entity.name}</p>
                    {(entity as any).isSponsored && (
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-500/20 text-amber-400 shrink-0">⚡</span>
                    )}
                  </div>
                  {entity.subtitle && <p className="text-[11px] text-muted-foreground truncate">{entity.subtitle}</p>}
                  <div className="flex items-center gap-2 mt-0.5">
                    {entity.rating != null && entity.rating > 0 && (
                      <span className="flex items-center gap-0.5 text-[10px] font-semibold text-amber-400">
                        <Star className="w-2.5 h-2.5 fill-current" />
                        {entity.rating.toFixed(1)}
                      </span>
                    )}
                    {entity.distance != null && (
                      <span className="text-[10px] text-muted-foreground">{formatGeoDistance((entity.distance ?? 0) * 1000)}</span>
                    )}
                    {entity.distance != null && (
                      <span className="text-[10px] text-muted-foreground">{formatGeoETA((entity.distance ?? 0) * 1000)}</span>
                    )}
                    {entity.category && (
                      <span className="text-[10px] text-muted-foreground capitalize">{entity.category}</span>
                    )}
                  </div>
                </div>
                {/* Rank indicator for top 3 */}
                {idx < 3 && sortBy === "smart" && (
                  <span className="w-6 h-6 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
