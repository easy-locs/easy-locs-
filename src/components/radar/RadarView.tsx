/**
 * RadarView — Premium discovery hub with clustered map, rich pins, radius circle,
 * advanced filters (rating, promoted), and smart ranking.
 */
import { useState, useCallback, useMemo, memo } from "react";
import { useNavigate } from "react-router-dom";
import { useRadarResults } from "@/hooks/useRadarResults";
import UnifiedMap from "@/components/map/UnifiedMap";
import { formatGeoDistance, formatGeoETA, type SortMode } from "@/lib/geo/geoRanking";
import type { GeoEntity } from "@/lib/geo/geoEntityAdapter";
import { useDiscoveryStore } from "@/stores/discoveryStore";
import {
  MapPin, List, Star, Navigation, Flame, Filter,
  TrendingUp, Zap, ChevronDown,
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

const SORT_OPTIONS: { label: string; value: SortMode; icon: React.ReactNode }[] = [
  { label: "Nearest", value: "nearest", icon: <Navigation className="w-3 h-3" /> },
  { label: "Top Rated", value: "best_rated", icon: <Star className="w-3 h-3" /> },
  { label: "Trending", value: "trending", icon: <TrendingUp className="w-3 h-3" /> },
];

const RADIUS_PRESETS = [1, 3, 5, 10, 20];

const RATING_FILTERS = [
  { label: "Any", value: 0 },
  { label: "3+", value: 3 },
  { label: "4+", value: 4 },
  { label: "4.5+", value: 4.5 },
];

/* ═══ Component ═══ */

interface RadarViewProps {
  initialType?: GeoEntity["type"];
  radiusKm?: number;
  showMap?: boolean;
}

export default memo(function RadarView({ initialType, radiusKm: initialRadius, showMap = true }: RadarViewProps) {
  const navigate = useNavigate();
  const [activeType, setActiveType] = useState<GeoEntity["type"] | "all">(initialType || "all");
  const [sortBy, setSortBy] = useState<SortMode>("nearest");
  const [viewMode, setViewMode] = useState<"map" | "list" | "heatmap">(showMap ? "map" : "list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [minRating, setMinRating] = useState(0);
  const [showPromotedOnly, setShowPromotedOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Radius from global discovery store
  const globalRadius = useDiscoveryStore((s) => s.radiusKm);
  const setGlobalRadius = useDiscoveryStore((s) => s.setRadiusKm);
  const activeRadius = initialRadius ?? globalRadius ?? 10;

  const type = activeType === "all" ? undefined : activeType;
  const { entities: rawResults, loading, location } = useRadarResults({ type, radiusKm: activeRadius });
  const userLat = location?.lat ?? 25.2;
  const userLng = location?.lng ?? 55.27;

  // ── Client-side filters (rating, promoted) ──
  const results = useMemo(() => {
    let filtered = rawResults;

    if (minRating > 0) {
      filtered = filtered.filter(e => (e.rating ?? 0) >= minRating);
    }

    if (showPromotedOnly) {
      filtered = filtered.filter(e => (e as any).isSponsored);
    }

    return filtered;
  }, [rawResults, minRating, showPromotedOnly]);

  const handleSelect = useCallback((entity: GeoEntity) => {
    setSelectedId(entity.id);
  }, []);

  const handleOpen = useCallback((entity: GeoEntity) => {
    navigate(entity.route_path || `/s/${entity.slug || entity.id}`);
  }, [navigate]);

  const selected = results.find(e => e.id === selectedId);

  // ── Heatmap points with real intensity ──
  const heatmapPoints = useMemo(() => {
    return results.map(e => ({
      lat: e.lat,
      lng: e.lng,
      intensity: Math.min(1, ((e.rating ?? 3) / 5) * 0.5 + 0.3 + (((e as any).reviewsCount ?? 0) > 10 ? 0.2 : 0)),
    }));
  }, [results]);

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
                : "bg-muted text-muted-foreground"
            )}
          >
            {f.icon} {f.label}
          </button>
        ))}
      </div>

      {/* ── Controls row ── */}
      <div className="flex items-center justify-between px-4 py-1 shrink-0 gap-2">
        {/* Sort options */}
        <div className="flex gap-1 shrink-0">
          {SORT_OPTIONS.map(s => (
            <button
              key={s.value}
              onClick={() => setSortBy(s.value)}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all",
                sortBy === s.value
                  ? "bg-primary/12 text-primary"
                  : "text-muted-foreground"
              )}
            >
              {s.icon}
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          {/* Filters toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "p-1.5 rounded-lg transition-all",
              showFilters ? "bg-primary/12 text-primary" : "text-muted-foreground"
            )}
          >
            <Filter className="w-3.5 h-3.5" />
          </button>

          {/* View mode toggle */}
          <div className="flex rounded-lg p-0.5 bg-muted">
            <button
              onClick={() => setViewMode("map")}
              className={cn("p-1.5 rounded-md transition-all", viewMode === "map" ? "bg-background shadow-sm" : "")}
            >
              <MapPin className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn("p-1.5 rounded-md transition-all", viewMode === "list" ? "bg-background shadow-sm" : "")}
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("heatmap")}
              className={cn("p-1.5 rounded-md transition-all", viewMode === "heatmap" ? "bg-background shadow-sm" : "")}
            >
              <Flame className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Advanced filters panel ── */}
      {showFilters && (
        <div className="px-4 py-2 space-y-2 shrink-0 animate-in slide-in-from-top-2 duration-150">
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
                    : "bg-muted text-muted-foreground"
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
                    : "bg-muted text-muted-foreground"
                )}
              >
                {r.value > 0 && <Star className="w-2.5 h-2.5" />}
                {r.label}
              </button>
            ))}
          </div>

          {/* Promoted toggle */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-muted-foreground w-12 shrink-0">Show</span>
            <button
              onClick={() => setShowPromotedOnly(!showPromotedOnly)}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all",
                showPromotedOnly
                  ? "bg-amber-500/20 text-amber-500"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <Zap className="w-2.5 h-2.5" />
              Promoted only
            </button>
          </div>
        </div>
      )}

      {/* ── Results count ── */}
      <div className="px-4 py-1 shrink-0">
        <p className="text-[10px] text-muted-foreground">
          {loading ? "Scanning…" : `${results.length} places within ${activeRadius}km`}
          {minRating > 0 && ` · ${minRating}★+`}
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
                className="absolute bottom-4 left-4 right-4 rounded-2xl p-3 flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-200"
                style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", boxShadow: "0 8px 32px rgba(0,0,0,0.25)" }}
              >
                {selected.image_url || selected.imageUrl ? (
                  <img src={(selected.image_url || selected.imageUrl)!} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 bg-muted">
                    <span className="text-xl">📍</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate text-foreground">{selected.title || selected.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {selected.rating != null && selected.rating > 0 && (
                      <span className="flex items-center gap-0.5 text-[10px] font-semibold">
                        <Star className="w-2.5 h-2.5" style={{ color: "hsl(45 90% 55%)", fill: "hsl(45 90% 55%)" }} />
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
                <button
                  onClick={() => handleOpen(selected)}
                  className="px-4 py-2 rounded-xl text-xs font-bold shrink-0 active:scale-95 bg-primary text-primary-foreground"
                >
                  Open
                </button>
              </div>
            )}
          </div>
        ) : (
          /* ── List view ── */
          <div className="h-full overflow-y-auto px-4 pb-24 space-y-2">
            {results.length === 0 && !loading && (
              <div className="text-center py-12">
                <span className="text-3xl">📡</span>
                <p className="text-sm text-muted-foreground mt-2">No results nearby</p>
              </div>
            )}
            {results.map((entity) => (
              <button
                key={entity.id}
                onClick={() => handleOpen(entity)}
                className="w-full rounded-2xl p-3 flex items-center gap-3 active:scale-[0.98] transition-transform text-left bg-card hover:bg-muted/50"
                style={{ border: "1px solid hsl(var(--border) / 0.15)" }}
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
                      <Zap className="w-3 h-3 shrink-0 text-amber-500" />
                    )}
                  </div>
                  {entity.subtitle && <p className="text-[11px] text-muted-foreground truncate">{entity.subtitle}</p>}
                  <div className="flex items-center gap-2 mt-0.5">
                    {entity.rating != null && entity.rating > 0 && (
                      <span className="flex items-center gap-0.5 text-[10px] font-semibold">
                        <Star className="w-2.5 h-2.5" style={{ color: "hsl(45 90% 55%)", fill: "hsl(45 90% 55%)" }} />
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
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
