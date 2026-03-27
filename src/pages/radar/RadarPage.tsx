import { useEffect, useState, useCallback, useMemo, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useRadarGeo } from "@/hooks/useRadarGeo";
import { useRadarStore, type SortMode } from "@/stores/radarStore";
import { useDiscoveryStore } from "@/stores/discoveryStore";
import { RadarFilterMenu } from "@/components/radar/RadarFilterMenu";
import { RadarResultsList } from "@/components/radar/RadarResultsList";
import { ultraHaptic } from "@/lib/performance/useUltraFast";
import { useGeoStore } from "@/lib/geo/geo-store";
import { geoService } from "@/lib/geo/geo-service";
import { fetchCanonicalDiscovery } from "@/lib/discovery/canonical-discovery-pipeline";
import { getTimeContext } from "@/lib/discovery/timeContext";
import { RADAR_CATEGORIES, getSubcategoriesForRadarCategory, type RadarMainCategory } from "@/lib/taxonomy/world-class-taxonomy";
import type { RadarCategory } from "@/lib/radar/types";
import { Search, MapPin, Navigation, Loader2, Flame, ArrowLeft } from "lucide-react";
import "@/styles/radar-pro.css";
import { useLiveWeatherStation } from "@/hooks/useLiveWeatherStation";

const UnifiedMap = lazy(() => import("@/components/map/UnifiedMap"));

const CATEGORIES = RADAR_CATEGORIES.map((c) => ({
  cat: c.value as RadarCategory,
  icon: c.emoji,
  label: c.label,
}));

const SORT_MODES: { key: SortMode; label: string }[] = [
  { key: "smart", label: "🧠 Smart" },
  { key: "nearest", label: "📍 Nearest" },
  { key: "best", label: "⭐ Best rated" },
  { key: "trending", label: "🔥 Trending" },
];


export default function RadarPage() {
  useRadarGeo();
  const navigate = useNavigate();

  const userLocation = useRadarStore((s) => s.userLocation);
  const setPoints = useRadarStore((s) => s.setPoints);
  const setSortMode = useRadarStore((s) => s.setSortMode);
  const sortMode = useRadarStore((s) => s.sortMode);
  const setMapMode = useRadarStore((s) => s.setMapMode);
  const category = useRadarStore((s) => s.category);
  const setCategory = useRadarStore((s) => s.setCategory);
  const subcategory = useRadarStore((s) => s.subcategory);
  const setSubCategory = useRadarStore((s) => s.setSubCategory);
  const filtered = useRadarStore((s) => s.filtered);
  const geoLoading = useGeoStore((s) => s.loading);
  const geoPermission = useGeoStore((s) => s.permission);

  // Shared discovery state
  const searchQuery = useDiscoveryStore((s) => s.searchQuery);
  const setSearchQuery = useDiscoveryStore((s) => s.setSearchQuery);

  const [loadingListings, setLoadingListings] = useState(true);
  const [mapMode, setLocalMapMode] = useState<"list" | "map" | "heatmap">("list");
  const [showWeatherLayer, setShowWeatherLayer] = useState(true);
  const timeCtx = useMemo(() => getTimeContext(), []);
  const weather = useLiveWeatherStation({ lat: userLocation?.lat, lng: userLocation?.lng });

  const subcategories = useMemo(() => {
    return getSubcategoriesForRadarCategory(category as RadarMainCategory);
  }, [category]);

  // Force geo on mount
  useEffect(() => {
    const pt = useGeoStore.getState().point;
    if (!pt) geoService.forceRetry();
  }, []);

  // Fetch via CANONICAL pipeline — with visibility, routing, and radius enforcement
  const fetchListings = useCallback(async () => {
    setLoadingListings(true);
    try {
      const points = await fetchCanonicalDiscovery({
        surface: "radar",
        searchQuery: searchQuery || undefined,
        userLocation: userLocation ?? undefined,
        category: category !== "all" ? category : undefined,
        subcategory: subcategory ?? undefined,
        
      });
      setPoints(points);
    } catch (err) {
      console.error("[Radar] fetch failed:", err);
    } finally {
      setLoadingListings(false);
    }
  }, [searchQuery, setPoints, userLocation?.lat, userLocation?.lng, category, subcategory]);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  const handleLocate = () => {
    ultraHaptic("light");
    geoService.forceRetry();
  };

  const handleSetMapMode = (mode: "list" | "map" | "heatmap") => {
    setLocalMapMode(mode);
    if (mode !== "heatmap") setMapMode(mode as "list" | "map");
  };

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      <RadarFilterMenu />

      {/* Header */}
      <div className="px-4 pt-5 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/")} className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-transform bg-muted/60 backdrop-blur-sm">
              <ArrowLeft className="w-4.5 h-4.5" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-foreground">Radar</h1>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                {geoLoading ? (
                  <><Loader2 className="h-3 w-3 animate-spin" /> Locating…</>
                ) : userLocation ? (
                  <><MapPin className="h-3 w-3 text-primary" /> {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}</>
                ) : geoPermission === "denied" ? (
                  <button onClick={handleLocate} className="text-primary font-semibold">📍 Enable location</button>
                ) : (
                  "Searching location…"
                )}
                <span className="ml-2 text-[9px] text-primary/70">{timeCtx.emoji} {timeCtx.label}</span>
              </p>
            </div>
          </div>
          <button
            onClick={handleLocate}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-card/80 shadow-sm active:scale-[0.93] transition-transform duration-75 backdrop-blur-md"
            aria-label="Locate me"
          >
            <Navigation className="h-4 w-4 text-primary" />
          </button>
        </div>

        {/* Search — shared state */}
        <div className="search-premium-wrap mb-3">
          <Search className="search-premium-icon h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search shops, restaurants, services…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-premium-field h-12 bg-card border border-border/30 text-sm text-foreground placeholder:text-muted-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>


        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {CATEGORIES.map(({ cat, icon, label }) => (
            <button
              key={cat}
              onClick={() => { ultraHaptic("light"); setCategory(cat); }}
              className={`flex items-center gap-1.5 rounded-2xl px-3.5 py-1.5 text-xs whitespace-nowrap active:scale-[0.95] transition-transform duration-75 ${
                category === cat
                  ? "bg-primary/15 text-primary font-semibold border border-primary/20"
                  : "bg-muted/30 text-muted-foreground"
              }`}
            >
              <span>{icon}</span> {label}
            </button>
          ))}
        </div>

        {/* Subcategory chips */}
        {subcategories.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2 mt-1">
            <button
              onClick={() => { ultraHaptic("light"); setSubCategory(null); }}
              className={`rounded-full px-3 py-1 text-[11px] whitespace-nowrap active:scale-[0.95] transition-transform duration-75 ${
                !subcategory
                  ? "bg-primary/10 text-primary font-semibold"
                  : "bg-muted/20 text-muted-foreground"
              }`}
            >
              All
            </button>
            {subcategories.map((sub) => (
              <button
                key={sub.value}
                onClick={() => { ultraHaptic("light"); setSubCategory(subcategory === sub.value ? null : sub.value); }}
                className={`flex items-center gap-1 rounded-full px-3 py-1 text-[11px] whitespace-nowrap active:scale-[0.95] transition-transform duration-75 ${
                  subcategory === sub.value
                    ? "bg-primary/10 text-primary font-semibold"
                    : "bg-muted/20 text-muted-foreground"
                }`}
              >
                <span>{sub.icon}</span> {sub.label}
              </button>
            ))}
          </div>
        )}

        {/* Sort pills */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mt-1">
          {SORT_MODES.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { ultraHaptic("light"); setSortMode(key); }}
              className={`rounded-2xl px-3 py-1 text-[10px] whitespace-nowrap active:scale-[0.95] transition-transform duration-75 ${
                sortMode === key
                  ? "bg-primary/10 text-primary font-medium"
                  : "bg-muted/20 text-muted-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* View toggle — now includes heatmap */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-3">
        <div className="flex rounded-xl bg-muted/30 p-0.5">
          <button
            onClick={() => { ultraHaptic("light"); handleSetMapMode("list"); }}
            className={`rounded-lg px-4 py-1.5 text-xs font-medium active:scale-[0.95] transition-all duration-75 ${
              mapMode === "list" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            ☰ List
          </button>
          <button
            onClick={() => { ultraHaptic("light"); handleSetMapMode("map"); }}
            className={`rounded-lg px-4 py-1.5 text-xs font-medium active:scale-[0.95] transition-all duration-75 ${
              mapMode === "map" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            🗺 Map
          </button>
          <button
            onClick={() => { ultraHaptic("light"); handleSetMapMode("heatmap"); }}
            className={`rounded-lg px-4 py-1.5 text-xs font-medium active:scale-[0.95] transition-all duration-75 ${
              mapMode === "heatmap" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <Flame className="h-3 w-3 inline mr-0.5" /> Heat
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowWeatherLayer((current) => !current)}
            className="rounded-full border border-border/20 bg-card px-3 py-1 text-[10px] font-semibold text-foreground"
          >
            {showWeatherLayer ? "Rain on" : "Rain off"}
          </button>
          <p className="text-[10px] text-muted-foreground">
            {weather.isRaining ? `${filtered.length} results · rain live` : `${filtered.length} results`}
          </p>
        </div>
      </div>

      {/* Content */}
      {mapMode === "map" || mapMode === "heatmap" ? (
        <div className="relative mx-4 h-[calc(100dvh-20rem)] min-h-[400px] rounded-2xl overflow-hidden">
          <Suspense fallback={<div className="w-full h-full bg-muted/20 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
            <UnifiedMap
              entities={filtered.map((p) => ({
                id: p.id,
                type: (p.category === "food" ? "restaurant" : p.category === "shops" ? "shop" : p.category === "grocery" ? "grocery" : p.category === "property" ? "property" : "service") as any,
                name: p.title,
                title: p.title,
                subtitle: p.subtitle || undefined,
                lat: p.lat,
                lng: p.lng,
                imageUrl: p.imageUrl,
                image_url: p.imageUrl,
                slug: p.slug || undefined,
              }))}
              onSelectEntity={(entity) => {
                ultraHaptic("light");
                const slug = (entity as any).slug;
                navigate(slug ? `/s/${slug}` : `/s/${entity.id}`);
              }}
              userLat={userLocation?.lat}
              userLng={userLocation?.lng}
              showUserLocation={!!userLocation}
              zoom={13}
              showHeatmap={mapMode === "heatmap"}
              showWeatherLayer={showWeatherLayer}
            />
          </Suspense>
        </div>
      ) : (
        <div className="px-4">
          {loadingListings ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Loading listings…</p>
            </div>
          ) : (
            <RadarResultsList />
          )}
        </div>
      )}
    </div>
  );
}
