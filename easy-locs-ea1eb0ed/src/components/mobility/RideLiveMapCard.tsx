import { useEffect, useRef } from "react";
import { tc } from "@/lib/i18n-canonical";
import type { RideLiveRoute } from "@/lib/mobility/ride-live-route-engine";
import type maplibregl from "maplibre-gl";
import { loadMapbox } from "@/lib/mapbox/mapbox-loader";
import { getMapboxTokenError } from "@/lib/mapbox/config";
import { MapErrorBoundary } from "@/components/map/MapErrorBoundary";
import { useMapErrorHandler } from "@/hooks/useMapErrorHandler";
import { MapPin } from "lucide-react";

interface Props {
  route: RideLiveRoute | null;
}

export function RideLiveMapCard({ route }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const pickupMarkerRef = useRef<maplibregl.Marker | null>(null);
  const driverMarkerRef = useRef<maplibregl.Marker | null>(null);
  const readyRef = useRef(false);
  const { mapError, handleMapError } = useMapErrorHandler("RideLiveMapCard");

  const driverLat = route?.driver?.lat ?? 25.21;
  const driverLng = route?.driver?.lng ?? 55.27;
  const pickupLat = route?.pickup?.lat ?? 25.2048;
  const pickupLng = route?.pickup?.lng ?? 55.2708;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const tokenError = getMapboxTokenError();
    if (tokenError) {
      handleMapError(tokenError, { lat: pickupLat, lng: pickupLng, zoom: 13 });
      return;
    }

    let cancelled = false;

    loadMapbox().then((maplibregl) => {
      if (cancelled || !containerRef.current) return;

      try {
        const map = new maplibregl.Map({
          container: containerRef.current,
          style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
          center: [pickupLng, pickupLat],
          zoom: 13,
          attributionControl: false,
        });

        mapRef.current = map;

        map.on("error", (e: maplibregl.ErrorEvent & { error?: { message?: string } }) => {
          const msg = e.error?.message || String(e.error ?? "");
          if (msg.includes("401") || msg.includes("403") || msg.includes("access token")) {
            handleMapError("Mapbox token is invalid or expired.", { lat: pickupLat, lng: pickupLng, zoom: 13 });
          }
        });

        map.on("load", () => {
          if (cancelled) return;
          readyRef.current = true;
          updateMap(map, maplibregl);
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to initialize map";
        handleMapError(msg, { lat: pickupLat, lng: pickupLng, zoom: 13 });
      }
    }).catch((err) => {
      if (!cancelled) {
        const msg = err instanceof Error ? err.message : "Failed to load Mapbox";
        handleMapError(msg, { lat: pickupLat, lng: pickupLng, zoom: 13 });
      }
    });

    return () => {
      cancelled = true;
      pickupMarkerRef.current?.remove();
      driverMarkerRef.current?.remove();
      pickupMarkerRef.current = null;
      driverMarkerRef.current = null;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      readyRef.current = false;
    };
  }, []);

  function updateMap(map: maplibregl.Map, gl: typeof import("maplibre-gl").default) {
    if (pickupMarkerRef.current) {
      pickupMarkerRef.current.setLngLat([pickupLng, pickupLat]);
    } else {
      const pickupEl = document.createElement("div");
      pickupEl.innerHTML = `<div style="width:28px;height:28px;border-radius:50%;background:#3b82f6;border:3px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 12px rgba(59,130,246,0.4);font-size:12px;">📍</div>`;
      pickupMarkerRef.current = new gl.Marker(pickupEl).setLngLat([pickupLng, pickupLat]).addTo(map);
    }

    if (route?.hasLiveDriver) {
      if (driverMarkerRef.current) {
        driverMarkerRef.current.setLngLat([driverLng, driverLat]);
      } else {
        const driverEl = document.createElement("div");
        driverEl.innerHTML = `<div style="width:32px;height:32px;border-radius:50%;background:hsl(220,15%,15%);border:2px solid hsl(142,71%,45%);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 12px rgba(34,197,94,0.4);font-size:16px;">🚗</div>`;
        driverMarkerRef.current = new gl.Marker(driverEl).setLngLat([driverLng, driverLat]).addTo(map);
      }

      const bounds = new gl.LngLatBounds();
      bounds.extend([pickupLng, pickupLat]);
      bounds.extend([driverLng, driverLat]);
      map.fitBounds(bounds, { padding: 50, maxZoom: 14 });
    } else if (driverMarkerRef.current) {
      driverMarkerRef.current.remove();
      driverMarkerRef.current = null;
    }

    if (route?.routeGeometry && map.isStyleLoaded()) {
      const src = map.getSource("ride-route") as maplibregl.GeoJSONSource | undefined;
      if (src) {
        src.setData({ type: "Feature", properties: {}, geometry: route.routeGeometry });
      } else {
        map.addSource("ride-route", {
          type: "geojson",
          data: { type: "Feature", properties: {}, geometry: route.routeGeometry },
        });
        if (!map.getLayer("ride-route-line")) {
          map.addLayer({
            id: "ride-route-line",
            type: "line",
            source: "ride-route",
            paint: { "line-color": "#3b82f6", "line-width": 4, "line-opacity": 0.8 },
          });
        }
      }
    }
  }

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    import("maplibre-gl").then((gl) => {
      updateMap(map, gl.default);
    });
  }, [route?.hasLiveDriver, route?.routeGeometry, driverLat, driverLng, pickupLat, pickupLng]);

  if (mapError) {
    return (
      <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
        <div className="h-52 relative flex items-center justify-center">
          <div className="text-center px-6">
            <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">{mapError}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <MapErrorBoundary fallbackHeight="13rem">
    <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
      <div className="h-52 relative">
        <div ref={containerRef} className="absolute inset-0" />

        {route && (
          <div className="absolute bottom-2 right-2 flex gap-1.5 z-10">
            {route.etaMinutes != null && (
              <span className="rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-semibold shadow text-foreground backdrop-blur-sm">
                {route.etaMinutes} min
              </span>
            )}
            {route.distanceKm != null && (
              <span className="rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-semibold shadow text-foreground backdrop-blur-sm">
                {route.distanceKm} km
              </span>
            )}
            <span className="rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-semibold shadow capitalize text-foreground backdrop-blur-sm">
              {tc(`ride.traffic_${route.trafficLevel}`)}
            </span>
          </div>
        )}
      </div>
    </div>
    </MapErrorBoundary>
  );
}
