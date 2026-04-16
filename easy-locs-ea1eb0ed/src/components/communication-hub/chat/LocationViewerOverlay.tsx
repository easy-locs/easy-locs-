import { memo, useEffect, useRef } from "react";
import type maplibregl from "maplibre-gl";
import { loadMapLibre, getMapLibreGL } from "@/lib/maplibre/maplibre-loader";
import { X, Navigation, Compass, MapPin } from "lucide-react";
import { useLocationViewer } from "@/families/location";
import { useInAppNavigation } from "@/stores/useInAppNavigation";
import { useGeoStore } from "@/lib/geo/geo-store";
import { getMapTokenError, getMapStyleUrl } from "@/lib/maplibre/config";
import { MapErrorBoundary } from "@/components/map/MapErrorBoundary";
import MapErrorFallback from "@/components/map/MapErrorFallback";
import { useMapErrorHandler } from "@/hooks/useMapErrorHandler";
import { useMapRetry } from "@/hooks/map/useMapRetry";
import { useNetworkRecovery } from "@/hooks/map/useNetworkRecovery";
import { useI18n } from "@/lib/i18n";

function LocationViewerOverlayInner() {
  const { t } = useI18n();
  const { open, lat, lng, label, mode, isLive, close } = useLocationViewer();
  const openNavigation = useInAppNavigation((s) => s.openNavigation);
  const userPoint = useGeoStore((s) => s.point);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const { mapError, handleMapError, clearMapError } = useMapErrorHandler("LocationViewerOverlay");
  const retry = useMapRetry();

  const handleRetry = () => {
    clearMapError();
    retry.triggerRetry();
  };

  const { isOffline } = useNetworkRecovery({
    enabled: !!mapError,
    onReconnect: handleRetry,
  });

  useEffect(() => {
    if (!open || lat == null || lng == null || !containerRef.current) return;

    const tokenError = getMapTokenError();
    if (tokenError) {
      handleMapError(tokenError, { lat, lng, zoom: 15 });
      return;
    }

    let cancelled = false;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
    userMarkerRef.current = null;
    clearMapError();

    loadMapLibre().then((maplibregl) => {
      if (cancelled || !containerRef.current) return;

      try {
        const map = new maplibregl.Map({
          container: containerRef.current,
          style: getMapStyleUrl("dark"),
          center: [lng!, lat!],
          zoom: 15,
          attributionControl: false,
          maxZoom: 18,
        });
        mapRef.current = map;

        map.on("error", (e: maplibregl.ErrorEvent & { error?: { message?: string } }) => {
          const msg = e.error?.message || String(e.error ?? "");
          if (msg.includes("401") || msg.includes("403") || msg.includes("access token")) {
            handleMapError("Map token is invalid or expired.", { lat, lng, zoom: 15 });
          }
        });

        map.on("load", () => {
          const destEl = document.createElement("div");
          destEl.style.cssText = "width:32px;height:32px;border-radius:50%;background:hsl(0,72%,51%);border:3px solid white;box-shadow:0 2px 12px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;";
          destEl.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`;
          new maplibregl.Marker(destEl).setLngLat([lng!, lat!]).addTo(map);

          const currentPoint = useGeoStore.getState().point;
          if (currentPoint) {
            const userEl = document.createElement("div");
            userEl.style.cssText = "width:14px;height:14px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 10px rgba(59,130,246,0.5);";
            userMarkerRef.current = new maplibregl.Marker(userEl).setLngLat([currentPoint.lng, currentPoint.lat]).addTo(map);

            const bounds = new maplibregl.LngLatBounds();
            bounds.extend([lng!, lat!]);
            bounds.extend([currentPoint.lng, currentPoint.lat]);
            map.fitBounds(bounds, { padding: 60, maxZoom: 16 });
          }
        });
      } catch (err) {
        handleMapError(err instanceof Error ? err.message : "Failed to initialize map", { lat, lng, zoom: 15 });
      }
    }).catch((err) => {
      if (!cancelled) handleMapError(err instanceof Error ? err.message : "Failed to load map", { lat, lng, zoom: 15 });
    });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      userMarkerRef.current = null;
    };
  }, [open, lat, lng, retry.retryKey]);

  useEffect(() => {
    if (!open || !mapRef.current || !userPoint || lat == null || lng == null) return;
    const map = mapRef.current;
    const gl = getMapLibreGL();
    if (!gl) return;

    if (!userMarkerRef.current) {
      const userEl = document.createElement("div");
      userEl.style.cssText = "width:14px;height:14px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 10px rgba(59,130,246,0.5);";
      userMarkerRef.current = new gl.Marker(userEl).setLngLat([userPoint.lng, userPoint.lat]).addTo(map);

      const bounds = new gl.LngLatBounds();
      bounds.extend([lng, lat]);
      bounds.extend([userPoint.lng, userPoint.lat]);
      map.fitBounds(bounds, { padding: 60, maxZoom: 16 });
    } else {
      userMarkerRef.current.setLngLat([userPoint.lng, userPoint.lat]);
    }
  }, [userPoint?.lat, userPoint?.lng, open, lat, lng]);

  if (!open || lat == null || lng == null) return null;

  const handleDirections = () => {
    close();
    openNavigation({ lat, lng, label: label || undefined });
  };

  return (
    <div className="fixed inset-0 z-max flex flex-col" style={{ background: "hsl(var(--background))" }}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "hsl(var(--border) / 0.2)" }}>
        <div className="flex items-center gap-2">
          {isLive ? (
            <Navigation className="h-5 w-5" style={{ color: "hsl(var(--primary))" }} />
          ) : (
            <Compass className="h-5 w-5" style={{ color: "hsl(var(--primary))" }} />
          )}
          <div>
            <p className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>
              {label || (isLive ? t("common.live_location") : t("common.location"))}
            </p>
            {isLive && (
              <p className="text-[0.625rem] font-medium flex items-center gap-1" style={{ color: "hsl(var(--primary))" }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "hsl(var(--primary))" }} />
                {t("common.sharing_live")}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={close}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-80"
          style={{ background: "hsl(var(--muted))" }}
        >
          <X className="h-4 w-4" style={{ color: "hsl(var(--foreground))" }} />
        </button>
      </div>

      <div className="flex-1 relative">
        {mapError ? (
          <MapErrorFallback
            message={mapError}
            title="Location map unavailable"
            icon={Compass}
            className="absolute inset-0"
            onRetry={handleRetry}
            isOffline={isOffline}
            isOnCooldown={retry.isOnCooldown}
            cooldownRemaining={retry.cooldownRemaining}
            retryCount={retry.retryCount}
            maxRetries={retry.maxRetries}
            exhausted={retry.exhausted}
          />
        ) : (
          <MapErrorBoundary fallbackTitle="Location map unavailable" fallbackIcon={Compass}>
            <div ref={containerRef} className="absolute inset-0" />
          </MapErrorBoundary>
        )}
      </div>

      <div className="flex items-center justify-center gap-3 px-4 py-3 border-t" style={{ borderColor: "hsl(var(--border) / 0.2)" }}>
        <p className="text-[0.6875rem]" style={{ color: "hsl(var(--muted-foreground))" }}>
          {lat.toFixed(6)}, {lng.toFixed(6)}
        </p>
        <button
          onClick={handleDirections}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
          style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
        >
          <Navigation className="h-3.5 w-3.5" />
          Navigate
        </button>
      </div>
    </div>
  );
}

export const LocationViewerOverlay = memo(LocationViewerOverlayInner);
LocationViewerOverlay.displayName = "LocationViewerOverlay";
