import { useEffect, useRef, useState } from "react";
import type mapboxgl from "mapbox-gl";
import { loadMapbox } from "@/lib/mapbox/mapbox-loader";
import { MAPBOX_ACCESS_TOKEN, getMapboxTokenError } from "@/lib/mapbox/config";
import { MapErrorBoundary } from "@/components/map/MapErrorBoundary";
import { trackMapError } from "@/lib/analytics/map-error-analytics";
import { MapPin } from "lucide-react";

interface RideLiveMapProps {
  driver?: { lat: number; lng: number } | null;
  pickup?: { lat: number; lng: number } | null;
  dropoff?: { lat: number; lng: number } | null;
  routeGeometry?: GeoJSON.Geometry | null;
}

export function RideLiveMap({ driver, pickup, dropoff, routeGeometry }: RideLiveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const driverMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const pickupMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const dropoffMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const readyRef = useRef(false);

  const lat = pickup?.lat ?? driver?.lat ?? 25.2048;
  const lng = pickup?.lng ?? driver?.lng ?? 55.2708;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const tokenError = getMapboxTokenError();
    if (tokenError) {
      trackMapError({ component: "RideLiveMap", errorMessage: tokenError, lat, lng, zoom: 13 });
      setMapError(tokenError);
      return;
    }

    let cancelled = false;
    setMapError(null);

    if (!MAPBOX_ACCESS_TOKEN?.trim()) {
      trackMapError({ component: "RideLiveMap", errorMessage: "Map not configured", lat, lng, zoom: 13 });
      setMapError("Map not configured");
      return;
    }

    loadMapbox().then((mapboxgl) => {
      if (cancelled || !containerRef.current) return;
      mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

      try {
        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: "mapbox://styles/mapbox/dark-v11",
          center: [lng, lat],
          zoom: 13,
          attributionControl: false,
        });

        mapRef.current = map;

        map.on("error", (e: mapboxgl.ErrorEvent & { error?: { message?: string } }) => {
          const msg = e.error?.message || String(e.error ?? "");
          if (msg.includes("401") || msg.includes("403") || msg.includes("access token")) {
            trackMapError({ component: "RideLiveMap", errorMessage: "Mapbox token is invalid or expired.", lat, lng, zoom: 13 });
            setMapError("Mapbox token is invalid or expired.");
          }
        });

        map.on("load", () => {
          if (!cancelled) readyRef.current = true;
          updateMarkersAndRoute(map, mapboxgl);
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to initialize map";
        trackMapError({ component: "RideLiveMap", errorMessage: msg, lat, lng, zoom: 13 });
        setMapError(msg);
      }
    }).catch((err) => {
      if (!cancelled) {
        const msg = err instanceof Error ? err.message : "Failed to load Mapbox";
        trackMapError({ component: "RideLiveMap", errorMessage: msg, lat, lng, zoom: 13 });
        setMapError(msg);
      }
    });

    return () => {
      cancelled = true;
      driverMarkerRef.current?.remove();
      pickupMarkerRef.current?.remove();
      dropoffMarkerRef.current?.remove();
      driverMarkerRef.current = null;
      pickupMarkerRef.current = null;
      dropoffMarkerRef.current = null;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      readyRef.current = false;
    };
  }, []);

  function updateMarkersAndRoute(map: mapboxgl.Map, gl: typeof import("mapbox-gl").default) {
    const bounds = new gl.LngLatBounds();
    let hasPoints = false;

    if (driver?.lat != null) {
      if (driverMarkerRef.current) {
        driverMarkerRef.current.setLngLat([driver.lng, driver.lat]);
      } else {
        const el = document.createElement("div");
        el.innerHTML = `<div style="width:32px;height:32px;border-radius:50%;background:hsl(220,15%,15%);border:2px solid hsl(142,71%,45%);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 12px rgba(34,197,94,0.4);font-size:16px;">🚗</div>`;
        driverMarkerRef.current = new gl.Marker(el).setLngLat([driver.lng, driver.lat]).addTo(map);
      }
      bounds.extend([driver.lng, driver.lat]);
      hasPoints = true;
    } else if (driverMarkerRef.current) {
      driverMarkerRef.current.remove();
      driverMarkerRef.current = null;
    }

    if (pickup?.lat != null) {
      if (pickupMarkerRef.current) {
        pickupMarkerRef.current.setLngLat([pickup.lng, pickup.lat]);
      } else {
        const el = document.createElement("div");
        el.innerHTML = `<div style="width:28px;height:28px;border-radius:50%;background:#3b82f6;border:3px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 12px rgba(59,130,246,0.4);font-size:12px;">📍</div>`;
        pickupMarkerRef.current = new gl.Marker(el).setLngLat([pickup.lng, pickup.lat]).addTo(map);
      }
      bounds.extend([pickup.lng, pickup.lat]);
      hasPoints = true;
    } else if (pickupMarkerRef.current) {
      pickupMarkerRef.current.remove();
      pickupMarkerRef.current = null;
    }

    if (dropoff?.lat != null) {
      if (dropoffMarkerRef.current) {
        dropoffMarkerRef.current.setLngLat([dropoff.lng, dropoff.lat]);
      } else {
        const el = document.createElement("div");
        el.innerHTML = `<div style="width:24px;height:24px;border-radius:50%;background:#ef4444;border:3px solid white;box-shadow:0 2px 8px rgba(239,68,68,0.4);"></div>`;
        dropoffMarkerRef.current = new gl.Marker(el).setLngLat([dropoff.lng, dropoff.lat]).addTo(map);
      }
      bounds.extend([dropoff.lng, dropoff.lat]);
      hasPoints = true;
    } else if (dropoffMarkerRef.current) {
      dropoffMarkerRef.current.remove();
      dropoffMarkerRef.current = null;
    }

    const geom = routeGeometry ?? (
      pickup?.lat != null && dropoff?.lat != null
        ? { type: "LineString" as const, coordinates: [[pickup.lng, pickup.lat], [dropoff.lng, dropoff.lat]] }
        : null
    );

    if (geom && map.isStyleLoaded()) {
      const routeSource = map.getSource("route") as mapboxgl.GeoJSONSource | undefined;
      if (routeSource) {
        routeSource.setData({ type: "Feature", properties: {}, geometry: geom });
      } else {
        map.addSource("route", {
          type: "geojson",
          data: { type: "Feature", properties: {}, geometry: geom },
        });
        if (!map.getLayer("route-line")) {
          map.addLayer({
            id: "route-line",
            type: "line",
            source: "route",
            paint: { "line-color": "#3b82f6", "line-width": 4, "line-opacity": 0.8 },
          });
        }
      }
    }

    if (hasPoints) {
      map.fitBounds(bounds, { padding: 50, maxZoom: 14 });
    }
  }

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    import("mapbox-gl").then((gl) => {
      updateMarkersAndRoute(map, gl.default);
    });
  }, [driver?.lat, driver?.lng, pickup?.lat, pickup?.lng, dropoff?.lat, dropoff?.lng, routeGeometry]);

  if (mapError) {
    return (
      <div className="h-80 rounded-xl overflow-hidden border border-border relative">
        <MapErrorFallback
          message={mapError}
          lat={lat}
          lng={lng}
          className="absolute inset-0"
        />
      </div>
    );
  }

  return (
    <MapErrorBoundary fallbackHeight="20rem">
      <div className="h-80 rounded-xl overflow-hidden border border-border relative">
        <div ref={containerRef} className="absolute inset-0" />
      </div>
    </MapErrorBoundary>
  );
}
