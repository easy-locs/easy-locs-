/**
 * RideLiveMapCard — Real Mapbox map with route line + ETA/distance badges.
 */
import { useEffect, useRef } from "react";
import { tc } from "@/lib/i18n-canonical";
import type { RideLiveRoute } from "@/lib/mobility/ride-live-route-engine";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MAPBOX_ACCESS_TOKEN } from "@/lib/mapbox/config";

interface Props {
  route: RideLiveRoute | null;
}

export function RideLiveMapCard({ route }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  const driverLat = route?.driver?.lat ?? 25.21;
  const driverLng = route?.driver?.lng ?? 55.27;
  const pickupLat = route?.pickup?.lat ?? 25.2048;
  const pickupLng = route?.pickup?.lng ?? 55.2708;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [pickupLng, pickupLat],
      zoom: 13,
      attributionControl: false,
    });

    mapRef.current = map;

    map.on("load", () => {
      // Pickup marker
      const pickupEl = document.createElement("div");
      pickupEl.innerHTML = `<div style="width:28px;height:28px;border-radius:50%;background:#3b82f6;border:3px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 12px rgba(59,130,246,0.4);font-size:12px;">📍</div>`;
      new mapboxgl.Marker(pickupEl).setLngLat([pickupLng, pickupLat]).addTo(map);

      // Driver marker
      if (route?.hasLiveDriver) {
        const driverEl = document.createElement("div");
        driverEl.innerHTML = `<div style="width:32px;height:32px;border-radius:50%;background:hsl(220,15%,15%);border:2px solid hsl(142,71%,45%);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 12px rgba(34,197,94,0.4);font-size:16px;">🚗</div>`;
        new mapboxgl.Marker(driverEl).setLngLat([driverLng, driverLat]).addTo(map);

        const bounds = new mapboxgl.LngLatBounds();
        bounds.extend([pickupLng, pickupLat]);
        bounds.extend([driverLng, driverLat]);
        map.fitBounds(bounds, { padding: 50, maxZoom: 14 });
      }

      // Route geometry
      if (route?.routeGeometry) {
        map.addSource("ride-route", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: route.routeGeometry,
          },
        });
        map.addLayer({
          id: "ride-route-line",
          type: "line",
          source: "ride-route",
          paint: {
            "line-color": "#3b82f6",
            "line-width": 4,
            "line-opacity": 0.8,
          },
        });
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [route?.hasLiveDriver, route?.routeGeometry, driverLat, driverLng, pickupLat, pickupLng]);

  return (
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
  );
}
