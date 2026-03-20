/**
 * MapTabPage — Map tab entry point.
 * Full-screen Mapbox map with bottom sheet for Ride / Send / Nearby.
 */
import { useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Car, Package, MapPin, Locate } from "lucide-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useGeoStore } from "@/stores/geoStore";

const MAPBOX_TOKEN = "pk.eyJ1IjoiZWFzeWxvY3MyMDI2IiwiYSI6ImNtbXZiZ3h0cTF6ZHMycnIyOWw4NnJzZTIifQ.ElIj6bFQK_BpVm6suigHUQ";
const DUBAI_CENTER: [number, number] = [55.2708, 25.2048];

const ACTIONS = [
  { key: "ride", label: "Ride", icon: Car, path: "/ride", desc: "Book a ride" },
  { key: "send", label: "Send", icon: Package, path: "/send", desc: "Send a package" },
  { key: "nearby", label: "Nearby", icon: MapPin, path: "/explore", desc: "Discover nearby" },
];

export default function MapTabPage() {
  const navigate = useNavigate();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const { currentPosition, refreshCurrentPosition } = useGeoStore();

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: DUBAI_CENTER,
      zoom: 13,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-left");
    mapRef.current = map;

    // Request location
    refreshCurrentPosition();

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Fly to user location when available
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !currentPosition.lat || !currentPosition.lng) return;

    map.flyTo({
      center: [currentPosition.lng, currentPosition.lat],
      zoom: 15,
      duration: 1200,
    });

    // Update or create user marker
    if (markerRef.current) {
      markerRef.current.setLngLat([currentPosition.lng, currentPosition.lat]);
    } else {
      const el = document.createElement("div");
      el.className = "w-4 h-4 rounded-full border-2 border-white shadow-lg";
      el.style.background = "hsl(var(--primary))";
      el.style.boxShadow = "0 0 12px hsl(var(--primary) / 0.5)";
      markerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat([currentPosition.lng, currentPosition.lat])
        .addTo(map);
    }
  }, [currentPosition.lat, currentPosition.lng]);

  const handleLocate = useCallback(() => {
    refreshCurrentPosition();
  }, [refreshCurrentPosition]);

  return (
    <div className="relative h-[100dvh] flex flex-col bg-background">
      {/* Map */}
      <div ref={mapContainerRef} className="flex-1" />

      {/* Locate button */}
      <button
        onClick={handleLocate}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-xl flex items-center justify-center
                   active:scale-95 transition-transform shadow-lg"
        style={{
          background: "hsl(var(--card) / 0.95)",
          backdropFilter: "blur(8px)",
        }}
      >
        <Locate className="w-5 h-5" style={{ color: "hsl(var(--primary))" }} />
      </button>

      {/* Bottom sheet */}
      <div
        className="absolute bottom-[calc(56px+env(safe-area-inset-bottom,0px))] left-0 right-0 rounded-t-[20px] px-5 pt-5 pb-4"
        style={{
          background: "hsl(var(--card))",
          boxShadow: "0 -4px 30px hsl(var(--background) / 0.5)",
        }}
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: "hsl(var(--border))" }} />
        <h2 className="text-base font-bold mb-3 text-foreground">Where to?</h2>
        <div className="grid grid-cols-3 gap-3">
          {ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.key}
                onClick={() => navigate(action.path)}
                className="flex flex-col items-center gap-2 rounded-2xl p-4 transition-all duration-150 active:scale-95"
                style={{ background: "hsl(var(--muted))" }}
              >
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center"
                  style={{ background: "hsl(var(--primary) / 0.12)" }}
                >
                  <Icon className="w-5 h-5" style={{ color: "hsl(var(--primary))" }} />
                </div>
                <span className="text-xs font-semibold text-foreground">{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
