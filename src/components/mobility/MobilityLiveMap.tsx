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

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [centerLng, centerLat],
      zoom: 13,
      attributionControl: false,
      interactive: true,
    });

    mapRef.current = map;

    map.on("load", () => {
      // Pickup marker
      const pickupEl = document.createElement("div");
      pickupEl.innerHTML = `<div style="width:32px;height:32px;border-radius:50%;background:hsl(142,71%,45%);border:3px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 12px rgba(34,197,94,0.4);font-size:14px;">📍</div>`;
      new mapboxgl.Marker(pickupEl).setLngLat([centerLng, centerLat]).addTo(map);

      // Dropoff marker
      if (dropoffLat != null && dropoffLng != null) {
        const dropEl = document.createElement("div");
        dropEl.innerHTML = `<div style="width:28px;height:28px;border-radius:50%;background:#ef4444;border:3px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 12px rgba(239,68,68,0.4);font-size:12px;">🏁</div>`;
        new mapboxgl.Marker(dropEl).setLngLat([dropoffLng, dropoffLat]).addTo(map);

        const bounds = new mapboxgl.LngLatBounds();
        bounds.extend([centerLng, centerLat]);
        bounds.extend([dropoffLng, dropoffLat]);
        map.fitBounds(bounds, { padding: 60, maxZoom: 14 });
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
      className={cn("relative rounded-2xl border border-border/30 overflow-hidden", className)}
      style={{ height: 240 }}
    >
      <div ref={containerRef} className="absolute inset-0" />

      {/* Bottom overlay */}
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
