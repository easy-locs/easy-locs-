/**
 * SuperMapRadarPage — Premium Nearby / Map discovery screen.
 * Rebuilt with: control hierarchy, map/list toggle, category chips,
 * skeleton fallback, nearby cards, and unified design tokens.
 */
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabase } from "@/integrations/supabase/client";
import { createMarkerElement, getMarkerStyle } from "@/lib/map/presence-styles";
import { isLiveStale } from "@/hooks/useGPSTracking";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { haptic } from "@/lib/haptics";
import {
  Map as MapIcon, List, Search, X, SlidersHorizontal,
  MapPin, Radar, Store, Truck, Wrench, ShoppingBag,
  UtensilsCrossed, Building2, Car, Scissors, Hammer,
  Package, Bike, ShoppingCart, Locate,
} from "lucide-react";

/* ─── Constants ─── */
const MAPBOX_TOKEN = "pk.eyJ1IjoiZWFzeWxvY3MyMDI2IiwiYSI6ImNtbXZiZ3h0cTF6ZHMycnIyOWw4NnJzZTIifQ.ElIj6bFQK_BpVm6suigHUQ";
const DUBAI_CENTER: [number, number] = [55.2708, 25.2048];

const CATEGORIES = [
  { key: "all", label: "All", icon: Radar },
  { key: "food", label: "Food", icon: UtensilsCrossed },
  { key: "property", label: "Property", icon: Building2 },
  { key: "taxi", label: "Taxi", icon: Car },
  { key: "beauty", label: "Beauty", icon: Scissors },
  { key: "repair", label: "Repair", icon: Hammer },
  { key: "delivery", label: "Delivery", icon: Bike },
  { key: "grocery", label: "Grocery", icon: ShoppingCart },
  { key: "electronics", label: "Electronics", icon: Package },
];

const RADIUS_OPTIONS = [
  { value: 1000, label: "1 km" },
  { value: 3000, label: "3 km" },
  { value: 5000, label: "5 km" },
  { value: 10000, label: "10 km" },
  { value: 25000, label: "25 km" },
];

interface MapListing {
  id: string;
  title: string;
  lat: number;
  lng: number;
  presence_mode: string;
  entity_type: string;
  coverage_mode: string;
  coverage_radius_m: number | null;
  category: string;
  price: number;
  currency: string;
  listing_type: string;
  city?: string;
  photo_urls?: any;
}

/* ─── Circle GeoJSON helper ─── */
function createCircleGeoJSON(center: [number, number], radiusM: number, points = 64): GeoJSON.Feature {
  const coords: [number, number][] = [];
  const km = radiusM / 1000;
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    const dx = km * Math.cos(angle);
    const dy = km * Math.sin(angle);
    const lat = center[1] + (dy / 110.574);
    const lng = center[0] + (dx / (111.32 * Math.cos((center[1] * Math.PI) / 180)));
    coords.push([lng, lat]);
  }
  return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [coords] } };
}

/* ─── Entity icon for cards ─── */
function EntityIcon({ type, className }: { type: string; className?: string }) {
  const map: Record<string, typeof Store> = {
    fixed_store: Store, mobile_seller: ShoppingBag, mobile_service: Wrench, driver: Truck,
  };
  const Icon = map[type] || MapPin;
  return <Icon className={className} />;
}

/* ─── Nearby Card ─── */
function NearbyCard({ listing, index }: { listing: MapListing; index: number }) {
  const navigate = useNavigate();
  const thumb = Array.isArray(listing.photo_urls) && listing.photo_urls.length > 0 ? listing.photo_urls[0] : null;

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.04 }}
      onClick={() => { haptic("light"); navigate(`/listing/${listing.id}`); }}
      className="w-full rounded-2xl border border-border/40 bg-card p-3.5 text-left shadow-sm transition-all active:scale-[0.97] hover:border-primary/30"
    >
      <div className="flex items-center gap-3">
        {thumb ? (
          <img src={thumb} alt="" className="w-11 h-11 rounded-xl object-cover shrink-0 ring-1 ring-border/20" />
        ) : (
          <div className="w-11 h-11 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
            <EntityIcon type={listing.entity_type} className="h-4.5 w-4.5 text-primary" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{listing.title}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs font-bold text-primary">{listing.price} {listing.currency}</span>
            {listing.city && <span className="text-[10px] text-muted-foreground">· {listing.city}</span>}
          </div>
        </div>
        <div className="shrink-0">
          <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${
            listing.presence_mode === "live"
              ? "bg-emerald-500/15 text-emerald-500"
              : "bg-muted text-muted-foreground"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${listing.presence_mode === "live" ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"}`} />
            {listing.presence_mode === "live" ? "Live" : "Pin"}
          </span>
        </div>
      </div>
    </motion.button>
  );
}

/* ─── Map Fallback ─── */
function MapFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-[hsl(var(--card))] to-[hsl(var(--muted)/0.5)] p-4 h-[300px] flex flex-col justify-between">
      {/* Top indicator */}
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
        <span className="text-sm text-muted-foreground">Chargement de la carte…</span>
      </div>
      {/* Fake map area */}
      <div className="flex-1 flex items-center justify-center my-3">
        <div className="w-full h-[180px] rounded-xl bg-muted/20 border border-border/20 flex flex-col items-center justify-center gap-3">
          {/* Radar animation */}
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-2 border-primary/20 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full border border-primary/30 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-primary/60 animate-pulse" />
              </div>
            </div>
            <div className="absolute inset-0 rounded-full border-2 border-primary/10 animate-ping" style={{ animationDuration: "2s" }} />
          </div>
          <span className="text-[11px] text-muted-foreground font-medium">Map preview</span>
        </div>
      </div>
      {/* Retry CTA */}
      <button
        onClick={onRetry}
        className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold transition-opacity hover:opacity-90 active:scale-[0.97]"
      >
        Réessayer
      </button>
    </div>
  );
}

/* ─── Nearby Preview (static fallback cards) ─── */
function NearbyPreview({ items }: { items: { title: string; subtitle: string; distance: string }[] }) {
  return (
    <div className="mt-3 space-y-2">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">À proximité</p>
      {items.map((item, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: i * 0.06 }}
          className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/30"
        >
          <div className="w-10 h-10 rounded-lg bg-muted/40 flex items-center justify-center shrink-0">
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{item.title}</p>
            <p className="text-[11px] text-muted-foreground">{item.subtitle}</p>
          </div>
          <span className="text-[11px] font-semibold text-primary shrink-0">{item.distance}</span>
        </motion.div>
      ))}
    </div>
  );
}

const FALLBACK_NEARBY = [
  { title: "Pizza Dubai Marina", subtitle: "Livraison 20 min", distance: "1.2 km" },
  { title: "Beauty Salon JLT", subtitle: "⭐ 4.8", distance: "800 m" },
  { title: "Car Wash Mobile", subtitle: "Service à domicile", distance: "2.5 km" },
];

/* ─── Legend ─── */
function MapLegend() {
  const items: [string, string][] = [
    ["hsl(40,58%,58%)", "Store"],
    ["hsl(45,96%,56%)", "Mobile Seller"],
    ["hsl(263,80%,75%)", "Mobile Service"],
    ["hsl(160,65%,65%)", "Driver"],
  ];
  return (
    <div className="absolute bottom-20 left-3 z-10 rounded-xl border border-border/30 bg-card/95 backdrop-blur-md p-2.5 shadow-lg">
      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Legend</span>
      <div className="mt-1.5 space-y-1">
        {items.map(([color, label]) => (
          <div key={label} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
            <span className="text-[10px] text-foreground/80">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════ */
export default function SuperMapRadarPage() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [listings, setListings] = useState<MapListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [radius, setRadius] = useState(5000);
  const [showRadiusPicker, setShowRadiusPicker] = useState(false);
  const chipsRef = useRef<HTMLDivElement>(null);

  /* ─── Fetch listings ─── */
  useEffect(() => {
    (async () => {
      setLoading(true);
      const now = new Date().toISOString();
      const { data } = await (supabase as any)
        .from("marketplace_services")
        .select("id, title, lat, lng, anchor_lat, anchor_lng, live_lat, live_lng, presence_mode, entity_type, coverage_mode, coverage_radius_m, category, price, currency, listing_type, auto_expire, listing_expires_at, is_live_online, live_updated_at, city, photo_urls")
        .eq("active", true)
        .neq("presence_mode", "off")
        .limit(500);
      if (data) {
        setListings(
          data
            .filter((d: any) => {
              if (d.auto_expire && d.listing_expires_at && d.listing_expires_at < now) return false;
              if (d.presence_mode === "live" && d.is_live_online === false) {
                if (isLiveStale(d.live_updated_at)) return false;
              }
              return true;
            })
            .map((d: any) => ({
              ...d,
              lat: d.presence_mode === "live" ? (d.live_lat ?? d.anchor_lat ?? d.lat) : (d.anchor_lat ?? d.lat),
              lng: d.presence_mode === "live" ? (d.live_lng ?? d.anchor_lng ?? d.lng) : (d.anchor_lng ?? d.lng),
            }))
            .filter((d: any) => d.lat && d.lng)
        );
      }
      setLoading(false);
    })();
  }, []);

  /* ─── Filtered listings ─── */
  const filtered = useMemo(() => {
    let result = listings;
    if (activeCategory !== "all") {
      result = result.filter(l => l.category?.toLowerCase() === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(l => l.title.toLowerCase().includes(q) || l.category?.toLowerCase().includes(q));
    }
    return result;
  }, [listings, activeCategory, search]);

  /* ─── Init map ─── */
  useEffect(() => {
    if (viewMode !== "map") return;
    const container = mapContainerRef.current;
    if (!container || mapRef.current) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container,
      style: "mapbox://styles/mapbox/dark-v11",
      center: DUBAI_CENTER,
      zoom: 12,
    });
    map.on("load", () => {
      map.resize();
      setMapReady(true);
    });
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; setMapReady(false); };
  }, [viewMode]);

  /* ─── Render markers ─── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || viewMode !== "map") return;

    const render = () => {
      if (!map.isStyleLoaded()) return;
      // Clear old
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      filtered.forEach((_, i) => {
        const srcId = `coverage-src-${i}`;
        if (map.getLayer(`coverage-fill-${i}`)) map.removeLayer(`coverage-fill-${i}`);
        if (map.getLayer(`coverage-border-${i}`)) map.removeLayer(`coverage-border-${i}`);
        if (map.getSource(srcId)) map.removeSource(srcId);
      });

      filtered.forEach((listing, i) => {
        const el = createMarkerElement(listing.presence_mode, listing.entity_type);
        const style = getMarkerStyle(listing.presence_mode, listing.entity_type);

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([listing.lng, listing.lat])
          .setPopup(
            new mapboxgl.Popup({ offset: 20, closeButton: false }).setHTML(`
              <div style="padding:8px;max-width:220px;font-family:system-ui;">
                <div style="font-size:11px;color:${style.color};font-weight:700;margin-bottom:2px;">
                  ${style.label}
                  ${listing.coverage_mode !== "point" && listing.coverage_radius_m
                    ? `<span style="opacity:0.7;font-weight:400;"> · ${listing.coverage_radius_m >= 1000 ? `${listing.coverage_radius_m / 1000}km` : `${listing.coverage_radius_m}m`} radius</span>`
                    : ""}
                </div>
                <div style="font-size:13px;font-weight:600;color:#fff;">${listing.title}</div>
                <div style="font-size:12px;color:#94a3b8;margin-top:2px;">${listing.price} ${listing.currency} · ${listing.category}</div>
              </div>
            `)
          )
          .addTo(map);
        markersRef.current.push(marker);

        if (listing.coverage_mode !== "point" && listing.coverage_radius_m && listing.coverage_radius_m > 0) {
          const srcId = `coverage-src-${i}`;
          const circle = createCircleGeoJSON([listing.lng, listing.lat], listing.coverage_radius_m);
          map.addSource(srcId, { type: "geojson", data: circle as any });
          map.addLayer({
            id: `coverage-fill-${i}`, type: "fill", source: srcId,
            paint: { "fill-color": style.color, "fill-opacity": listing.coverage_mode === "live_radius" ? 0.12 : 0.08 },
          });
          map.addLayer({
            id: `coverage-border-${i}`, type: "line", source: srcId,
            paint: {
              "line-color": style.color, "line-width": listing.coverage_mode === "live_radius" ? 2 : 1.5,
              "line-opacity": 0.5, "line-dasharray": listing.coverage_mode === "live_radius" ? [2, 2] : [1, 0],
            },
          });
        }
      });
    };

    if (mapReady) render();
    else map.on("style.load", render);
    return () => { map.off("style.load", render); };
  }, [filtered, mapReady, viewMode]);

  return (
    <div className="flex flex-col h-[100dvh] bg-background overflow-hidden">

      {/* ═══ HEADER CONTROLS ═══ */}
      <div className="shrink-0 px-4 pt-3 pb-1 space-y-2.5 bg-background/95 backdrop-blur-md z-20 border-b border-border/30">

        {/* Title row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radar className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold text-foreground">Nearby</h1>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Locate me */}
            <button
              onClick={() => haptic("light")}
              className="h-9 w-9 rounded-xl bg-muted/50 flex items-center justify-center transition-colors hover:bg-muted"
            >
              <Locate className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search nearby…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-10 rounded-xl bg-muted/40 border border-border/30 pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Category chips */}
        <div ref={chipsRef} className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4 [-webkit-overflow-scrolling:touch]">
          {CATEGORIES.map(cat => {
            const active = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => { haptic("light"); setActiveCategory(cat.key); }}
                className={`shrink-0 inline-flex items-center gap-1.5 h-8 rounded-lg px-3 text-xs font-semibold transition-all ${
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted/60 border border-border/30"
                }`}
              >
                <cat.icon className="h-3.5 w-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Compact control bar */}
        <div className="flex items-center gap-2 pb-1.5">
          {/* Map/List toggle */}
          <div className="flex rounded-lg border border-border/30 bg-muted/30 p-0.5">
            {(["map", "list"] as const).map(mode => (
              <button
                key={mode}
                onClick={() => { haptic("light"); setViewMode(mode); }}
                className={`flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-semibold transition-all ${
                  viewMode === mode
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {mode === "map" ? <MapIcon className="h-3.5 w-3.5" /> : <List className="h-3.5 w-3.5" />}
                {mode === "map" ? "Map" : "List"}
              </button>
            ))}
          </div>

          {/* Radius selector */}
          <div className="relative">
            <button
              onClick={() => { haptic("light"); setShowRadiusPicker(!showRadiusPicker); }}
              className="flex items-center gap-1.5 h-8 rounded-lg border border-border/30 bg-muted/30 px-3 text-xs font-semibold text-muted-foreground hover:text-foreground transition-all"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {radius >= 1000 ? `${radius / 1000} km` : `${radius} m`}
            </button>
            <AnimatePresence>
              {showRadiusPicker && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-10 left-0 z-30 rounded-xl border border-border/40 bg-card shadow-xl p-1.5 min-w-[120px]"
                >
                  {RADIUS_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { setRadius(opt.value); setShowRadiusPicker(false); haptic("light"); }}
                      className={`w-full text-left rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                        radius === opt.value
                          ? "bg-primary/10 text-primary"
                          : "text-foreground hover:bg-muted/50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Active filter badge */}
          {activeCategory !== "all" && (
            <motion.button
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={() => { setActiveCategory("all"); haptic("light"); }}
              className="flex items-center gap-1 h-8 rounded-lg bg-primary/10 text-primary px-2.5 text-xs font-bold"
            >
              {activeCategory}
              <X className="h-3 w-3" />
            </motion.button>
          )}

          {/* Count badge */}
          <span className="ml-auto text-[10px] font-bold text-muted-foreground tabular-nums">
            {filtered.length} nearby
          </span>
        </div>
      </div>

      {/* ═══ CONTENT AREA ═══ */}
      <div className="flex-1 min-h-0 relative">
        {viewMode === "map" ? (
          <>
            {/* Map container — always mounted when in map mode */}
            <div ref={mapContainerRef} className="absolute inset-0" />

            {/* Fallback overlay while map loads */}
            {!mapReady && (
              <div className="absolute inset-0 z-10 overflow-y-auto p-3 pb-24 bg-background">
                <MapFallback onRetry={() => window.location.reload()} />
                {!loading && filtered.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">À proximité</p>
                    {filtered.slice(0, 3).map((l, i) => (
                      <NearbyCard key={l.id} listing={l} index={i} />
                    ))}
                  </div>
                ) : (
                  <NearbyPreview items={FALLBACK_NEARBY} />
                )}
              </div>
            )}

            {/* Legend */}
            {mapReady && <MapLegend />}
          </>
        ) : (
          /* ─── LIST MODE ─── */
          <div className="h-full overflow-y-auto px-4 py-3 space-y-2 pb-24">
            {loading ? (
              <div className="space-y-2.5">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-16 rounded-2xl bg-muted/30 animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted/40 flex items-center justify-center mb-4">
                  <MapPin className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="text-sm font-semibold text-foreground">No listings nearby</p>
                <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters or radius.</p>
              </div>
            ) : (
              filtered.map((l, i) => <NearbyCard key={l.id} listing={l} index={i} />)
            )}
          </div>
        )}
      </div>

      {/* Close radius picker when clicking outside */}
      {showRadiusPicker && (
        <div className="fixed inset-0 z-20" onClick={() => setShowRadiusPicker(false)} />
      )}
    </div>
  );
}
