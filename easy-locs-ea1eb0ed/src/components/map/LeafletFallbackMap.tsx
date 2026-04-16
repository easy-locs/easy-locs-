import { useEffect, useRef, memo, useState } from "react";
import type { GeoEntity } from "@/lib/geo/geoEntityAdapter";
import type L from "leaflet";
import { getRasterTileUrl } from "@/lib/maplibre/config";

interface LeafletFallbackMapProps {
  entities?: GeoEntity[];
  userLat?: number;
  userLng?: number;
  showUserLocation?: boolean;
  selectedId?: string;
  onSelectEntity?: (entity: GeoEntity) => void;
  className?: string;
  radiusKm?: number;
}

const VERTICAL_COLORS: Record<string, string> = {
  restaurant: "#f97316",
  food: "#f97316",
  hotel: "#8b5cf6",
  stay: "#8b5cf6",
  shop: "#3b82f6",
  grocery: "#22c55e",
  service: "#06b6d4",
  property: "#ec4899",
};

function getColor(entity: GeoEntity): string {
  return VERTICAL_COLORS[entity.type] || VERTICAL_COLORS[entity.category || ""] || "#1AAE8E";
}

const LeafletFallbackMap = memo(function LeafletFallbackMap({
  entities = [],
  userLat = 25.2,
  userLng = 55.27,
  showUserLocation = true,
  selectedId,
  onSelectEntity,
  className = "",
  radiusKm = 5,
}: LeafletFallbackMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const leafletRef = useRef<typeof L | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let cancelled = false;

    (async () => {
      const LeafletModule = await import("leaflet");
      const L = LeafletModule.default || LeafletModule;
      leafletRef.current = L;

      if (cancelled || !containerRef.current) return;

      const linkEl = document.getElementById("leaflet-css-link");
      if (!linkEl) {
        const link = document.createElement("link");
        link.id = "leaflet-css-link";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      const map = L.map(containerRef.current, {
        center: [userLat, userLng],
        zoom: 13,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer(getRasterTileUrl("dark"), {
        maxZoom: 19,
        subdomains: "abcd",
      }).addTo(map);

      L.control.zoom({ position: "bottomright" }).addTo(map);

      if (showUserLocation) {
        const userIcon = L.divIcon({
          className: "leaflet-user-marker",
          html: `<div style="width:14px;height:14px;border-radius:50%;background:#1AAE8E;border:3px solid rgba(26,174,142,0.3);box-shadow:0 0 12px rgba(26,174,142,0.5);"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });
        L.marker([userLat, userLng], { icon: userIcon }).addTo(map);

        L.circle([userLat, userLng], {
          radius: radiusKm * 1000,
          color: "rgba(26,174,142,0.3)",
          fillColor: "rgba(26,174,142,0.05)",
          fillOpacity: 0.3,
          weight: 1,
        }).addTo(map);
      }

      mapRef.current = map;

      setTimeout(() => map.invalidateSize(), 100);
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !leafletRef.current) return;
    const L = leafletRef.current;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const map = mapRef.current;

    entities.slice(0, 80).forEach(entity => {
      const color = getColor(entity);
      const isSelected = entity.id === selectedId;
      const size = isSelected ? 16 : 10;
      const icon = L.divIcon({
        className: "leaflet-entity-marker",
        html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,${isSelected ? 0.9 : 0.4});box-shadow:0 2px 8px ${color}66;transition:all 0.2s;cursor:pointer;"></div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker([entity.lat, entity.lng], { icon }).addTo(map);

      if (entity.name || entity.title) {
        marker.bindTooltip(entity.name || entity.title || "", {
          direction: "top",
          offset: [0, -8],
          className: "leaflet-entity-tooltip",
        });
      }

      if (onSelectEntity) {
        marker.on("click", () => onSelectEntity(entity));
      }

      markersRef.current.push(marker);
    });
  }, [entities, selectedId, onSelectEntity]);

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView([userLat, userLng], mapRef.current.getZoom());
    }
  }, [userLat, userLng]);

  return (
    <>
      <style>{`
        .leaflet-entity-tooltip {
          background: hsl(226 24% 14% / 0.95) !important;
          border: 1px solid hsl(220 15% 25%) !important;
          color: #f0f4f3 !important;
          border-radius: 8px !important;
          padding: 4px 8px !important;
          font-size: 11px !important;
          font-weight: 600 !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
        }
        .leaflet-entity-tooltip::before {
          border-top-color: hsl(226 24% 14% / 0.95) !important;
        }
        .leaflet-user-marker, .leaflet-entity-marker {
          background: transparent !important;
          border: none !important;
        }
      `}</style>
      <div
        ref={containerRef}
        className={`w-full h-full ${className}`}
        style={{ minHeight: 300, background: "hsl(226 24% 10%)" }}
      />
    </>
  );
});

export default LeafletFallbackMap;

if (import.meta.hot) {
  import.meta.hot.accept();
}
