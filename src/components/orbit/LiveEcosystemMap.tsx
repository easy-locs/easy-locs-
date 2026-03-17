/**
 * LiveEcosystemMap — Premium Leaflet map with MarkerCluster.
 * PASS152: Premium markers with SVG icons (no emoji), pulse/glow animations,
 * glassmorphic popups, and live activity feel.
 */
import { useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import type { EcosystemEntity, EcosystemCategory } from "@/hooks/useEcosystemRadar";

// SVG icon paths for each category (replaces raw emoji)
const CATEGORY_STYLE: Record<EcosystemCategory, { icon: string; color: string; glow: string; label: string }> = {
  agent:              { icon: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>', color: "#8b5cf6", glow: "rgba(139,92,246,0.5)", label: "Agent" },
  technician:         { icon: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>', color: "#f59e0b", glow: "rgba(245,158,11,0.5)", label: "Tech" },
  delivery:           { icon: '<rect width="16" height="13" x="6" y="4" rx="2"/><path d="m2 7 4-3v6z"/><path d="m22 7-4-3v6z"/>', color: "#22c55e", glow: "rgba(34,197,94,0.5)", label: "Delivery" },
  visit:              { icon: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>', color: "#06b6d4", glow: "rgba(6,182,212,0.5)", label: "Visit" },
  intervention:       { icon: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>', color: "#ef4444", glow: "rgba(239,68,68,0.5)", label: "Urgent" },
  available_property: { icon: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>', color: "#22c55e", glow: "rgba(34,197,94,0.5)", label: "Available" },
  releasing_soon:     { icon: '<rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>', color: "#f59e0b", glow: "rgba(245,158,11,0.5)", label: "Soon" },
  scheduled_visit:    { icon: '<rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>', color: "#8b5cf6", glow: "rgba(139,92,246,0.5)", label: "Scheduled" },
  renovation:         { icon: '<rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 3h-4l-2 4h8l-2-4z"/>', color: "#f59e0b", glow: "rgba(245,158,11,0.5)", label: "Reno" },
  back_on_market:     { icon: '<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>', color: "#22c55e", glow: "rgba(34,197,94,0.5)", label: "Back" },
  service:            { icon: '<rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 3h-4l-2 4h8l-2-4z"/>', color: "#06b6d4", glow: "rgba(6,182,212,0.5)", label: "Service" },
  concierge:          { icon: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>', color: "#8b5cf6", glow: "rgba(139,92,246,0.5)", label: "Concierge" },
  person:             { icon: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>', color: "#64748b", glow: "rgba(100,116,139,0.4)", label: "Person" },
};

function makeSvgIcon(svgPath: string, color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${svgPath}</svg>`;
}

interface HeatPoint {
  lat: number;
  lng: number;
  intensity: number;
}

interface Props {
  lat: number;
  lng: number;
  radius: number;
  entities: EcosystemEntity[];
  onSelect?: (entity: EcosystemEntity) => void;
  heatmapPoints?: HeatPoint[];
  showHeatmap?: boolean;
}

export default function LiveEcosystemMap({ lat, lng, radius, entities, onSelect, heatmapPoints, showHeatmap }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const radiusRef = useRef<L.Circle | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const heatLayerRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [lat, lng],
      zoom: getZoomForRadius(radius),
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    const cluster = L.markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: (clusterObj) => {
        const count = clusterObj.getChildCount();
        const size = count < 10 ? 40 : count < 50 ? 48 : 56;
        return L.divIcon({
          className: "",
      html: `<div class="eco-cluster" style="width:${size}px;height:${size}px;">
            <div class="eco-cluster-inner">${count}</div>
            <div class="eco-cluster-ring"></div>
            <div class="eco-cluster-ring eco-cluster-ring-2"></div>
          </div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });
      },
    });
    cluster.addTo(map);

    clusterRef.current = cluster;
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      clusterRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setView([lat, lng], getZoomForRadius(radius), { animate: true });

    if (radiusRef.current) mapRef.current.removeLayer(radiusRef.current);
    radiusRef.current = L.circle([lat, lng], {
      radius: radius * 1000,
      color: "#06b6d4",
      fillColor: "#06b6d4",
      fillOpacity: 0.03,
      weight: 1.5,
      opacity: 0.15,
      dashArray: "8 6",
    }).addTo(mapRef.current);

    if (userMarkerRef.current) mapRef.current.removeLayer(userMarkerRef.current);
    const userIcon = L.divIcon({
      className: "",
      html: `<div class="eco-user-marker">
        <div class="eco-user-dot"></div>
        <div class="eco-user-pulse"></div>
        <div class="eco-user-pulse eco-user-pulse-2"></div>
      </div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
    userMarkerRef.current = L.marker([lat, lng], { icon: userIcon, zIndexOffset: 2000 })
      .addTo(mapRef.current)
      .bindPopup('<div class="eco-popup"><strong>📍 Your position</strong></div>');
  }, [lat, lng, radius]);

  const renderMarkers = useCallback(() => {
    const cluster = clusterRef.current;
    if (!cluster) return;
    cluster.clearLayers();

    entities.forEach((entity) => {
      if (!entity.lat || !entity.lng) return;
      const style = CATEGORY_STYLE[entity.category] || CATEGORY_STYLE.person;
      const isOnline = entity.online;
      const isActive = entity.status === "active" || entity.status === "en_route";
      const svgIcon = makeSvgIcon(style.icon, "white");

      const icon = L.divIcon({
        className: "",
        html: `<div class="eco-marker" style="--marker-color:${style.color};--marker-glow:${style.glow};">
          <div class="eco-marker-bg">${svgIcon}</div>
          ${isOnline ? '<div class="eco-online-dot"></div>' : ""}
          ${isActive ? '<div class="eco-active-ring"></div><div class="eco-active-ring eco-active-ring-2"></div>' : ""}
          <div class="eco-marker-glow"></div>
        </div>`,
        iconSize: [42, 42],
        iconAnchor: [21, 21],
      });

      const priceStr = entity.price && entity.price > 0
        ? `<div class="eco-popup-price" style="color:${style.color};">${entity.price > 1000 ? `${(entity.price / 1000).toFixed(0)}k` : entity.price} ${entity.currency || "EUR"}</div>`
        : "";
      const distStr = entity.distance_km < 1
        ? `${Math.round(entity.distance_km * 1000)}m`
        : `${entity.distance_km.toFixed(1)}km`;

      const marker = L.marker([entity.lat, entity.lng], { icon })
        .bindPopup(`
          <div class="eco-popup">
            <div class="eco-popup-header">
              <div class="eco-popup-icon" style="background:${style.color};">${svgIcon}</div>
              <div>
                <div class="eco-popup-title">${entity.title}</div>
                ${entity.subtitle ? `<div class="eco-popup-sub">${entity.subtitle}</div>` : ""}
              </div>
            </div>
            <div class="eco-popup-meta">
              <span class="eco-popup-badge" style="background:${style.color}15;color:${style.color};border:1px solid ${style.color}30;">${style.label}</span>
              <span class="eco-popup-dist">${distStr}</span>
            </div>
            ${priceStr}
          </div>
        `);

      if (onSelect) marker.on("click", () => onSelect(entity));
      cluster.addLayer(marker);
    });
  }, [entities, onSelect]);

  useEffect(() => { renderMarkers(); }, [renderMarkers]);

  // Heatmap layer (canvas-based via leaflet.heat)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    if (!showHeatmap || !heatmapPoints?.length) return;

    try {
      const heatData = heatmapPoints.map(p => [p.lat, p.lng, p.intensity] as [number, number, number]);
      const heat = (L as any).heatLayer(heatData, {
        radius: 25,
        blur: 15,
        maxZoom: 17,
        gradient: { 0.0: "rgba(0,0,0,0)", 0.2: "#06b6d4", 0.4: "#22c55e", 0.6: "#f59e0b", 0.8: "#ef4444", 1.0: "#dc2626" },
        minOpacity: 0.35,
      });
      heat.addTo(map);
      heatLayerRef.current = heat;
    } catch { /* leaflet.heat may not be loaded */ }

    return () => {
      if (heatLayerRef.current && map) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
    };
  }, [showHeatmap, heatmapPoints]);

  return (
    <>
      <div ref={containerRef} className="w-full h-full min-h-[400px]" style={{ zIndex: 1 }} />
      <style>{`
        /* ─── User Marker ─── */
        .eco-user-marker { position:relative;width:28px;height:28px;will-change:transform; }
        .eco-user-dot {
          position:absolute;inset:6px;border-radius:50%;
          background:#06b6d4;
          border:3px solid rgba(255,255,255,0.95);
          box-shadow:0 0 16px rgba(6,182,212,0.6);
          z-index:2;
        }
        .eco-user-pulse {
          position:absolute;inset:-6px;border-radius:50%;
          border:2px solid rgba(6,182,212,0.5);
          animation:ecoPulse 2s ease-out infinite;
          will-change:transform,opacity;
        }
        .eco-user-pulse-2 { animation-delay:0.7s; }

        /* ─── Entity Markers ─── */
        .eco-marker { position:relative;width:42px;height:42px;cursor:pointer;will-change:transform; }
        .eco-marker-bg {
          width:42px;height:42px;border-radius:13px;
          background:var(--marker-color);
          display:flex;align-items:center;justify-content:center;
          box-shadow:0 4px 14px var(--marker-glow), inset 0 1px 0 rgba(255,255,255,0.15);
          border:1.5px solid rgba(255,255,255,0.12);
          transition:transform 0.2s ease;
        }
        .eco-marker:hover .eco-marker-bg { transform:scale(1.12); }
        .eco-marker-glow {
          position:absolute;inset:-5px;border-radius:18px;
          background:radial-gradient(circle, var(--marker-glow) 0%, transparent 65%);
          opacity:0.3;animation:ecoGlow 3s ease-in-out infinite alternate;
          pointer-events:none;z-index:-1;
          will-change:opacity,transform;
        }
        .eco-online-dot {
          position:absolute;top:-2px;right:-2px;width:12px;height:12px;border-radius:50%;
          background:#22c55e;
          border:2.5px solid #0f172a;
          box-shadow:0 0 8px rgba(34,197,94,0.5);
          z-index:3;
        }
        .eco-active-ring {
          position:absolute;inset:-6px;border-radius:18px;
          border:2px solid var(--marker-color);
          animation:ecoPulse 1.8s ease-out infinite;
          pointer-events:none;
          will-change:transform,opacity;
        }
        .eco-active-ring-2 { animation-delay:0.6s; }

        /* ─── Cluster ─── */
        .eco-cluster { position:relative;display:flex;align-items:center;justify-content:center; }
        .eco-cluster-inner {
          width:100%;height:100%;border-radius:50%;
          background:linear-gradient(145deg, #06b6d4, #8b5cf6);
          display:flex;align-items:center;justify-content:center;
          color:white;font-weight:800;font-size:13px;letter-spacing:-0.5px;
          box-shadow:0 4px 20px rgba(6,182,212,0.45), inset 0 1px 0 rgba(255,255,255,0.2);
          border:2px solid rgba(255,255,255,0.18);
        }
        .eco-cluster-ring {
          position:absolute;inset:-5px;border-radius:50%;
          border:2px solid rgba(6,182,212,0.3);
          animation:ecoPulse 2.5s ease-out infinite;
          will-change:transform,opacity;
        }
        .eco-cluster-ring-2 { animation-delay:0.8s; }

        /* ─── Popup ─── */
        .eco-popup { min-width:180px;font-family:system-ui,-apple-system,sans-serif; }
        .eco-popup-header { display:flex;align-items:center;gap:10px;margin-bottom:8px; }
        .eco-popup-icon {
          width:30px;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0;
        }
        .eco-popup-title { font-weight:700;font-size:13px;line-height:1.2;letter-spacing:-0.2px; }
        .eco-popup-sub { font-size:11px;opacity:0.55;margin-top:2px; }
        .eco-popup-meta { display:flex;align-items:center;gap:6px;margin-top:2px; }
        .eco-popup-badge { font-size:9px;font-weight:700;padding:2px 7px;border-radius:5px;text-transform:uppercase;letter-spacing:0.3px; }
        .eco-popup-dist { font-size:10px;opacity:0.4; }
        .eco-popup-price { font-weight:800;font-size:15px;margin-top:6px;letter-spacing:-0.3px; }

        .leaflet-popup-content-wrapper {
          background:rgba(10,18,35,0.95)!important;
          color:white!important;
          border:1px solid rgba(6,182,212,0.18)!important;
          border-radius:16px!important;
          box-shadow:0 10px 40px rgba(0,0,0,0.55)!important;
        }
        .leaflet-popup-tip { background:rgba(10,18,35,0.95)!important; }

        /* ─── Animations (transform/opacity only for GPU perf) ─── */
        @keyframes ecoPulse {
          0% { transform:scale(1); opacity:0.5; }
          100% { transform:scale(2.2); opacity:0; }
        }
        @keyframes ecoGlow {
          0% { opacity:0.2;transform:scale(0.95); }
          100% { opacity:0.4;transform:scale(1.08); }
        }

        .marker-cluster-small, .marker-cluster-medium, .marker-cluster-large { background:transparent!important; }
        .marker-cluster-small div, .marker-cluster-medium div, .marker-cluster-large div { background:transparent!important; }
      `}</style>
    </>
  );
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
