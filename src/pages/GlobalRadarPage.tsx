/**
 * GlobalRadarPage — Unified ecosystem discovery page.
 * Replaces both Explore and old Radar. Route: /radar
 * Contains: search, category filters, map/list toggle, all entities.
 */
import { useState, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import { useRadarResults } from "@/hooks/useRadarResults";
import UnifiedMap from "@/components/map/UnifiedMap";
import { formatGeoDistance, formatGeoETA, type SortMode } from "@/lib/geo/geoRanking";
import type { GeoEntity } from "@/lib/geo/geoEntityAdapter";
import {
  MapPin, List, Star, Navigation, Search, X, SlidersHorizontal,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import foodImg from "@/assets/categories/food.png";
import shopsImg from "@/assets/categories/shops.png";
import groceryImg from "@/assets/categories/grocery.png";
import servicesImg from "@/assets/categories/services.png";
import propertyImg from "@/assets/categories/property.png";
import taxiImg from "@/assets/categories/taxi.png";
import staysImg from "@/assets/categories/stays.png";
import deliveryImg from "@/assets/categories/delivery.png";

const TYPE_FILTERS: { label: string; value: GeoEntity["type"] | "all"; img?: string }[] = [
  { label: "All", value: "all" },
  { label: "Food", value: "restaurant", img: foodImg },
  { label: "Shops", value: "shop", img: shopsImg },
  { label: "Grocery", value: "shop", img: groceryImg },
  { label: "Property", value: "property", img: propertyImg },
  { label: "Services", value: "service", img: servicesImg },
  { label: "Rides", value: "service", img: taxiImg },
  { label: "Stays", value: "property", img: staysImg },
  { label: "Delivery", value: "service", img: deliveryImg },
];

const SORT_OPTIONS: { label: string; value: SortMode }[] = [
  { label: "Nearest", value: "nearest" },
  { label: "Best rated", value: "best_rated" },
  { label: "Trending", value: "trending" },
];

export default memo(function GlobalRadarPage() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState(0);
  const [sortBy, setSortBy] = useState<SortMode>("nearest");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const activeType = TYPE_FILTERS[activeFilter].value;
  const type = activeType === "all" ? undefined : activeType;
  const { entities: results, loading, location } = useRadarResults({ type, radiusKm: 30 });
  const userLat = location?.lat ?? 25.2;
  const userLng = location?.lng ?? 55.27;

  const filtered = searchQuery
    ? results.filter(e => e.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : results;

  const handleSelect = useCallback((entity: GeoEntity) => setSelectedId(entity.id), []);
  const handleOpen = useCallback((entity: GeoEntity) => {
    navigate(entity.route_path || `/s/${entity.slug || entity.id}`);
  }, [navigate]);

  const selected = filtered.find(e => e.id === selectedId);

  return (
    <div className="h-[100dvh] flex flex-col bg-background">
      {/* Header */}
      <header className="px-4 pt-4 pb-2 shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1">
            <h1 className="text-xl font-black tracking-tight text-foreground">Radar</h1>
            <p className="text-[10px] text-muted-foreground">Discover everything nearby</p>
          </div>
          <button
            onClick={() => setShowSearch(v => !v)}
            className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
            style={{ background: showSearch ? "hsl(var(--primary))" : "hsl(var(--muted))" }}
          >
            {showSearch ? <X className="w-4 h-4" style={{ color: "hsl(var(--primary-foreground))" }} /> : <Search className="w-4 h-4" />}
          </button>
        </div>

        {/* Search bar */}
        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search shops, restaurants, services..."
                  className="w-full h-10 pl-9 pr-4 rounded-xl text-sm bg-muted/60 border-0 outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/50"
                  autoFocus
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Category chips with images */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
          {TYPE_FILTERS.map((f, i) => (
            <button
              key={`${f.label}-${i}`}
              onClick={() => setActiveFilter(i)}
              className="shrink-0 flex flex-col items-center gap-1 active:scale-95 transition-transform"
            >
              <div
                className="w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center"
                style={{
                  background: activeFilter === i ? "hsl(var(--primary) / 0.15)" : "hsl(var(--muted) / 0.6)",
                  border: activeFilter === i ? "2px solid hsl(var(--primary))" : "2px solid transparent",
                }}
              >
                {f.img ? (
                  <img src={f.img} alt={f.label} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl">🌐</span>
                )}
              </div>
              <span
                className="text-[9px] font-bold"
                style={{ color: activeFilter === i ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}
              >
                {f.label}
              </span>
            </button>
          ))}
        </div>
      </header>

      {/* Sort + view toggle */}
      <div className="flex items-center justify-between px-4 py-1.5 shrink-0">
        <div className="flex gap-1">
          {SORT_OPTIONS.map(s => (
            <button
              key={s.value}
              onClick={() => setSortBy(s.value)}
              className="px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all active:scale-95"
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
          <button onClick={() => setViewMode("list")} className="p-1.5 rounded-md transition-all" style={{ background: viewMode === "list" ? "hsl(var(--background))" : "transparent" }}>
            <List className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setViewMode("map")} className="p-1.5 rounded-md transition-all" style={{ background: viewMode === "map" ? "hsl(var(--background))" : "transparent" }}>
            <MapPin className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Result count */}
      <div className="px-4 pb-1 shrink-0">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          {loading ? "Scanning..." : `${filtered.length} results nearby`}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 relative">
        <AnimatePresence mode="wait">
          {viewMode === "map" ? (
            <motion.div key="map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full px-4 pb-2">
              <UnifiedMap
                entities={filtered}
                userLat={userLat}
                userLng={userLng}
                selectedId={selectedId}
                onSelectEntity={handleSelect}
                className="h-full"
              />
              {selected && (
                <div
                  className="absolute bottom-4 left-4 right-4 rounded-2xl p-3 flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-200"
                  style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}
                >
                  {selected.image_url ? (
                    <img src={selected.image_url} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-muted">
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
                          <Navigation className="w-2.5 h-2.5" />{formatGeoDistance((selected.distance ?? 0) * 1000)}
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
            </motion.div>
          ) : (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-y-auto px-4 pb-24 space-y-2">
              {loading && (
                <div className="flex flex-col items-center gap-3 py-12">
                  <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  <p className="text-xs text-muted-foreground">Scanning nearby...</p>
                </div>
              )}
              {!loading && filtered.length === 0 && (
                <div className="text-center py-12">
                  <span className="text-4xl">📡</span>
                  <p className="text-sm font-semibold mt-3 text-foreground">No results nearby</p>
                  <p className="text-xs text-muted-foreground mt-1">Try expanding your search or changing filters</p>
                </div>
              )}
              {filtered.map((entity, i) => (
                <motion.button
                  key={entity.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  onClick={() => handleOpen(entity)}
                  className="w-full rounded-2xl p-3 flex items-center gap-3 active:scale-[0.98] transition-transform text-left"
                  style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border) / 0.15)" }}
                >
                  {entity.image_url ? (
                    <img src={entity.image_url} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" loading="lazy" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl flex items-center justify-center shrink-0 bg-muted">
                      <span className="text-2xl">📍</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate text-foreground">{entity.title}</p>
                    {entity.subtitle && <p className="text-[11px] text-muted-foreground truncate mt-0.5">{entity.subtitle}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      {entity.rating != null && (
                        <span className="flex items-center gap-0.5 text-[10px] font-semibold">
                          <Star className="w-3 h-3" style={{ color: "hsl(45 90% 55%)", fill: "hsl(45 90% 55%)" }} />
                          {entity.rating.toFixed(1)}
                        </span>
                      )}
                      {entity.distance != null && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Navigation className="w-2.5 h-2.5" />{formatGeoDistance((entity.distance ?? 0) * 1000)}
                        </span>
                      )}
                      {entity.distance != null && (
                        <span className="text-[10px] text-muted-foreground">{formatGeoETA((entity.distance ?? 0) * 1000)}</span>
                      )}
                    </div>
                  </div>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});
