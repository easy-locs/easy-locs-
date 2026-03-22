/**
 * ExplorerMap — Full-screen Mapbox map for the Explorer page.
 * Renders geo entities as markers with clustering, category filtering, and card sync.
 */
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useLocationStore } from "@/stores/locationStore";
import { filterByRadius, sortByDistance, formatDistance } from "@/lib/radar/radar-engine";
import { LocationSearchInput } from "./LocationSearchInput";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  Locate, List, Map as MapIcon, Expand, UtensilsCrossed, ShoppingCart, Building2, Wrench, Compass, Car,
} from "lucide-react";
import type { GeoEntity } from "@/lib/geo/geoEntityAdapter";
import type { ResolvedPlace } from "@/stores/locationStore";
import { MAPBOX_ACCESS_TOKEN } from "@/lib/mapbox/config";

const CATEGORIES = [
  { key: "all", label: "All", icon: Compass },
  { key: "restaurant", label: "Food", icon: UtensilsCrossed },
  { key: "grocery", label: "Grocery", icon: ShoppingCart },
  { key: "service", label: "Services", icon: Wrench },
  { key: "property", label: "Property", icon: Building2 },
] as const;

const MARKER_COLORS: Record<string, string> = {
  restaurant: "#ef4444",
  grocery: "#22c55e",
  shop: "#f59e0b",
  service: "#3b82f6",
  property: "#8b5cf6",
  real_estate: "#8b5cf6",
  hotel: "#06b6d4",
  driver: "#10b981",
};

export default function ExplorerMap() {
  return <ExplorerMapInner />;
}

type ExploreMapItem = {
  id: string;
  title?: string;
  city?: string;
  country?: string;
  category?: string;
  _type?: string;
  route_path?: string;
  slug?: string;
  booking_slug?: string;
  photo_urls?: string[] | null;
  cover_url?: string | null;
  image_url?: string | null;
  lat?: number | null;
  lng?: number | null;
  latitude?: number | null;
  longitude?: number | null;
};

export function ExplorerMapInner({
  items,
  radiusKm,
  selectedId,
  onSelectId,
  compact = false,
}: {
  items?: ExploreMapItem[];
  radiusKm?: number;
  selectedId?: string | null;
  onSelectId?: (id: string | null) => void;
  compact?: boolean;
}) {
  const navigate = useNavigate();
  const searchRadiusKm = useLocationStore((s) => s.searchRadiusKm);
  const currentLocation = useLocationStore((s) => s.currentLocation);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);

  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [activeCategory, setActiveCategory] = useState("all");
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);

  const isFallback = useLocationStore((s) => s.isFallback);
  const center = currentLocation || { lat: 25.2048, lng: 55.2708 };
  // Log when using fallback so it's visible in console
  useEffect(() => {
    if (isFallback && currentLocation) {
      console.warn("[ExplorerMap] Using fallback location — GPS permission denied or unavailable");
    }
  }, [isFallback, currentLocation]);
  const effectiveRadius = radiusKm ?? searchRadiusKm;
  const effectiveSelectedId = selectedId ?? internalSelectedId;

  const normalizedItems = useMemo(() => {
    if (!items) return [] as Array<GeoEntity & { route_path: string }>;
    return items
      .map((item) => {
        const lat = item.lat ?? item.latitude ?? null;
        const lng = item.lng ?? item.longitude ?? null;
        if (typeof lat !== "number" || typeof lng !== "number") return null;
        const routePath = item.route_path || (item._type === "seasonal"
          ? `/listing/${item.slug}`
          : item._type === "real-estate"
          ? `/properties/${item.slug}`
          : item.booking_slug
          ? `/book/${item.booking_slug}`
          : "#");
        return {
          id: item.id,
          lat,
          lng,
          type: item.category || item._type || "service",
          title: item.title || "Listing",
          subtitle: item.city || item.country || item.category || item._type || "",
          city: item.city || "",
          image_url: item.image_url || item.cover_url || item.photo_urls?.[0] || null,
          route_path: routePath,
        } as GeoEntity & { route_path: string };
      })
      .filter(Boolean) as Array<GeoEntity & { route_path: string }>;
  }, [items]);

  // Filter and sort entities
  const filtered = useMemo(() => {
    let list = normalizedItems;
    if (activeCategory !== "all") {
      list = list.filter((e) => e.type === activeCategory);
    }
    const nearby = filterByRadius(list, center, effectiveRadius);
    return sortByDistance(nearby, center);
  }, [normalizedItems, activeCategory, center, effectiveRadius]);

  const selectedEntity = filtered.find((e) => e.id === effectiveSelectedId) || null;

  // Init map
  useEffect(() => {
    if (viewMode !== "map" || !mapContainerRef.current || mapRef.current) return;
    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [center.lng, center.lat],
      zoom: 13,
      attributionControl: false,
    });
    // No NavigationControl — zoom via pinch/scroll only
    mapRef.current = map;

    // Force resize after load to fix container sizing issues
    map.on("load", () => {
      map.resize();
      console.log("[ExplorerMap] map loaded & resized");
    });
    map.on("error", (e) => {
      console.error("[ExplorerMap] map error:", e.error?.message || e);
    });
    // Also resize after a short delay for layout settle
    const resizeTimer = setTimeout(() => map.resize(), 300);

    return () => {
      clearTimeout(resizeTimer);
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

  // User marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !currentLocation) return;

    if (!userMarkerRef.current) {
      const el = document.createElement("div");
      el.style.cssText = "width:16px;height:16px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 12px rgba(59,130,246,0.5);";
      userMarkerRef.current = new mapboxgl.Marker(el)
        .setLngLat([currentLocation.lng, currentLocation.lat])
        .addTo(map);
    } else {
      userMarkerRef.current.setLngLat([currentLocation.lng, currentLocation.lat]);
    }
  }, [currentLocation]);

  // Render entity markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    filtered.forEach((entity) => {
      const color = MARKER_COLORS[entity.type] || "#6b7280";
      const el = document.createElement("div");
      el.style.cssText = `width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 2px 8px ${color}44;cursor:pointer;transition:transform 0.15s;`;
      el.addEventListener("mouseenter", () => { el.style.transform = "scale(1.4)"; });
      el.addEventListener("mouseleave", () => { el.style.transform = "scale(1)"; });

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([entity.lng, entity.lat])
        .addTo(map);

      el.addEventListener("click", () => {
          onSelectId?.(entity.id);
          setInternalSelectedId(entity.id);
        map.flyTo({ center: [entity.lng, entity.lat], zoom: 15, duration: 500 });
      });

      markersRef.current.push(marker);
    });
  }, [filtered]);

  const recenter = useCallback(() => {
    if (!mapRef.current || !currentLocation) return;
    mapRef.current.flyTo({ center: [currentLocation.lng, currentLocation.lat], zoom: 14, duration: 600 });
  }, [currentLocation]);

  const handleSearchSelect = (place: ResolvedPlace) => {
    if (!mapRef.current) return;
    mapRef.current.flyTo({ center: [place.lng, place.lat], zoom: 15, duration: 600 });
  };

  useEffect(() => {
    if (!selectedEntity || !mapRef.current) return;
    mapRef.current.flyTo({ center: [selectedEntity.lng, selectedEntity.lat], zoom: 15, duration: 500 });
  }, [selectedEntity]);

  return (
    <div className={`flex flex-col bg-background overflow-hidden ${compact ? "h-[360px] rounded-[28px] border border-border/40" : "h-[100dvh]"}`}>
      {/* Header */}
      <div className="shrink-0 px-4 pt-3 pb-2 space-y-2 bg-background/95 backdrop-blur-md z-20 border-b border-border/20">
        <LocationSearchInput onSelect={handleSearchSelect} placeholder="Search places nearby…" />

        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {CATEGORIES.map((cat) => {
            const active = activeCategory === cat.key;
            const Icon = cat.icon;
            return (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  active ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* View toggle */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{filtered.length} nearby</p>
          <div className="flex gap-1">
            {compact && (
              <Link
                to="/map"
                className="p-1.5 rounded-lg text-muted-foreground"
                aria-label="Open full map"
              >
                <Expand className="h-4 w-4" />
              </Link>
            )}
            <button
              onClick={() => setViewMode("map")}
              className={`p-1.5 rounded-lg ${viewMode === "map" ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
            >
              <MapIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg ${viewMode === "list" ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Map or List */}
      {viewMode === "map" ? (
        <div className="flex-1 relative min-h-[300px]">
          <div ref={mapContainerRef} className="absolute inset-0" style={{ minHeight: 300 }} />

          {/* Recenter */}
          <button
            onClick={recenter}
            className="absolute bottom-24 right-3 z-10 w-10 h-10 rounded-full bg-card/95 backdrop-blur-md border border-border/20 flex items-center justify-center shadow-lg active:scale-90 transition-transform"
          >
            <Locate className="h-4 w-4 text-primary" />
          </button>

          {/* Selected card */}
          <AnimatePresence>
            {selectedEntity && (
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="absolute bottom-20 left-4 right-4 z-10"
              >
                <EntityCard entity={selectedEntity} center={center} onTap={() => navigate(selectedEntity.route_path)} onClose={() => {
                  onSelectId?.(null);
                  setInternalSelectedId(null);
                }} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 pb-24">
          {filtered.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-12">No places found nearby</p>
          )}
          {filtered.map((entity) => (
            <EntityCard
              key={entity.id}
              entity={entity}
              center={center}
              onTap={() => navigate(entity.route_path)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EntityCard({
  entity,
  center,
  onTap,
  onClose,
}: {
  entity: GeoEntity & { _distKm?: number };
  center: { lat: number; lng: number };
  onTap: () => void;
  onClose?: () => void;
}) {
  const dist = entity._distKm ?? 0;
  return (
    <button
      onClick={onTap}
      className="w-full flex items-center gap-3 p-3 rounded-2xl border border-border/20 bg-card shadow-lg text-left active:scale-[0.98] transition-transform"
    >
      {entity.image_url ? (
        <img src={entity.image_url} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0 ring-1 ring-border/10" />
      ) : (
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Building2 className="h-5 w-5 text-primary" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{entity.title}</p>
        <p className="text-[11px] text-muted-foreground truncate">{entity.subtitle || entity.city || entity.type}</p>
      </div>
      <div className="shrink-0 text-right">
        <span className="text-xs font-bold text-primary">{formatDistance(dist)}</span>
        {entity.rating && <p className="text-[10px] text-muted-foreground">⭐ {entity.rating}</p>}
      </div>
    </button>
  );
}
