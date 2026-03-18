/**
 * SendMap — Mapbox map for /send courier flow.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Navigation } from "lucide-react";
import type { SavedPlace } from "@/hooks/useSmartLocation";

const MAPBOX_TOKEN = "pk.eyJ1IjoiZWFzeWxvY3MyMDI2IiwiYSI6ImNtbXZiZ3h0cTF6ZHMycnIyOWw4NnJzZTIifQ.ElIj6bFQK_BpVm6suigHUQ";

interface Props {
  pickup: SavedPlace | null;
  dropoff: SavedPlace | null;
  userLat?: number | null;
  userLng?: number | null;
  className?: string;
}

function createDot(color: string, emoji: string): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText = `
    width:32px;height:32px;border-radius:50%;background:${color};
    border:3px solid white;box-shadow:0 4px 16px ${color}44;
    display:flex;align-items:center;justify-content:center;font-size:14px;
  `;
  el.textContent = emoji;
  return el;
}

export default function SendMap({ pickup, dropoff, userLat, userLng, className = "" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [userLng || 2.35, userLat || 48.86],
      zoom: 13,
      attributionControl: false,
    });
    map.on("load", () => setReady(true));
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !ready) return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    const map = mapRef.current;
    const bounds = new mapboxgl.LngLatBounds();
    let hasBounds = false;

    if (pickup?.lat && pickup?.lng) {
      markersRef.current.push(
        new mapboxgl.Marker({ element: createDot("#22C55E", "📦") }).setLngLat([pickup.lng, pickup.lat]).addTo(map)
      );
      bounds.extend([pickup.lng, pickup.lat]);
      hasBounds = true;
    }
    if (dropoff?.lat && dropoff?.lng) {
      markersRef.current.push(
        new mapboxgl.Marker({ element: createDot("#8B5CF6", "📍") }).setLngLat([dropoff.lng, dropoff.lat]).addTo(map)
      );
      bounds.extend([dropoff.lng, dropoff.lat]);
      hasBounds = true;
    }

    if (hasBounds) map.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 800 });
    else if (userLat && userLng) map.flyTo({ center: [userLng, userLat], zoom: 14, duration: 600 });
  }, [pickup, dropoff, ready]);

  const recenter = useCallback(() => {
    if (!mapRef.current) return;
    const lat = pickup?.lat || userLat;
    const lng = pickup?.lng || userLng;
    if (lat && lng) mapRef.current.flyTo({ center: [lng, lat], zoom: 14, duration: 600 });
  }, [pickup, userLat, userLng]);

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-border/10 ${className}`}>
      <div ref={containerRef} className="w-full h-full min-h-[180px]" />
      <button
        onClick={recenter}
        className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-card/90 backdrop-blur-md border border-border/20 flex items-center justify-center shadow-lg active:scale-90 transition-transform z-10"
      >
        <Navigation className="h-4 w-4 text-primary" />
      </button>
    </div>
  );
}
