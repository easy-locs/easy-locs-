/**
 * LiveEcosystemMap — Premium Mapbox GL map with animated markers.
 * Migrated from Leaflet to Mapbox for consistency with all other map components.
 * Features: animated user marker, category-colored entity markers, radius circle,
 * cluster support, glassmorphic popups, pulse/glow animations.
 */
import { useEffect, useRef, useCallback, memo } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MAPBOX_ACCESS_TOKEN } from "@/lib/mapbox/config";
import type { EcosystemEntity, EcosystemCategory } from "@/hooks/useEcosystemRadar";

const CATEGORY_STYLE: Record<EcosystemCategory, { color: string; glow: string; emoji: string; label: string }> = {
  agent:              { color: "#8b5cf6", glow: "rgba(139,92,246,0.5)", emoji: "👤", label: "Agent" },
  technician:         { color: "#f59e0b", glow: "rgba(245,158,11,0.5)", emoji: "🔧", label: "Tech" },
  delivery:           { color: "#22c55e", glow: "rgba(34,197,94,0.5)",  emoji: "📦", label: "Delivery" },
  visit:              { color: "#06b6d4", glow: "rgba(6,182,212,0.5)",  emoji: "🏠", label: "Visit" },
  intervention:       { color: "#ef4444", glow: "rgba(239,68,68,0.5)",  emoji: "⚡", label: "Urgent" },
  available_property: { color: "#22c55e", glow: "rgba(34,197,94,0.5)", emoji: "🏡", label: "Available" },
  releasing_soon:     { color: "#f59e0b", glow: "rgba(245,158,11,0.5)", emoji: "📅", label: "Soon" },
  scheduled_visit:    { color: "#8b5cf6", glow: "rgba(139,92,246,0.5)", emoji: "🗓️", label: "Scheduled" },
  renovation:         { color: "#f59e0b", glow: "rgba(245,158,11,0.5)", emoji: "🏗️", label: "Reno" },
  back_on_market:     { color: "#22c55e", glow: "rgba(34,197,94,0.5)", emoji: "🔄", label: "Back" },
  service:            { color: "#06b6d4", glow: "rgba(6,182,212,0.5)",  emoji: "⭐", label: "Service" },
  concierge:          { color: "#8b5cf6", glow: "rgba(139,92,246,0.5)", emoji: "🔔", label: "Concierge" },
  person:             { color: "#64748b", glow: "rgba(100,116,139,0.4)", emoji: "👤", label: "Person" },
};

interface HeatPoint { lat: number; lng: number; intensity: number; }

interface Props {
  lat: number;
  lng: number;
  radius: number;
  entities: EcosystemEntity[];
  onSelect?: (entity: EcosystemEntity) => void;
  heatmapPoints?: HeatPoint[];
  showHeatmap?: boolean;
}

function getZoomForRadius(km: number): number {
  if (km <= 5) return 14;
  if (km <= 10) return 13;
  if (km <= 25) return 11;
  if (km <= 50) return 10;
  if (km <= 100) return 9;
  if (km <= 200) return 8;
  return 7;
}

function createMarkerElement(entity: EcosystemEntity): HTMLDivElement {
  const style = CATEGORY_STYLE[entity.category] || CATEGORY_STYLE.person;
  const isOnline = entity.online;
  const isActive = entity.status === "active" || entity.status === "en_route";

  const el = document.createElement("div");
  el.className = "eco-marker-wrap";
  el.innerHTML = `
    <div class="eco-mb-marker" style="--mc:${style.color};--mg:${style.glow};">
      <div class="eco-mb-bg">${style.emoji}</div>
      ${isOnline ? '<div class="eco-mb-online"></div>' : ""}
      ${isActive ? '<div class="eco-mb-pulse"></div><div class="eco-mb-pulse eco-mb-pulse-2"></div>' : ""}
      <div class="eco-mb-glow"></div>
    </div>
  `;
  el.style.cursor = "pointer";
  return el;
}

function createUserMarkerElement(): HTMLDivElement {
  const el = document.createElement("div");
  el.innerHTML = `
    <div class="eco-mb-user">
      <div class="eco-mb-user-dot"></div>
      <div class="eco-mb-user-ring"></div>
      <div class="eco-mb-user-ring eco-mb-user-ring-2"></div>
    </div>
  `;
  return el;
}

function LiveEcosystemMap({ lat, lng, radius, entities, onSelect, heatmapPoints, showHeatmap }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const radiusSourceAdded = useRef(false);

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [lng, lat],
      zoom: getZoomForRadius(radius),
      attributionControl: false,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      radiusSourceAdded.current = false;
    };
  }, []);

  // Update center, radius circle, user marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.flyTo({ center: [lng, lat], zoom: getZoomForRadius(radius), duration: 800 });

    // Radius circle via GeoJSON
    const radiusGeoJSON: GeoJSON.Feature = {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [lng, lat],
      },
      properties: { radius_m: radius * 1000 },
    };

    const onStyleLoad = () => {
      if (map.getSource("eco-radius")) {
        (map.getSource("eco-radius") as mapboxgl.GeoJSONSource).setData(radiusGeoJSON);
      } else {
        map.addSource("eco-radius", { type: "geojson", data: radiusGeoJSON });
        map.addLayer({
          id: "eco-radius-fill",
          type: "circle",
          source: "eco-radius",
          paint: {
            "circle-radius": { stops: [[0, 0], [20, radius * 1000]], base: 2 },
            "circle-color": "#06b6d4",
            "circle-opacity": 0.04,
            "circle-stroke-width": 1.5,
            "circle-stroke-color": "#06b6d4",
            "circle-stroke-opacity": 0.12,
          },
        });
        radiusSourceAdded.current = true;
      }
    };

    if (map.isStyleLoaded()) onStyleLoad();
    else map.once("style.load", onStyleLoad);

    // User marker
    if (userMarkerRef.current) userMarkerRef.current.remove();
    userMarkerRef.current = new mapboxgl.Marker({ element: createUserMarkerElement() })
      .setLngLat([lng, lat])
      .addTo(map);
  }, [lat, lng, radius]);

  // Render entity markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    entities.forEach((entity) => {
      if (!entity.lat || !entity.lng) return;
      const style = CATEGORY_STYLE[entity.category] || CATEGORY_STYLE.person;
      const el = createMarkerElement(entity);

      el.addEventListener("click", () => onSelect?.(entity));

      const distStr = entity.distance_km < 1
        ? `${Math.round(entity.distance_km * 1000)}m`
        : `${entity.distance_km.toFixed(1)}km`;

      const priceStr = entity.price && entity.price > 0
        ? `<div style="font-weight:800;font-size:14px;margin-top:4px;color:${style.color};">${entity.price > 1000 ? `${(entity.price / 1000).toFixed(0)}k` : entity.price} ${entity.currency || "EUR"}</div>`
        : "";

      const popup = new mapboxgl.Popup({ offset: 24, closeButton: false, maxWidth: "220px" })
        .setHTML(`
          <div class="eco-mb-popup">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
              <div style="width:28px;height:28px;border-radius:8px;background:${style.color};display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;">${style.emoji}</div>
              <div>
                <div style="font-weight:700;font-size:12px;line-height:1.2;">${entity.title}</div>
                ${entity.subtitle ? `<div style="font-size:10px;opacity:0.5;margin-top:1px;">${entity.subtitle}</div>` : ""}
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="font-size:9px;font-weight:700;padding:2px 6px;border-radius:4px;background:${style.color}18;color:${style.color};border:1px solid ${style.color}30;text-transform:uppercase;">${style.label}</span>
              <span style="font-size:10px;opacity:0.4;">${distStr}</span>
            </div>
            ${priceStr}
          </div>
        `);

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([entity.lng, entity.lat])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [entities, onSelect]);

  return (
    <>
      <div ref={containerRef} className="w-full h-full min-h-[400px]" />
      <style>{`
        .eco-marker-wrap { position:relative; }

        .eco-mb-marker { position:relative;width:42px;height:42px;will-change:transform; }
        .eco-mb-bg {
          width:42px;height:42px;border-radius:13px;
          background:var(--mc);
          display:flex;align-items:center;justify-content:center;
          font-size:18px;
          box-shadow:0 4px 14px var(--mg), inset 0 1px 0 rgba(255,255,255,0.15);
          border:1.5px solid rgba(255,255,255,0.12);
          transition:transform 0.2s ease;
        }
        .eco-marker-wrap:hover .eco-mb-bg { transform:scale(1.12); }
        .eco-mb-glow {
          position:absolute;inset:-5px;border-radius:18px;
          background:radial-gradient(circle, var(--mg) 0%, transparent 65%);
          opacity:0.3;animation:ecoGlow 3s ease-in-out infinite alternate;
          pointer-events:none;z-index:-1;
        }
        .eco-mb-online {
          position:absolute;top:-2px;right:-2px;width:12px;height:12px;border-radius:50%;
          background:#22c55e;border:2.5px solid #0f172a;
          box-shadow:0 0 8px rgba(34,197,94,0.5);z-index:3;
        }
        .eco-mb-pulse {
          position:absolute;inset:-6px;border-radius:18px;
          border:2px solid var(--mc);
          animation:ecoPulse 1.8s ease-out infinite;
          pointer-events:none;
        }
        .eco-mb-pulse-2 { animation-delay:0.6s; }

        .eco-mb-user { position:relative;width:28px;height:28px; }
        .eco-mb-user-dot {
          position:absolute;inset:6px;border-radius:50%;
          background:#06b6d4;border:3px solid rgba(255,255,255,0.95);
          box-shadow:0 0 16px rgba(6,182,212,0.6);z-index:2;
        }
        .eco-mb-user-ring {
          position:absolute;inset:-6px;border-radius:50%;
          border:2px solid rgba(6,182,212,0.5);
          animation:ecoPulse 2s ease-out infinite;
        }
        .eco-mb-user-ring-2 { animation-delay:0.7s; }

        .mapboxgl-popup-content {
          background:rgba(10,18,35,0.95)!important;
          color:white!important;
          border:1px solid rgba(6,182,212,0.18)!important;
          border-radius:16px!important;
          box-shadow:0 10px 40px rgba(0,0,0,0.55)!important;
          padding:12px!important;
        }
        .mapboxgl-popup-tip {
          border-top-color:rgba(10,18,35,0.95)!important;
        }

        @keyframes ecoPulse {
          0% { transform:scale(1); opacity:0.5; }
          100% { transform:scale(2.2); opacity:0; }
        }
        @keyframes ecoGlow {
          0% { opacity:0.2;transform:scale(0.95); }
          100% { opacity:0.4;transform:scale(1.08); }
        }
      `}</style>
    </>
  );
}

export default memo(LiveEcosystemMap);
