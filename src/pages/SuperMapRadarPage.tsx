import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import mapboxgl, { GeoJSONSource, LngLatLike, Map as MapboxMap, Marker } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Search, Crosshair, Navigation, Store, Package, MapPin, Radar, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import UniversalActionButtons from "@/components/actions/UniversalActionButtons";
import UniversalEntityCard from "@/components/actions/UniversalEntityCard";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || "pk.eyJ1IjoiZWFzeWxvY3MyMDI2IiwiYSI6ImNtbXY0em5lYTJpaHQycHF0c3hrMGh4eHkifQ.y2GKHz1tZ_ZA6sFrEAvz7w";

type ShopRow = {
  id: string;
  name: string | null;
  slug: string | null;
  description: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  logo_url?: string | null;
  user_id?: string | null;
  published?: boolean | null;
};

type ProductRow = {
  id: string;
  title: string | null;
  description: string | null;
  price: number | null;
  currency: string | null;
  photo_url?: string | null;
  shop_id?: string | null;
  storefront_pages?: {
    id: string;
    slug: string | null;
    name: string | null;
    lat: number | null;
    lng: number | null;
  } | null;
};

type SearchResult =
  | {
      kind: "shop";
      id: string;
      title: string;
      subtitle: string;
      lat: number | null;
      lng: number | null;
      slug: string | null;
    }
  | {
      kind: "product";
      id: string;
      title: string;
      subtitle: string;
      lat: number | null;
      lng: number | null;
      shopSlug: string | null;
      productId: string;
    };

type UserPos = {
  lng: number;
  lat: number;
  accuracy?: number;
};

const DEFAULT_CENTER: [number, number] = [55.2708, 25.2048];
const SOURCE_ID = "radar-shops-source";
const RINGS_SOURCE_ID = "radar-rings-source";

function fmtMoney(amount?: number | null, currency = "AED") {
  if (amount == null) return "";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s1 =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((aLat * Math.PI) / 180) *
      Math.cos((bLat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return 2 * R * Math.atan2(Math.sqrt(s1), Math.sqrt(1 - s1));
}

function makeShopGeoJson(shops: ShopRow[]) {
  return {
    type: "FeatureCollection" as const,
    features: shops
      .filter((s) => s.lng != null && s.lat != null)
      .map((s) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [s.lng as number, s.lat as number],
        },
        properties: {
          id: s.id,
          name: s.name || "Shop",
          slug: s.slug || "",
          city: s.city || "",
          description: s.description || "",
        },
      })),
  };
}

function circlePolygon(center: [number, number], radiusKm: number, points = 64) {
  const [lng, lat] = center;
  const coords: [number, number][] = [];
  const earthRadiusKm = 6371;

  for (let i = 0; i <= points; i++) {
    const bearing = (i / points) * 2 * Math.PI;
    const lat1 = (lat * Math.PI) / 180;
    const lng1 = (lng * Math.PI) / 180;
    const dByR = radiusKm / earthRadiusKm;

    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(dByR) +
        Math.cos(lat1) * Math.sin(dByR) * Math.cos(bearing)
    );

    const lng2 =
      lng1 +
      Math.atan2(
        Math.sin(bearing) * Math.sin(dByR) * Math.cos(lat1),
        Math.cos(dByR) - Math.sin(lat1) * Math.sin(lat2)
      );

    coords.push([(lng2 * 180) / Math.PI, (lat2 * 180) / Math.PI]);
  }

  return {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        geometry: {
          type: "Polygon" as const,
          coordinates: [coords],
        },
        properties: {},
      },
    ],
  };
}

function useRealtimeShops() {
  const [shops, setShops] = useState<ShopRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("storefront_pages")
      .select("id, name, slug, description, city, lat, lng, logo_url, user_id, published")
      .eq("published", true);

    if (!error) {
      setShops((data || []) as ShopRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();

    const ch = supabase
      .channel("super-map-radar-shops")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "storefront_pages" },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [load]);

  return { shops, loading, reload: load };
}

function useProductSearch(query: string) {
  const [items, setItems] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const q = query.trim();

    async function run() {
      if (!q || q.length < 2) {
        setItems([]);
        return;
      }

      setLoading(true);

      const [shopsRes, productsRes] = await Promise.all([
        (supabase as any)
          .from("storefront_pages")
          .select("id, name, slug, description, city, lat, lng")
          .eq("published", true)
          .or(`name.ilike.%${q}%,description.ilike.%${q}%,city.ilike.%${q}%`)
          .limit(8),
        (supabase as any)
          .from("catalog_items")
          .select(
            "id, title, description, price, currency, photo_url, shop_id, storefront_pages!catalog_items_shop_id_fkey(id, slug, name, lat, lng)"
          )
          .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
          .limit(12),
      ]);

      if (!active) return;

      const shopResults: SearchResult[] = ((shopsRes.data || []) as ShopRow[]).map((s) => ({
        kind: "shop" as const,
        id: s.id,
        title: s.name || "Shop",
        subtitle: [s.city, s.description].filter(Boolean).join(" • "),
        lat: s.lat,
        lng: s.lng,
        slug: s.slug,
      }));

      const productResults: SearchResult[] = ((productsRes.data || []) as ProductRow[]).map((p) => ({
        kind: "product" as const,
        id: p.id,
        productId: p.id,
        title: p.title || "Product",
        subtitle: [fmtMoney(p.price, p.currency || "AED"), p.storefront_pages?.name]
          .filter(Boolean)
          .join(" • "),
        lat: p.storefront_pages?.lat ?? null,
        lng: p.storefront_pages?.lng ?? null,
        shopSlug: p.storefront_pages?.slug ?? null,
      }));

      setItems([...shopResults, ...productResults]);
      setLoading(false);
    }

    const t = setTimeout(run, 220);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [query]);

  return { items, loading };
}

export default function SuperMapRadarPage() {
  const navigate = useNavigate();
  const mapRef = useRef<MapboxMap | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const userMarkerRef = useRef<Marker | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const shopsRef = useRef<ShopRow[]>([]);

  const { shops, loading: shopsLoading } = useRealtimeShops();
  shopsRef.current = shops;

  const [userPos, setUserPos] = useState<UserPos | null>(null);
  const [radarKm, setRadarKm] = useState(5);
  const [query, setQuery] = useState("");
  const [selectedShop, setSelectedShop] = useState<ShopRow | null>(null);
  const [geoError, setGeoError] = useState("");
  const [mapReady, setMapReady] = useState(false);

  const { items: searchResults, loading: searchLoading } = useProductSearch(query);

  const nearbyShops = useMemo(() => {
    if (!userPos) return [];
    return shops
      .filter((s) => s.lat != null && s.lng != null)
      .map((s) => ({
        ...s,
        distanceKm: haversineKm(userPos.lat, userPos.lng, s.lat as number, s.lng as number),
      }))
      .filter((s) => s.distanceKm <= radarKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [shops, userPos, radarKm]);

  /* ── Map init ── */
  const initMap = useCallback(() => {
    if (mapRef.current || !mapContainerRef.current || !mapboxgl.accessToken) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: DEFAULT_CENTER as LngLatLike,
      zoom: 11,
      pitch: 20,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: true, showZoom: true }), "top-right");

    map.on("load", () => {
      map.addSource(SOURCE_ID, { type: "geojson", data: makeShopGeoJson([]) });

      map.addLayer({
        id: "shops-circle",
        type: "circle",
        source: SOURCE_ID,
        paint: {
          "circle-radius": 8,
          "circle-color": "#38bdf8",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });

      map.addLayer({
        id: "shops-label",
        type: "symbol",
        source: SOURCE_ID,
        layout: {
          "text-field": ["get", "name"],
          "text-size": 11,
          "text-offset": [0, 1.3],
          "text-anchor": "top",
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "#031633",
          "text-halo-width": 1,
        },
      });

      map.addSource(RINGS_SOURCE_ID, { type: "geojson", data: circlePolygon(DEFAULT_CENTER, radarKm) });

      map.addLayer({
        id: "radar-fill",
        type: "fill",
        source: RINGS_SOURCE_ID,
        paint: { "fill-color": "#0ea5e9", "fill-opacity": 0.08 },
      });

      map.addLayer({
        id: "radar-outline",
        type: "line",
        source: RINGS_SOURCE_ID,
        paint: { "line-color": "#38bdf8", "line-width": 2, "line-opacity": 0.85 },
      });

      map.on("click", "shops-circle", (e) => {
        const feature = e.features?.[0];
        if (!feature) return;
        const id = feature.properties?.id;
        const shop = shopsRef.current.find((s) => s.id === id);
        if (shop) setSelectedShop(shop);
      });

      map.on("mouseenter", "shops-circle", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "shops-circle", () => {
        map.getCanvas().style.cursor = "";
      });

      setMapReady(true);
    });

    mapRef.current = map;
  }, [radarKm]);

  useEffect(() => {
    initMap();
    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (userMarkerRef.current) userMarkerRef.current.remove();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [initMap]);

  /* ── Sync shop data → map ── */
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const src = mapRef.current.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    if (src) src.setData(makeShopGeoJson(shops));
  }, [shops, mapReady]);

  /* ── Sync radar ring ── */
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const center: [number, number] = userPos ? [userPos.lng, userPos.lat] : DEFAULT_CENTER;
    const src = mapRef.current.getSource(RINGS_SOURCE_ID) as GeoJSONSource | undefined;
    if (src) src.setData(circlePolygon(center, radarKm));
  }, [userPos, radarKm, mapReady]);

  /* ── Geo helpers ── */
  const startLiveGeo = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation not available on this device.");
      return;
    }
    setGeoError("");
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const next: UserPos = {
          lng: pos.coords.longitude,
          lat: pos.coords.latitude,
          accuracy: pos.coords.accuracy,
        };
        setUserPos(next);

        if (mapRef.current) {
          if (!userMarkerRef.current) {
            const el = document.createElement("div");
            el.className = "super-radar-user-dot";
            userMarkerRef.current = new mapboxgl.Marker({ element: el })
              .setLngLat([next.lng, next.lat])
              .addTo(mapRef.current);
          } else {
            userMarkerRef.current.setLngLat([next.lng, next.lat]);
          }
        }
      },
      (err) => {
        setGeoError(err.message || "Unable to get location.");
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
  }, []);

  const centerOnUser = useCallback(() => {
    if (!userPos || !mapRef.current) return;
    mapRef.current.flyTo({ center: [userPos.lng, userPos.lat], zoom: 14, speed: 0.8, essential: true });
  }, [userPos]);

  const handleResultClick = useCallback(
    (item: SearchResult) => {
      setQuery("");
      if (item.lat != null && item.lng != null && mapRef.current) {
        mapRef.current.flyTo({ center: [item.lng, item.lat], zoom: 15, speed: 0.9, essential: true });
      }
      if (item.kind === "shop" && item.slug) {
        const shop = shops.find((s) => s.id === item.id);
        if (shop) setSelectedShop(shop);
      }
      if (item.kind === "product" && item.shopSlug) {
        navigate(`/p/${item.productId}`);
      }
    },
    [navigate, shops]
  );

  /* ── Render ── */
  return (
    <div className="relative w-full h-screen overflow-hidden bg-background">
      <style>{`
        .super-radar-user-dot {
          width: 18px; height: 18px; border-radius: 50%;
          background: radial-gradient(circle at 40% 40%, #93c5fd, #3b82f6);
          border: 3px solid white;
          box-shadow: 0 0 16px rgba(59,130,246,0.6);
          animation: pulse-ring 2s ease-out infinite;
        }
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(59,130,246,0.5); }
          100% { box-shadow: 0 0 0 20px rgba(59,130,246,0); }
        }
      `}</style>

      {/* Map container */}
      <div ref={mapContainerRef} className="absolute inset-0" />

      {/* Search bar */}
      <div className="absolute top-4 left-4 right-4 z-10">
        <div className="flex items-center gap-2 rounded-xl bg-card/90 backdrop-blur-md border border-border px-3 py-2 shadow-lg">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products, shops, places..."
          />
          {query ? (
            <button
              onClick={() => setQuery("")}
              className="bg-transparent border-0 text-foreground p-0"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        {/* Action chips */}
        <div className="flex items-center gap-2 mt-2 overflow-x-auto no-scrollbar">
          <button
            onClick={startLiveGeo}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-primary/20 text-primary border border-primary/30 backdrop-blur-sm shrink-0"
          >
            <Navigation className="h-3 w-3" />
            Live GPS
          </button>
          <button
            onClick={centerOnUser}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-card/80 text-foreground border border-border backdrop-blur-sm shrink-0"
          >
            <Crosshair className="h-3 w-3" />
            Center
          </button>
          {[1, 3, 5, 10].map((km) => (
            <button
              key={km}
              onClick={() => setRadarKm(km)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm shrink-0 border ${
                radarKm === km
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card/80 text-foreground border-border"
              }`}
            >
              <Radar className="h-3 w-3" />
              {km} km
            </button>
          ))}
        </div>

        {/* Search results dropdown */}
        {query.trim().length >= 2 && (
          <div className="mt-2 max-h-64 overflow-y-auto rounded-xl bg-card/95 backdrop-blur-md border border-border shadow-lg space-y-1 p-1">
            {searchLoading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching...
              </div>
            ) : searchResults.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-6">No results</p>
            ) : (
              searchResults.map((item) => (
                <UniversalEntityCard
                  key={item.id}
                  entityType={item.kind === "shop" ? "shop" : "product"}
                  entityId={item.kind === "product" ? (item as any).productId : item.id}
                  slug={item.kind === "shop" ? (item as any).slug : (item as any).shopSlug}
                  title={item.title}
                  subtitle={item.subtitle}
                  compact
                  metadata={{ source: "map_search" }}
                  onActionComplete={() => setQuery("")}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* Selected shop card */}
      {selectedShop && (
        <div className="absolute bottom-28 left-4 right-4 z-10 bg-card/95 backdrop-blur-md border border-border rounded-2xl p-4 shadow-xl">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-foreground truncate">{selectedShop.name || "Shop"}</h3>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {[selectedShop.city, selectedShop.description].filter(Boolean).join(" • ")}
              </p>
            </div>
            <button
              onClick={() => setSelectedShop(null)}
              className="bg-transparent border-0 text-muted-foreground p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <UniversalActionButtons
            entityType="shop"
            entityId={selectedShop.id}
            slug={selectedShop.slug}
            title={selectedShop.name}
            recipientId={selectedShop.user_id}
            recipientName={selectedShop.name}
            compact
            metadata={{ source: "map_radar" }}
          />
        </div>
      )}

      {/* Bottom radar panel */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-card/95 backdrop-blur-md border-t border-border">
        <div className="px-4 pt-3 pb-4 safe-area-pb">
          <h4 className="text-sm font-bold text-foreground mb-1">Live Radar</h4>
          <p className="text-xs text-muted-foreground mb-3">
            {geoError
              ? geoError
              : userPos
              ? "Realtime nearby discovery active"
              : "Tap Live GPS to start nearby radar"}
          </p>

          {/* Stats row */}
          <div className="flex gap-3 mb-3">
            <div className="flex-1 bg-muted/50 rounded-lg px-3 py-2 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Nearby</p>
              <p className="text-lg font-bold text-foreground">{nearbyShops.length}</p>
            </div>
            <div className="flex-1 bg-muted/50 rounded-lg px-3 py-2 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Radius</p>
              <p className="text-lg font-bold text-foreground">{radarKm} km</p>
            </div>
            <div className="flex-1 bg-muted/50 rounded-lg px-3 py-2 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Shops live</p>
              <p className="text-lg font-bold text-foreground">{shopsLoading ? "..." : shops.length}</p>
            </div>
          </div>

          {/* Nearby list */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {nearbyShops.slice(0, 5).map((shop) => (
              <div
                key={shop.id}
                className="shrink-0 min-w-[200px] cursor-pointer"
                onClick={() => {
                  setSelectedShop(shop);
                  if (mapRef.current && shop.lng != null && shop.lat != null) {
                    mapRef.current.flyTo({
                      center: [shop.lng, shop.lat],
                      zoom: 15,
                      speed: 0.9,
                      essential: true,
                    });
                  }
                }}
              >
                <UniversalEntityCard
                  entityType="shop"
                  entityId={shop.id}
                  slug={shop.slug}
                  title={shop.name || "Shop"}
                  subtitle={`${shop.distanceKm.toFixed(1)} km • ${shop.city || "Nearby"}`}
                  recipientId={shop.user_id}
                  recipientName={shop.name}
                  compact
                  metadata={{ source: "map_nearby" }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
