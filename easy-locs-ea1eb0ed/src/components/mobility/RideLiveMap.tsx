import { useEffect, useRef, useState } from "react";
import type mapboxgl from "mapbox-gl";
import { loadMapbox } from "@/lib/mapbox/mapbox-loader";
import { MAPBOX_ACCESS_TOKEN } from "@/lib/mapbox/config";

interface RideLiveMapProps {
  driver?: { lat: number; lng: number } | null;
  pickup?: { lat: number; lng: number } | null;
  dropoff?: { lat: number; lng: number } | null;
  routeGeometry?: GeoJSON.Geometry | null;
}

export function RideLiveMap({ driver, pickup, dropoff, routeGeometry }: RideLiveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  const lat = pickup?.lat ?? driver?.lat ?? 25.2048;
  const lng = pickup?.lng ?? driver?.lng ?? 55.2708;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    loadMapbox().then((mapboxgl) => {
      if (cancelled || !containerRef.current) return;
      mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [lng, lat],
        zoom: 13,
        attributionControl: false,
      });

      mapRef.current = map;

      map.on("load", () => {
        const bounds = new mapboxgl.LngLatBounds();
        let hasPoints = false;

        if (driver?.lat != null) {
          const el = document.createElement("div");
          el.innerHTML = `<div style="width:32px;height:32px;border-radius:50%;background:hsl(220,15%,15%);border:2px solid hsl(142,71%,45%);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 12px rgba(34,197,94,0.4);font-size:16px;">🚗</div>`;
          new mapboxgl.Marker(el).setLngLat([driver.lng, driver.lat]).addTo(map);
          bounds.extend([driver.lng, driver.lat]);
          hasPoints = true;
        }

        if (pickup?.lat != null) {
          const el = document.createElement("div");
          el.innerHTML = `<div style="width:28px;height:28px;border-radius:50%;background:#3b82f6;border:3px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 12px rgba(59,130,246,0.4);font-size:12px;">📍</div>`;
          new mapboxgl.Marker(el).setLngLat([pickup.lng, pickup.lat]).addTo(map);
          bounds.extend([pickup.lng, pickup.lat]);
          hasPoints = true;
        }

        if (dropoff?.lat != null) {
          const el = document.createElement("div");
          el.innerHTML = `<div style="width:24px;height:24px;border-radius:50%;background:#ef4444;border:3px solid white;box-shadow:0 2px 8px rgba(239,68,68,0.4);"></div>`;
          new mapboxgl.Marker(el).setLngLat([dropoff.lng, dropoff.lat]).addTo(map);
          bounds.extend([dropoff.lng, dropoff.lat]);
          hasPoints = true;
        }

        const geom = routeGeometry ?? (
          pickup?.lat != null && dropoff?.lat != null
            ? { type: "LineString" as const, coordinates: [[pickup.lng, pickup.lat], [dropoff.lng, dropoff.lat]] }
            : null
        );
        if (geom) {
          map.addSource("route", {
            type: "geojson",
            data: { type: "Feature", properties: {}, geometry: geom },
          });
          map.addLayer({
            id: "route-line",
            type: "line",
            source: "route",
            paint: { "line-color": "#3b82f6", "line-width": 4, "line-opacity": 0.8 },
          });
        }

        if (hasPoints) {
          map.fitBounds(bounds, { padding: 50, maxZoom: 14 });
        }
      });
    });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [driver, pickup, dropoff, routeGeometry, lat, lng]);

  return (
    <div className="h-80 rounded-xl overflow-hidden border border-border relative">
      <div ref={containerRef} className="absolute inset-0" />
    </div>
  );
}
