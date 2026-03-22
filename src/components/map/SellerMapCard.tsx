/**
 * SellerMapCard — Compact Mapbox card for seller/business location management.
 * Allows placing, repositioning, and saving store coordinates.
 */
import { useEffect, useRef, useState, useCallback, memo } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MAPBOX_ACCESS_TOKEN } from "@/lib/mapbox/config";
import { MapPin, Save, RotateCcw, Maximize2, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface SellerMapCardProps {
  lat: number | null;
  lng: number | null;
  storeName?: string;
  onSave?: (lat: number, lng: number) => void;
  onExpand?: () => void;
  editable?: boolean;
  className?: string;
}

export default memo(function SellerMapCard({
  lat,
  lng,
  storeName,
  onSave,
  onExpand,
  editable = true,
  className = "",
}: SellerMapCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  const defaultLat = lat ?? 25.2048;
  const defaultLng = lng ?? 55.2708;

  const [pinLat, setPinLat] = useState(defaultLat);
  const [pinLng, setPinLng] = useState(defaultLng);
  const [isDirty, setIsDirty] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [defaultLng, defaultLat],
      zoom: lat != null ? 16 : 13,
      attributionControl: false,
    });

    // No NavigationControl — zoom via pinch/scroll only

    // Draggable store marker
    const el = document.createElement("div");
    el.style.cssText = "width:36px;height:36px;border-radius:50%;background:hsl(var(--primary));border:3px solid white;box-shadow:0 4px 16px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:18px;cursor:grab;";
    el.textContent = "📍";

    const marker = new mapboxgl.Marker({ element: el, draggable: editable })
      .setLngLat([defaultLng, defaultLat])
      .addTo(map);

    if (editable) {
      marker.on("dragend", () => {
        const pos = marker.getLngLat();
        setPinLat(pos.lat);
        setPinLng(pos.lng);
        setIsDirty(true);
      });

      map.on("click", (e) => {
        marker.setLngLat([e.lngLat.lng, e.lngLat.lat]);
        setPinLat(e.lngLat.lat);
        setPinLng(e.lngLat.lng);
        setIsDirty(true);
      });
    }

    markerRef.current = marker;
    mapRef.current = map;

    return () => { map.remove(); mapRef.current = null; markerRef.current = null; };
  }, []);

  const handleSave = useCallback(() => {
    onSave?.(pinLat, pinLng);
    setIsDirty(false);
    toast.success("Location saved");
  }, [pinLat, pinLng, onSave]);

  const handleReset = useCallback(() => {
    if (!markerRef.current || !mapRef.current) return;
    const rLat = lat ?? 25.2048;
    const rLng = lng ?? 55.2708;
    markerRef.current.setLngLat([rLng, rLat]);
    mapRef.current.flyTo({ center: [rLng, rLat], zoom: 16, duration: 400 });
    setPinLat(rLat);
    setPinLng(rLng);
    setIsDirty(false);
  }, [lat, lng]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(`${pinLat.toFixed(6)}, ${pinLng.toFixed(6)}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [pinLat, pinLng]);

  return (
    <div className={`rounded-2xl overflow-hidden border border-border/20 bg-card shadow-sm ${className}`}>
      {/* Map */}
      <div className="relative h-[180px]">
        <div ref={containerRef} className="absolute inset-0" />
        {onExpand && (
          <button
            onClick={onExpand}
            className="absolute top-2 right-2 z-10 w-8 h-8 rounded-xl bg-card/90 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform border border-border/20"
          >
            <Maximize2 className="h-3.5 w-3.5 text-foreground" />
          </button>
        )}
        {editable && (
          <div className="absolute bottom-2 left-2 z-10 rounded-lg bg-card/90 backdrop-blur-sm px-2 py-1 text-[10px] text-muted-foreground border border-border/20">
            Tap or drag to set location
          </div>
        )}
      </div>

      {/* Info */}
      <div className="px-3 py-2.5 space-y-2">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            {storeName && <p className="text-sm font-bold text-foreground truncate">{storeName}</p>}
            <p className="text-[11px] text-muted-foreground font-mono">
              {pinLat.toFixed(6)}, {pinLng.toFixed(6)}
            </p>
          </div>
          <button onClick={handleCopy} className="shrink-0 w-7 h-7 rounded-lg bg-muted/50 flex items-center justify-center active:scale-90 transition-transform">
            {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
          </button>
        </div>

        {editable && (
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="flex-1 h-8 rounded-xl bg-muted/50 text-xs font-medium text-muted-foreground flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
            >
              <RotateCcw className="h-3 w-3" /> Reset
            </button>
            <button
              onClick={handleSave}
              disabled={!isDirty}
              className="flex-1 h-8 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-transform disabled:opacity-40"
            >
              <Save className="h-3 w-3" /> Save
            </button>
          </div>
        )}
      </div>
    </div>
  );
});
