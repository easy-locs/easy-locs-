import { useEffect, useRef, memo } from "react";
import type mapboxgl from "mapbox-gl";
import { loadMapbox } from "@/lib/mapbox/mapbox-loader";
import { MAPBOX_ACCESS_TOKEN, getMapboxTokenError } from "@/lib/mapbox/config";
import { MapErrorBoundary } from "@/components/map/MapErrorBoundary";
import { useLocationStore } from "@/stores/locationStore";
import { Navigation, Maximize2, MapPin } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import MapErrorFallback from "@/components/map/MapErrorFallback";
import { useMapErrorHandler } from "@/hooks/useMapErrorHandler";

interface ClientMapCardProps {
  storeLat: number;
  storeLng: number;
  storeName: string;
  storeStatus?: "open" | "closed";
  storeCategory?: string;
  storeLogoUrl?: string;
  onViewMenu?: () => void;
  onDirections?: () => void;
  onExpand?: () => void;
  className?: string;
}

export default memo(function ClientMapCard({
  storeLat,
  storeLng,
  storeName,
  storeStatus = "open",
  storeCategory,
  storeLogoUrl,
  onViewMenu,
  onDirections,
  onExpand,
  className = "",
}: ClientMapCardProps) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const userLoc = useLocationStore((s) => s.currentLocation);
  const { mapError, handleMapError, clearMapError } = useMapErrorHandler("ClientMapCard");

  const distKm = userLoc
    ? Math.sqrt(
        Math.pow((storeLat - userLoc.lat) * 111, 2) +
        Math.pow((storeLng - userLoc.lng) * 111 * Math.cos(storeLat * Math.PI / 180), 2)
      )
    : null;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const tokenError = getMapboxTokenError();
    if (tokenError) {
      handleMapError(tokenError, { lat: storeLat, lng: storeLng, zoom: 15 });
      return;
    }

    let cancelled = false;
    clearMapError();

    if (!MAPBOX_ACCESS_TOKEN?.trim()) {
      handleMapError("Map not configured", { lat: storeLat, lng: storeLng, zoom: 15 });
      return;
    }

    loadMapbox().then((mapboxgl) => {
      if (cancelled || !containerRef.current) return;
      mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

      try {
        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: "mapbox://styles/mapbox/dark-v11",
          center: [storeLng, storeLat],
          zoom: 15,
          attributionControl: false,
          interactive: false,
        });

        map.on("error", (e: mapboxgl.ErrorEvent & { error?: { message?: string } }) => {
          const msg = (e.error?.message || String(e.error ?? "")).toLowerCase();
          if (msg.includes("401") || msg.includes("403") || msg.includes("access token") || msg.includes("unauthorized")) {
            handleMapError("Mapbox token is invalid or expired.", { lat: storeLat, lng: storeLng, zoom: 15 });
          }
        });

        map.on("load", () => {
          if (cancelled) return;
          const storeEl = document.createElement("div");
          storeEl.style.cssText = "width:32px;height:32px;border-radius:50%;background:hsl(var(--primary));border:3px solid white;box-shadow:0 2px 12px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:16px;";
          storeEl.textContent = "📍";
          new mapboxgl.Marker(storeEl).setLngLat([storeLng, storeLat]).addTo(map);

          if (userLoc) {
            const userEl = document.createElement("div");
            userEl.style.cssText = "width:14px;height:14px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 10px rgba(59,130,246,0.5);";
            new mapboxgl.Marker(userEl).setLngLat([userLoc.lng, userLoc.lat]).addTo(map);

            const bounds = new mapboxgl.LngLatBounds();
            bounds.extend([storeLng, storeLat]);
            bounds.extend([userLoc.lng, userLoc.lat]);
            map.fitBounds(bounds, { padding: 40, maxZoom: 15 });
          }
        });

        mapRef.current = map;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Map unavailable";
        handleMapError(msg, { lat: storeLat, lng: storeLng, zoom: 15 });
      }
    }).catch((err: unknown) => {
      if (!cancelled) {
        const msg = err instanceof Error ? err.message : "Failed to load map";
        handleMapError(msg, { lat: storeLat, lng: storeLng, zoom: 15 });
      }
    });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <MapErrorBoundary fallbackHeight={200}>
    <div className={`rounded-2xl overflow-hidden border border-border/20 bg-card shadow-sm ${className}`}>
      <div className="relative h-[140px]">
        {mapError ? (
          <MapErrorFallback
            message={mapError}
            locationLabel={storeName}
            lat={storeLat}
            lng={storeLng}
            compact
            className="absolute inset-0"
          />
        ) : (
          <div ref={containerRef} className="absolute inset-0" />
        )}
        {onExpand && (
          <button
            onClick={onExpand}
            className="absolute top-2 right-2 z-10 w-8 h-8 rounded-xl bg-card/90 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform border border-border/20"
          >
            <Maximize2 className="h-3.5 w-3.5 text-foreground" />
          </button>
        )}
      </div>

      <div className="px-3 py-2.5 flex items-center gap-3">
        {storeLogoUrl ? (
          <img src={storeLogoUrl} alt="" className="w-9 h-9 rounded-xl object-cover ring-1 ring-border/10 shrink-0" loading="lazy" />
        ) : (
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <MapPin className="h-4 w-4 text-primary" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground truncate">{storeName}</p>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            {storeCategory && <span>{storeCategory}</span>}
            <span className={storeStatus === "open" ? "text-green-500 font-semibold" : "text-destructive"}>
              {storeStatus === "open" ? t("common.open") : t("common.closed")}
            </span>
            {distKm != null && <span>• {distKm < 1 ? `${Math.round(distKm * 1000)}m` : `${distKm.toFixed(1)}km`}</span>}
          </div>
        </div>

        <div className="flex gap-1.5 shrink-0">
          {onDirections && (
            <button
              onClick={onDirections}
              className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center active:scale-90 transition-transform"
            >
              <Navigation className="h-3.5 w-3.5 text-primary" />
            </button>
          )}
          {onViewMenu && (
            <button
              onClick={onViewMenu}
              className="px-3 h-8 rounded-xl bg-primary text-primary-foreground text-xs font-bold active:scale-95 transition-transform"
            >
              View
            </button>
          )}
        </div>
      </div>
    </div>
    </MapErrorBoundary>
  );
});
