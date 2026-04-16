import { useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Property } from "@/domains/real-estate/canonical-types";
import MapErrorFallback from "@/components/map/MapErrorFallback";
import { useMapErrorHandler } from "@/hooks/useMapErrorHandler";

interface Props {
  properties: Property[];
  onSelectProperty?: (id: string) => void;
}

const LISTING_COLORS: Record<string, string> = {
  sale: "#22c55e",
  rent: "#3b82f6",
  lease: "#3b82f6",
  short_stay: "#a855f7",
  long_stay: "#a855f7",
};

function esc(str: string | number | undefined | null): string {
  return String(str ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function PropertyMapView({ properties, onSelectProperty }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const onSelectRef = useRef(onSelectProperty);
  const { mapError, handleMapError } = useMapErrorHandler("PropertyMapView");

  onSelectRef.current = onSelectProperty;

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const firstGeo = properties.find(p => p.address.geoPoint);
    const center: [number, number] = firstGeo?.address.geoPoint
      ? [firstGeo.address.geoPoint.lat, firstGeo.address.geoPoint.lng]
      : [25.2048, 55.2708];

    try {
      const map = L.map(mapRef.current, {
        center,
        zoom: 11,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);

      mapInstanceRef.current = map;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to initialize map";
      handleMapError(msg, { lat: center[0], lng: center[1], zoom: 11 });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      markersRef.current = [];
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    properties.forEach((p) => {
      if (!p.address.geoPoint) return;
      const { lat, lng } = p.address.geoPoint;
      const color = LISTING_COLORS[p.listingType] || "#6b7280";
      const isRent = p.listingType === "rent" || p.listingType === "lease";
      const price = p.price >= 1_000_000
        ? `${(p.price / 1_000_000).toFixed(1)}M`
        : p.price >= 1_000
          ? `${(p.price / 1_000).toFixed(0)}K${isRent ? "/mo" : ""}`
          : String(p.price);

      const icon = L.divIcon({
        className: "custom-property-marker",
        html: `<div style="background: ${color}; color: white; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: 700; white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,0.3); border: 2px solid white; cursor: pointer;">${esc(p.currency)} ${esc(price)}</div>`,
        iconSize: [0, 0],
        iconAnchor: [40, 15],
      });

      const marker = L.marker([lat, lng], { icon }).addTo(map);

      const container = document.createElement("div");
      container.style.cssText = "width:200px;font-family:system-ui,sans-serif;";

      const imageUrl = (p.mediaIds || []).find(id => id.startsWith("http") || id.startsWith("/"));
      if (imageUrl) {
        const img = document.createElement("img");
        img.src = imageUrl;
        img.alt = "";
        img.style.cssText = "width:100%;height:100px;object-fit:cover;border-radius:8px;margin-bottom:8px;";
        img.onerror = () => { img.style.display = "none"; };
        container.appendChild(img);
      }

      const h3 = document.createElement("h3");
      h3.textContent = p.title;
      h3.style.cssText = "font-size:13px;font-weight:700;margin:0 0 4px 0;line-height:1.3;";
      container.appendChild(h3);

      const propId = p.id;
      const btn = document.createElement("button");
      btn.textContent = "View Details \u2192";
      btn.style.cssText = `width:100%;padding:6px;border:none;border-radius:6px;background:${color};color:white;font-size:12px;font-weight:600;cursor:pointer;`;
      btn.addEventListener("click", () => onSelectRef.current?.(propId));
      container.appendChild(btn);

      marker.bindPopup(container, { maxWidth: 220, closeButton: true });
      marker.on("click", () => { marker.openPopup(); });
      markersRef.current.push(marker);
    });

    const geoProps = properties.filter(p => p.address.geoPoint);
    if (geoProps.length > 1) {
      const bounds = L.latLngBounds(
        geoProps.map(p => [p.address.geoPoint!.lat, p.address.geoPoint!.lng] as [number, number])
      );
      map.fitBounds(bounds, { padding: [30, 30] });
    } else if (geoProps.length === 1) {
      map.setView([geoProps[0].address.geoPoint!.lat, geoProps[0].address.geoPoint!.lng], 14);
    }
  }, [properties]);

  if (mapError) {
    return (
      <div className="rounded-2xl overflow-hidden border" style={{ borderColor: "hsl(var(--border))" }}>
        <MapErrorFallback message={mapError} className="w-full" style={{ height: 400 }} />
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden border" style={{ borderColor: "hsl(var(--border))" }}>
      <div ref={mapRef} style={{ height: 400, width: "100%" }} />
      <div className="flex items-center gap-4 px-3 py-2" style={{ background: "hsl(var(--card))" }}>
        {Object.entries({ sale: "#22c55e", rent: "#3b82f6", project: "#a855f7" }).map(([key, color]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: color }} />
            <span className="text-[10px] font-medium capitalize" style={{ color: "hsl(var(--muted-foreground))" }}>
              {key === "sale" ? "For Sale" : key === "rent" ? "For Rent" : "Projects"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
