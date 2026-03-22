/**
 * RadarView — Nearby entity discovery with map + list toggle + filters.
 */
import { useState, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import { useRadarResults } from "@/hooks/useRadarResults";
import UnifiedMap from "@/components/map/UnifiedMap";
import { formatGeoDistance, formatGeoETA, type SortMode } from "@/lib/geo/geoRanking";
import type { GeoEntity } from "@/lib/geo/geoEntityAdapter";
import { MapPin, List, Star, Navigation } from "lucide-react";

const TYPE_FILTERS: { label: string; value: GeoEntity["type"] | "all"; icon: string }[] = [
  { label: "All", value: "all", icon: "🌐" },
  { label: "Food", value: "restaurant", icon: "🍽️" },
  { label: "Shops", value: "shop", icon: "🛍️" },
  { label: "Property", value: "property", icon: "🏠" },
  { label: "Services", value: "service", icon: "🔧" },
];

const SORT_OPTIONS: { label: string; value: SortMode }[] = [
  { label: "Nearest", value: "nearest" },
  { label: "Best rated", value: "best_rated" },
  { label: "Trending", value: "trending" },
];

interface RadarViewProps {
  initialType?: GeoEntity["type"];
  radiusKm?: number;
  showMap?: boolean;
}

export default memo(function RadarView({ initialType, radiusKm = 20, showMap = true }: RadarViewProps) {
  const navigate = useNavigate();
  const [activeType, setActiveType] = useState<GeoEntity["type"] | "all">(initialType || "all");
  const [sortBy, setSortBy] = useState<SortMode>("nearest");
  const [viewMode, setViewMode] = useState<"map" | "list">(showMap ? "map" : "list");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const type = activeType === "all" ? undefined : activeType;
  const { entities: results, loading: radarLoading, location } = useRadarResults({ type, radiusKm });
  const userLat = location?.lat ?? 25.2;
  const userLng = location?.lng ?? 55.27;

  const handleSelect = useCallback((entity: GeoEntity) => {
    setSelectedId(entity.id);
  }, []);

  const handleOpen = useCallback((entity: GeoEntity) => {
    navigate(entity.route_path || `/s/${entity.slug || entity.id}`);
  }, [navigate]);

  const selected = results.find(e => e.id === selectedId);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Filter chips */}
      <div className="flex gap-1.5 overflow-x-auto px-4 py-2 scrollbar-hide shrink-0">
        {TYPE_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setActiveType(f.value as any)}
            className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap active:scale-95 transition-all"
            style={{
              background: activeType === f.value ? "hsl(var(--primary))" : "hsl(var(--muted))",
              color: activeType === f.value ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))",
            }}
          >
            {f.icon} {f.label}
          </button>
        ))}
      </div>

      {/* Sort + view toggle */}
      <div className="flex items-center justify-between px-4 py-1 shrink-0">
        <div className="flex gap-1">
          {SORT_OPTIONS.map(s => (
            <button
              key={s.value}
              onClick={() => setSortBy(s.value)}
              className="px-2 py-1 rounded-lg text-[10px] font-semibold"
              style={{
                background: sortBy === s.value ? "hsl(var(--primary) / 0.12)" : "transparent",
                color: sortBy === s.value ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-lg p-0.5" style={{ background: "hsl(var(--muted))" }}>
          <button onClick={() => setViewMode("map")} className="p-1.5 rounded-md" style={{ background: viewMode === "map" ? "hsl(var(--background))" : "transparent" }}>
            <MapPin className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setViewMode("list")} className="p-1.5 rounded-md" style={{ background: viewMode === "list" ? "hsl(var(--background))" : "transparent" }}>
            <List className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 relative">
        {viewMode === "map" ? (
          <div className="h-full px-4 pb-2">
            <UnifiedMap
              entities={results}
              userLat={userLat}
              userLng={userLng}
              selectedId={selectedId}
              onSelectEntity={handleSelect}
              className="h-full"
            />
            {/* Selected entity bottom card */}
            {selected && (
              <div
                className="absolute bottom-4 left-4 right-4 rounded-2xl p-3 flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-200"
                style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}
              >
                {selected.image_url ? (
                  <img src={selected.image_url} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "hsl(var(--muted))" }}>
                    <span className="text-xl">📍</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{selected.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {selected.rating != null && (
                      <span className="flex items-center gap-0.5 text-[10px]">
                        <Star className="w-2.5 h-2.5" style={{ color: "hsl(45 90% 55%)", fill: "hsl(45 90% 55%)" }} />
                        {selected.rating.toFixed(1)}
                      </span>
                    )}
                    {selected.distance != null && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Navigation className="w-2.5 h-2.5" />{formatGeoDistance(selected.distance)}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleOpen(selected)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 active:scale-95"
                  style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
                >
                  Open
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full overflow-y-auto px-4 pb-24 space-y-2">
            {results.length === 0 && (
              <div className="text-center py-12">
                <span className="text-3xl">📡</span>
                <p className="text-sm text-muted-foreground mt-2">No results nearby</p>
              </div>
            )}
            {results.map((entity) => (
              <button
                key={entity.id}
                onClick={() => handleOpen(entity)}
                className="w-full rounded-2xl p-3 flex items-center gap-3 active:scale-[0.98] transition-transform text-left"
                style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border) / 0.2)" }}
              >
                {entity.image_url ? (
                  <img src={entity.image_url} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" loading="lazy" />
                ) : (
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0" style={{ background: "hsl(var(--muted))" }}>
                    <span className="text-xl">📍</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{entity.title}</p>
                  {entity.subtitle && <p className="text-[11px] text-muted-foreground truncate">{entity.subtitle}</p>}
                  <div className="flex items-center gap-2 mt-0.5">
                    {entity.rating != null && (
                      <span className="flex items-center gap-0.5 text-[10px]">
                        <Star className="w-2.5 h-2.5" style={{ color: "hsl(45 90% 55%)", fill: "hsl(45 90% 55%)" }} />
                        {entity.rating.toFixed(1)}
                      </span>
                    )}
                    {entity.distance != null && (
                      <span className="text-[10px] text-muted-foreground">{formatGeoDistance(entity.distance)}</span>
                    )}
                    {entity.distance != null && (
                      <span className="text-[10px] text-muted-foreground">{formatGeoETA(entity.distance)}</span>
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
