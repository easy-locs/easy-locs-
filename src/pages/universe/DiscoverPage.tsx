/**
 * DiscoverPage — Unified discovery hub with all verticals + map.
 * Booking/Deliveroo/Airbnb-style browse-everything page.
 */
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, MapPin, ChevronRight, Map as MapIcon, List } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";
import MerchantCard from "@/components/marketplace/MerchantCard";
import { VERTICALS, getSubcategoryLabel } from "@/lib/discovery/verticals";
import { useGeoStore } from "@/lib/geo/geo-store";

const BASE_SELECT =
  "id, name, slug, vertical, subcategory, address, logo_url, banner_url, rating, reviews_count, latitude, longitude, ranking_score";

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export default function DiscoverPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeVertical, setActiveVertical] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const geoPoint = useGeoStore((s) => s.point);

  const { data: allListings = [], isLoading } = useQuery({
    queryKey: ["discover-all"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("storefront_pages")
        .select(BASE_SELECT)
        .order("ranking_score", { ascending: false })
        .order("rating", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        ...r,
        rating: Number(r.rating) || 0,
        reviews_count: Number(r.reviews_count) || 0,
        latitude: r.latitude ? Number(r.latitude) : null,
        longitude: r.longitude ? Number(r.longitude) : null,
        ranking_score: Number(r.ranking_score) || 0,
        distanceKm:
          geoPoint && r.latitude && r.longitude
            ? haversineKm(geoPoint.lat, geoPoint.lng, Number(r.latitude), Number(r.longitude))
            : undefined,
      }));
    },
    staleTime: 60_000,
  });

  const filtered = useMemo(() => {
    let items = allListings;
    if (activeVertical) items = items.filter((l: any) => l.vertical === activeVertical);
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (l: any) =>
          l.name?.toLowerCase().includes(q) ||
          l.address?.toLowerCase().includes(q) ||
          l.subcategory?.toLowerCase().includes(q)
      );
    }
    return items;
  }, [allListings, activeVertical, search]);

  // Group by vertical for overview
  const verticalCounts = useMemo(() => {
    const map = new Map<string, number>();
    allListings.forEach((l: any) => {
      map.set(l.vertical, (map.get(l.vertical) || 0) + 1);
    });
    return map;
  }, [allListings]);

  // Map view
  const mapItems = useMemo(
    () => filtered.filter((l: any) => l.latitude && l.longitude),
    [filtered]
  );

  return (
    <div className="min-h-screen pb-24" style={{ background: "hsl(var(--background))" }}>
      <SEOHead
        title="Discover — Browse All Categories | Easy-Locs"
        description="Explore food, shops, services, property and more — all nearby businesses on one page."
      />

      {/* Sticky header */}
      <div className="sticky top-0 z-30 px-4 pt-3 pb-2" style={{ background: "hsl(var(--background))", borderBottom: "1px solid hsl(var(--border) / 0.1)" }}>
        {/* Search bar */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "hsl(var(--muted-foreground))" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search restaurants, shops, services…"
            className="w-full h-10 pl-10 pr-4 rounded-xl text-sm border-none outline-none"
            style={{ background: "hsl(var(--muted))", color: "hsl(var(--foreground))" }}
          />
        </div>

        {/* Vertical pills — like Uber/Careem top tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveVertical(null)}
            className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={{
              background: !activeVertical ? "hsl(var(--primary))" : "hsl(var(--muted))",
              color: !activeVertical ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))",
            }}
          >
            All ({allListings.length})
          </button>
          {VERTICALS.map((v) => (
            <button
              key={v.value}
              onClick={() => setActiveVertical(activeVertical === v.value ? null : v.value)}
              className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1"
              style={{
                background: activeVertical === v.value ? "hsl(var(--primary))" : "hsl(var(--muted))",
                color: activeVertical === v.value ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))",
              }}
            >
              <span>{v.emoji}</span> {v.label}
              <span className="opacity-60">({verticalCounts.get(v.value) || 0})</span>
            </button>
          ))}
        </div>

        {/* View toggle */}
        <div className="flex justify-end mt-2">
          <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid hsl(var(--border) / 0.2)" }}>
            <button
              onClick={() => setViewMode("list")}
              className="px-3 py-1.5 text-xs"
              style={{ background: viewMode === "list" ? "hsl(var(--primary) / 0.1)" : "transparent", color: "hsl(var(--foreground))" }}
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode("map")}
              className="px-3 py-1.5 text-xs"
              style={{ background: viewMode === "map" ? "hsl(var(--primary) / 0.1)" : "transparent", color: "hsl(var(--foreground))" }}
            >
              <MapIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="px-4 mt-6 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: "hsl(var(--muted))" }} />
          ))}
        </div>
      ) : viewMode === "map" ? (
        /* Map View — detailed pins */
        <div className="px-4 mt-4">
          <div className="rounded-2xl overflow-hidden" style={{ background: "hsl(var(--muted))", height: 400 }}>
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <MapPin className="h-8 w-8" style={{ color: "hsl(var(--primary))" }} />
              <p className="text-sm font-semibold text-foreground">{mapItems.length} businesses on map</p>
              <p className="text-xs text-muted-foreground">Open in Radar for full map experience</p>
              <button
                onClick={() => navigate("/radar")}
                className="px-4 py-2 rounded-full text-xs font-bold"
                style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
              >
                Open Radar Map →
              </button>
            </div>
          </div>

          {/* Map list underneath */}
          <div className="mt-4 space-y-2">
            {mapItems.slice(0, 20).map((item: any, i: number) => (
              <MerchantCard
                key={item.id}
                to={item.slug ? `/s/${item.slug}` : `/s/${item.id}`}
                image={item.banner_url || item.logo_url}
                name={item.name}
                category={[
                  item.subcategory ? getSubcategoryLabel(item.vertical, item.subcategory) : null,
                  item.address,
                ].filter(Boolean).join(" · ")}
                rating={item.rating > 0 ? item.rating : undefined}
                distance={item.distanceKm ? `${item.distanceKm.toFixed(1)} km` : undefined}
                index={i}
                variant="horizontal"
              />
            ))}
          </div>
        </div>
      ) : (
        /* List View — grouped by vertical */
        <div className="px-4 mt-4">
          {!activeVertical ? (
            /* Show vertical sections like Booking.com homepage */
            VERTICALS.map((v) => {
              const items = filtered.filter((l: any) => l.vertical === v.value);
              if (items.length === 0) return null;
              return (
                <div key={v.value} className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      <span>{v.emoji}</span> {v.label}
                      <span className="text-[10px] font-normal text-muted-foreground">({items.length})</span>
                    </h2>
                    <button
                      onClick={() => {
                        const routes: Record<string, string> = {
                          food: "/food",
                          retail: "/shops",
                          services: "/services-hub",
                          real_estate: "/real-estate",
                        };
                        navigate(routes[v.value] || "/radar");
                      }}
                      className="text-[11px] font-semibold flex items-center gap-0.5"
                      style={{ color: "hsl(var(--primary))" }}
                    >
                      See all <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
                    {items.slice(0, 8).map((item: any, i: number) => (
                      <div key={item.id} className="shrink-0 w-[180px]">
                        <MerchantCard
                          to={item.slug ? `/s/${item.slug}` : `/shop/${item.id}`}
                          image={item.banner_url || item.logo_url}
                          name={item.name}
                          category={[
                            item.subcategory ? getSubcategoryLabel(v.value, item.subcategory) : null,
                            item.address,
                          ].filter(Boolean).join(" · ")}
                          rating={item.rating > 0 ? item.rating : undefined}
                          distance={item.distanceKm ? `${item.distanceKm.toFixed(1)} km` : undefined}
                          index={i}
                          variant="vertical"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            /* Filtered to single vertical — show flat list */
            <>
              <h2 className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "hsl(var(--muted-foreground))" }}>
                {filtered.length} results
              </h2>
              <div className="space-y-2">
                {filtered.map((item: any, i: number) => (
                  <MerchantCard
                    key={item.id}
                    to={item.slug ? `/s/${item.slug}` : `/shop/${item.id}`}
                    image={item.banner_url || item.logo_url}
                    name={item.name}
                    category={[
                      item.subcategory ? getSubcategoryLabel(item.vertical, item.subcategory) : null,
                      item.address,
                    ].filter(Boolean).join(" · ")}
                    rating={item.rating > 0 ? item.rating : undefined}
                    distance={item.distanceKm ? `${item.distanceKm.toFixed(1)} km` : undefined}
                    index={i}
                    variant="horizontal"
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
