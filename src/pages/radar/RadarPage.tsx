import { useEffect, useState, useCallback } from "react";
import { useRadarGeo } from "@/hooks/useRadarGeo";
import { useRadarStore } from "@/stores/radarStore";
import { RadarFilterMenu } from "@/components/radar/RadarFilterMenu";
import { RadarResultsList } from "@/components/radar/RadarResultsList";
import { RadarUserPulse } from "@/components/radar/RadarUserPulse";
import { ultraHaptic } from "@/lib/performance/useUltraFast";
import { useGeoStore } from "@/lib/geo/geo-store";
import { geoService } from "@/lib/geo/geo-service";
import { supabase } from "@/integrations/supabase/client";
import { haversineKm } from "@/lib/radar/geo";
import type { RadarPoint } from "@/lib/radar/types";
import { Search, MapPin, Navigation, Loader2 } from "lucide-react";
import "@/styles/radar-pro.css";

const BASE_SELECT =
  "id, name, slug, vertical, category, subcategory, address, logo_url, banner_url, latitude, longitude, rating, reviews_count, ranking_score";

export default function RadarPage() {
  useRadarGeo();

  const userLocation = useRadarStore((s) => s.userLocation);
  const setPoints = useRadarStore((s) => s.setPoints);
  const setSortMode = useRadarStore((s) => s.setSortMode);
  const sortMode = useRadarStore((s) => s.sortMode);
  const mapMode = useRadarStore((s) => s.mapMode);
  const setMapMode = useRadarStore((s) => s.setMapMode);
  const geoLoading = useGeoStore((s) => s.loading);
  const geoPermission = useGeoStore((s) => s.permission);

  const [searchQuery, setSearchQuery] = useState("");
  const [loadingListings, setLoadingListings] = useState(true);

  // Force geolocation on mount
  useEffect(() => {
    const pt = useGeoStore.getState().point;
    if (!pt) geoService.forceRetry();
  }, []);

  // Fetch real listings
  const fetchListings = useCallback(async () => {
    setLoadingListings(true);
    try {
      let query = (supabase as any)
        .from("storefront_pages")
        .select(BASE_SELECT)
        .eq("launch_status", "launched")
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .order("ranking_score", { ascending: false })
        .limit(100);

      if (searchQuery.trim()) {
        query = query.ilike("name", `%${searchQuery.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      const loc = useRadarStore.getState().userLocation;
      const points: RadarPoint[] = (data ?? []).map((s: any) => ({
        id: s.id,
        title: s.name,
        subtitle: s.address,
        imageUrl: s.banner_url || s.logo_url,
        category: mapVerticalToCategory(s.vertical || s.category),
        subcategory: s.subcategory,
        lat: s.latitude,
        lng: s.longitude,
        rating: s.rating,
        reviewsCount: s.reviews_count,
        isSponsored: (s.ranking_score ?? 0) > 80,
        distanceKm: loc ? haversineKm(loc.lat, loc.lng, s.latitude, s.longitude) : undefined,
      }));

      setPoints(points);
    } catch (err) {
      console.error("[Radar] fetch failed:", err);
    } finally {
      setLoadingListings(false);
    }
  }, [searchQuery, setPoints]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings, userLocation?.lat]);

  const handleLocate = () => {
    ultraHaptic("light");
    geoService.forceRetry();
  };

  const SORT_MODES = [
    { key: "nearest" as const, label: "📍 Nearest" },
    { key: "best" as const, label: "⭐ Best rated" },
    { key: "trending" as const, label: "🔥 Trending" },
  ];

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      <RadarFilterMenu />

      {/* Header */}
      <div className="px-4 pt-5 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-bold text-foreground">Radar</h1>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              {geoLoading ? (
                <><Loader2 className="h-3 w-3 animate-spin" /> Locating…</>
              ) : userLocation ? (
                <><MapPin className="h-3 w-3 text-primary" /> {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}</>
              ) : geoPermission === "denied" ? (
                <button onClick={handleLocate} className="text-primary font-semibold">
                  📍 Enable location
                </button>
              ) : (
                "Searching location…"
              )}
            </p>
          </div>
          <button
            onClick={handleLocate}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-card/80 shadow-sm active:scale-[0.93] transition-transform duration-75 backdrop-blur-md"
            aria-label="Locate me"
          >
            <Navigation className="h-4 w-4 text-primary" />
          </button>
        </div>

        {/* Search bar */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search shops, restaurants, services…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-xl bg-muted/40 border border-border/20 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>

        {/* Sort pills */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {SORT_MODES.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { ultraHaptic("light"); setSortMode(key); }}
              className={`rounded-2xl px-3.5 py-1.5 text-xs whitespace-nowrap active:scale-[0.95] transition-transform duration-75 ${
                sortMode === key
                  ? "bg-primary/15 text-primary font-semibold border border-primary/20"
                  : "bg-muted/30 text-muted-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* View toggle */}
      <div className="flex items-center justify-between px-4 pb-3">
        <div className="flex rounded-xl bg-muted/30 p-0.5">
          <button
            onClick={() => { ultraHaptic("light"); setMapMode("list"); }}
            className={`rounded-lg px-4 py-1.5 text-xs font-medium active:scale-[0.95] transition-all duration-75 ${
              mapMode === "list" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            ☰ List
          </button>
          <button
            onClick={() => { ultraHaptic("light"); setMapMode("map"); }}
            className={`rounded-lg px-4 py-1.5 text-xs font-medium active:scale-[0.95] transition-all duration-75 ${
              mapMode === "map" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            🗺 Map
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground">
          {useRadarStore.getState().filtered.length} results
        </p>
      </div>

      {/* Content */}
      {mapMode === "map" ? (
        <div className="relative mx-4 h-[320px] rounded-2xl bg-muted/20 border border-border/20 overflow-hidden flex items-center justify-center ultra-smooth">
          <div className="relative w-[200px] h-[200px] rounded-full border border-primary/10">
            <RadarUserPulse />
          </div>
          {userLocation ? (
            <p className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground">
              {userLocation.lat.toFixed(5)}, {userLocation.lng.toFixed(5)}
            </p>
          ) : (
            <p className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground animate-pulse">
              Locating…
            </p>
          )}
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

function mapVerticalToCategory(vertical: string): RadarPoint["category"] {
  const map: Record<string, RadarPoint["category"]> = {
    food: "food",
    restaurant: "food",
    cafe: "food",
    retail: "shops",
    fashion: "shops",
    grocery: "grocery",
    supermarket: "grocery",
    property: "property",
    realestate: "property",
    services: "services",
    beauty: "services",
    health: "services",
  };
  return map[vertical?.toLowerCase()] || "shops";
}
