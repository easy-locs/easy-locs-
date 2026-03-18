/**
 * RideMap — Mapbox-powered map for /ride with pickup/dropoff pins + recenter.
 */
import { useEffect, useRef, useCallback, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Navigation } from "lucide-react";
import type { SavedPlace } from "@/hooks/useSmartLocation";

const MAPBOX_TOKEN = "pk.eyJ1IjoiZWFzeWxvY3MyMDI2IiwiYSI6ImNtbXZiZ3h0cTF6ZHMycnIyOWw4NnJzZTIifQ.ElIj6bFQK_BpVm6suigHUQ";

interface RideMapProps {
  pickup: SavedPlace | null;
  dropoff: SavedPlace | null;
  userLat?: number | null;
  userLng?: number | null;
  drivers?: { lat: number; lng: number; id: string }[];
  className?: string;
}

function createPin(color: string, label: string): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText = `
    width:36px;height:36px;border-radius:50%;background:${color};
    border:3px solid white;box-shadow:0 4px 16px ${color}44;
    display:flex;align-items:center;justify-content:center;
    font-size:14px;font-weight:700;color:white;
  `;
  el.textContent = label;
  return el;
}

function createDriverPin(): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText = `
    width:28px;height:28px;border-radius:50%;background:#22C55E;
    border:2px solid white;box-shadow:0 4px 12px #22C55E44;
    display:flex;align-items:center;justify-content:center;font-size:12px;
  `;
  el.textContent = "🚗";
  return el;
}

export default function RideMap({ pickup, dropoff, userLat, userLng, drivers = [], className = "" }: RideMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [ready, setReady] = useState(false);

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;
    const center: [number, number] = [userLng || 2.35, userLat || 48.86];
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center,
      zoom: 13,
      attributionControl: false,
    });
    map.on("load", () => setReady(true));
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Update markers
  useEffect(() => {
    if (!mapRef.current || !ready) return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    const map = mapRef.current;
    const bounds = new mapboxgl.LngLatBounds();
    let hasBounds = false;

    if (pickup?.lat && pickup?.lng) {
      const m = new mapboxgl.Marker({ element: createPin("hsl(142, 71%, 45%)", "A") })
        .setLngLat([pickup.lng, pickup.lat]).addTo(map);
      markersRef.current.push(m);
      bounds.extend([pickup.lng, pickup.lat]);
      hasBounds = true;
    }
    if (dropoff?.lat && dropoff?.lng) {
      const m = new mapboxgl.Marker({ element: createPin("hsl(262, 83%, 58%)", "B") })
        .setLngLat([dropoff.lng, dropoff.lat]).addTo(map);
      markersRef.current.push(m);
      bounds.extend([dropoff.lng, dropoff.lat]);
      hasBounds = true;
    }

    drivers.forEach(d => {
      const m = new mapboxgl.Marker({ element: createDriverPin() })
        .setLngLat([d.lng, d.lat]).addTo(map);
      markersRef.current.push(m);
    });

    if (hasBounds) {
      map.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 800 });
    } else if (userLat && userLng) {
      map.flyTo({ center: [userLng, userLat], zoom: 14, duration: 600 });
    }
  }, [pickup, dropoff, drivers, ready]);

  const recenter = useCallback(() => {
    if (!mapRef.current) return;
    const lat = pickup?.lat || userLat;
    const lng = pickup?.lng || userLng;
    if (lat && lng) mapRef.current.flyTo({ center: [lng, lat], zoom: 14, duration: 600 });
  }, [pickup, userLat, userLng]);

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-border/10 ${className}`}>
      <div ref={containerRef} className="w-full h-full min-h-[200px]" />
      <button
        onClick={recenter}
        className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-card/90 backdrop-blur-md border border-border/20 flex items-center justify-center shadow-lg active:scale-90 transition-transform z-10"
      >
        <Navigation className="h-4 w-4 text-primary" />
      </button>
    </div>
  );
}
