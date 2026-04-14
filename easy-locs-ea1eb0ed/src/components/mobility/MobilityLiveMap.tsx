/**
 * MobilityLiveMap — Real Mapbox map with animated rider/driver markers.
 */
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MAPBOX_ACCESS_TOKEN } from "@/lib/mapbox/config";
import { motion } from "framer-motion";

interface MobilityLiveMapProps {
  pickupLat?: number | null;
  pickupLng?: number | null;
  dropoffLat?: number | null;
  dropoffLng?: number | null;
  mode?: "taxi" | "delivery";
  nearbyRiders?: number;
  className?: string;
}

function generateNearby(lat: number, lng: number, count: number) {
  const positions: { lat: number; lng: number; id: number }[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (2 * Math.PI * i) / count + Math.random() * 0.5;
    const dist = (Math.random() * 0.7 + 0.3) * 2;
    const dLat = (dist / 111) * Math.cos(angle);
    const dLng = (dist / (111 * Math.cos((lat * Math.PI) / 180))) * Math.sin(angle);
    positions.push({ lat: lat + dLat, lng: lng + dLng, id: i });
  }
  return positions;
}

export function MobilityLiveMap({
  pickupLat,
  pickupLng,
  dropoffLat,
  dropoffLng,
  mode = "taxi",
  nearbyRiders = 4,
  className,
}: MobilityLiveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const centerLat = pickupLat ?? 25.2048;
  const centerLng = pickupLng ?? 55.2708;

  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (!gl) { setMapError(true); return; }
    } catch { setMapError(true); return; }

    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

    let map: mapboxgl.Map;
    try {
      map = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [centerLng, centerLat],
        zoom: 13,
        attributionControl: false,
        interactive: true,
      });
    } catch {
      setMapError(true);
      return;
    }

    mapRef.current = map;

    map.on("load", () => {
      const pickupEl = document.createElement("div");
      pickupEl.innerHTML = `<div style="width:32px;height:32px;border-radius:50%;background:hsl(142,71%,45%);border:3px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 12px rgba(34,197,94,0.4);font-size:14px;">📍</div>`;
      new mapboxgl.Marker(pickupEl).setLngLat([centerLng, centerLat]).addTo(map);

      if (dropoffLat != null && dropoffLng != null) {
        const dropEl = document.createElement("div");
        dropEl.innerHTML = `<div style="width:28px;height:28px;border-radius:50%;background:hsl(168,72%,44%);border:3px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 12px rgba(196,155,80,0.4);font-size:12px;">🏁</div>`;
        new mapboxgl.Marker(dropEl).setLngLat([dropoffLng, dropoffLat]).addTo(map);

        const bounds = new mapboxgl.LngLatBounds();
        bounds.extend([centerLng, centerLat]);
        bounds.extend([dropoffLng, dropoffLat]);
        map.fitBounds(bounds, { padding: 60, maxZoom: 14 });

        fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${centerLng},${centerLat};${dropoffLng},${dropoffLat}?geometries=geojson&overview=full&access_token=${MAPBOX_ACCESS_TOKEN}`)
          .then(r => r.json())
          .then(data => {
            const route = data.routes?.[0]?.geometry;
            if (route && map.getSource("route") === undefined) {
              map.addSource("route", { type: "geojson", data: { type: "Feature", properties: {}, geometry: route } });
              map.addLayer({
                id: "route-line-bg", type: "line", source: "route",
                paint: { "line-color": "hsl(220, 40%, 18%)", "line-width": 6, "line-opacity": 0.3 },
              }, map.getLayer("route-line") ? "route-line" : undefined);
              map.addLayer({
                id: "route-line", type: "line", source: "route",
                paint: { "line-color": "hsl(168, 72%, 44%)", "line-width": 3, "line-opacity": 0.9 },
              });
            }
          })
          .catch(() => {});
      }

      // Add rider/driver markers
      const riders = generateNearby(centerLat, centerLng, nearbyRiders);
      const riderMarkers: mapboxgl.Marker[] = [];

      riders.forEach((r) => {
        const el = document.createElement("div");
        const icon = mode === "taxi" ? "🚗" : "🛵";
        el.innerHTML = `<div style="width:28px;height:28px;border-radius:50%;background:hsl(220,15%,20%);border:2px solid hsl(142,71%,45%);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:14px;transition:transform 2s ease-in-out;">${icon}</div>`;
        const marker = new mapboxgl.Marker(el).setLngLat([r.lng, r.lat]).addTo(map);
        riderMarkers.push(marker);
      });

      markersRef.current = riderMarkers;

      // Animate riders
      intervalRef.current = setInterval(() => {
        riderMarkers.forEach((marker) => {
          const lngLat = marker.getLngLat();
          marker.setLngLat([
            lngLat.lng + (Math.random() - 0.5) * 0.003,
            lngLat.lat + (Math.random() - 0.5) * 0.003,
          ]);
        });
      }, 3000);
    });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      map.remove();
      mapRef.current = null;
    };
  }, [centerLat, centerLng, nearbyRiders, dropoffLat, dropoffLng, mode]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className={cn("relative rounded-2xl border border-border/30 overflow-hidden bg-card", className)}
      style={{ minHeight: 180 }}
    >
      {mapError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4" style={{ background: "hsl(var(--card))" }}>
          <span className="text-2xl mb-2">📍</span>
          <p className="text-sm font-semibold text-foreground">Live Map</p>
          <p className="text-xs text-muted-foreground">Riders are being tracked in your area</p>
        </div>
      ) : (
        <div ref={containerRef} className="absolute inset-0 w-full h-full" />
      )}

      <div className="absolute bottom-0 inset-x-0 z-20 bg-gradient-to-t from-card via-card/80 to-transparent px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-foreground">
              {nearbyRiders} {mode === "taxi" ? "drivers" : "riders"} nearby
            </span>
          </div>
          <span className="text-[10px] font-semibold text-muted-foreground tracking-wide uppercase">Live</span>
        </div>
      </div>
    </motion.div>
  );
}
