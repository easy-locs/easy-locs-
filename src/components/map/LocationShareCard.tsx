/**
 * LocationShareCard — Compact Mapbox card for sharing current location.
 * Same visual system as ClientMapCard and SellerMapCard.
 */
import { useEffect, useRef, memo } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MAPBOX_ACCESS_TOKEN } from "@/lib/mapbox/config";
import { useLocationStore } from "@/stores/locationStore";
// locationStore already imported above; requestLocation via navigator directly
import { Send, RefreshCw, Maximize2, MapPin } from "lucide-react";

interface LocationShareCardProps {
  onSendLocation?: (lat: number, lng: number) => void;
  onExpand?: () => void;
  className?: string;
}

export default memo(function LocationShareCard({
  onSendLocation,
  onExpand,
  className = "",
}: LocationShareCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  const currentLocation = useLocationStore((s) => s.currentLocation);
  const permissionState = useLocationStore((s) => s.permissionState);
  const requestLocation = () => {
    import("@/lib/location/requestLocation").then(({ requestLocation: rl }) => rl());
  };

  const lat = currentLocation?.lat ?? 25.2048;
  const lng = currentLocation?.lng ?? 55.2708;
  const hasGeo = currentLocation != null && (currentLocation.lat !== 0 || currentLocation.lng !== 0);

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [lng, lat],
      zoom: hasGeo ? 15 : 12,
      attributionControl: false,
      interactive: false,
    });

    if (hasGeo) {
      const el = document.createElement("div");
      el.style.cssText = "width:16px;height:16px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 12px rgba(59,130,246,0.5);";
      const marker = new mapboxgl.Marker(el).setLngLat([lng, lat]).addTo(map);
      markerRef.current = marker;
    }

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; markerRef.current = null; };
  }, []);

  // Update marker on location change
  useEffect(() => {
    if (!mapRef.current || !hasGeo || !currentLocation) return;
    mapRef.current.flyTo({ center: [currentLocation.lng, currentLocation.lat], zoom: 15, duration: 400 });

    if (markerRef.current) {
      markerRef.current.setLngLat([currentLocation.lng, currentLocation.lat]);
    } else {
      const el = document.createElement("div");
      el.style.cssText = "width:16px;height:16px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 12px rgba(59,130,246,0.5);";
      markerRef.current = new mapboxgl.Marker(el).setLngLat([currentLocation.lng, currentLocation.lat]).addTo(mapRef.current);
    }
  }, [currentLocation?.lat, currentLocation?.lng]);

  return (
    <div className={`rounded-2xl overflow-hidden border border-border/20 bg-card shadow-sm ${className}`}>
      <div className="relative h-[120px]">
        <div ref={containerRef} className="absolute inset-0" />
        {onExpand && (
          <button
            onClick={onExpand}
            className="absolute top-2 right-2 z-10 w-8 h-8 rounded-xl bg-card/90 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform border border-border/20"
          >
            <Maximize2 className="h-3.5 w-3.5 text-foreground" />
          </button>
        )}
        {!hasGeo && (
          <div className="absolute inset-0 flex items-center justify-center bg-card/60 backdrop-blur-sm">
            <p className="text-xs text-muted-foreground">
              {permissionState === "denied" ? "Location denied" : "Getting location…"}
            </p>
          </div>
        )}
      </div>

      <div className="px-3 py-2 flex items-center gap-2">
        <MapPin className="h-4 w-4 text-primary shrink-0" />
        <p className="flex-1 text-[11px] text-muted-foreground font-mono truncate">
          {hasGeo ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : "No location"}
        </p>
        <div className="flex gap-1.5 shrink-0">
          <button
            onClick={() => requestLocation()}
            className="w-8 h-8 rounded-xl bg-muted/50 flex items-center justify-center active:scale-90 transition-transform"
          >
            <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          {onSendLocation && hasGeo && (
            <button
              onClick={() => onSendLocation(lat, lng)}
              className="px-3 h-8 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-transform"
            >
              <Send className="h-3 w-3" /> Send
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
