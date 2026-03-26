/**
 * TaxiPreviewMapCard — Real Mapbox route preview with ETA/distance/traffic.
 */
import { useEffect, useRef } from "react";
import { tc } from "@/lib/i18n-canonical";
import type { TaxiRidePreview } from "@/hooks/useTaxiRidePreview";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MAPBOX_ACCESS_TOKEN } from "@/lib/mapbox/config";

interface Props {
  preview: TaxiRidePreview | null;
}

export function TaxiPreviewMapCard({ preview }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !preview) return;
    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

    const pickupLng = preview.pickupLng ?? 55.2708;
    const pickupLat = preview.pickupLat ?? 25.2048;
    const dropoffLng = preview.dropoffLng ?? 55.30;
    const dropoffLat = preview.dropoffLat ?? 25.22;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [pickupLng, pickupLat],
      zoom: 12,
      attributionControl: false,
    });

    mapRef.current = map;

    map.on("load", () => {
      // Pickup
      const pickupEl = document.createElement("div");
      pickupEl.innerHTML = `<div style="width:24px;height:24px;border-radius:50%;background:#22c55e;border:3px solid white;box-shadow:0 2px 8px rgba(34,197,94,0.4);"></div>`;
      new mapboxgl.Marker(pickupEl).setLngLat([pickupLng, pickupLat]).addTo(map);

      // Dropoff
      const dropEl = document.createElement("div");
      dropEl.innerHTML = `<div style="width:24px;height:24px;border-radius:50%;background:#ef4444;border:3px solid white;box-shadow:0 2px 8px rgba(239,68,68,0.4);"></div>`;
      new mapboxgl.Marker(dropEl).setLngLat([dropoffLng, dropoffLat]).addTo(map);

      // Fit bounds
      const bounds = new mapboxgl.LngLatBounds();
      bounds.extend([pickupLng, pickupLat]);
      bounds.extend([dropoffLng, dropoffLat]);
      map.fitBounds(bounds, { padding: 50, maxZoom: 14 });

      // Route line
      if (preview.routeGeometry) {
        map.addSource("taxi-route", {
          type: "geojson",
          data: { type: "Feature", properties: {}, geometry: preview.routeGeometry },
        });
        map.addLayer({
          id: "taxi-route-line",
          type: "line",
          source: "taxi-route",
          paint: { "line-color": "#3b82f6", "line-width": 4, "line-opacity": 0.8 },
        });
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [preview]);

  if (!preview) return null;

  return (
    <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
      <div className="h-44 relative">
        <div ref={containerRef} className="absolute inset-0" />
      </div>

      <div className="flex items-center justify-center gap-3 px-4 py-2.5 border-t border-border/30">
        <span className="text-sm font-bold text-foreground">{preview.eta} min</span>
        <span className="text-xs text-muted-foreground">·</span>
        <span className="text-sm font-semibold text-foreground">{preview.distance.toFixed(1)} km</span>
        <span className="text-xs text-muted-foreground">·</span>
        <span className="text-xs font-medium text-muted-foreground capitalize">
          {tc(`ride.traffic_${preview.traffic}`)}
        </span>
      </div>
    </div>
  );
}
