/**
 * LiveEcosystemMap — Premium Leaflet map with MarkerCluster support.
 * Each entity category gets a unique animated marker.
 * Features: clustering, radius overlay, pulse animations, popup cards, live updates.
 */
import { useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import type { EcosystemEntity, EcosystemCategory } from "@/hooks/useEcosystemRadar";

const CATEGORY_STYLE: Record<EcosystemCategory, { emoji: string; color: string; borderColor: string }> = {
  agent:              { emoji: "🧑‍💼", color: "#8b5cf6", borderColor: "#a78bfa" },
  technician:         { emoji: "🔧",   color: "#f59e0b", borderColor: "#fbbf24" },
  delivery:           { emoji: "📦",   color: "#22c55e", borderColor: "#4ade80" },
  visit:              { emoji: "🏠",   color: "#06b6d4", borderColor: "#22d3ee" },
  intervention:       { emoji: "🛠️",   color: "#ef4444", borderColor: "#f87171" },
  available_property: { emoji: "✅",   color: "#22c55e", borderColor: "#4ade80" },
  releasing_soon:     { emoji: "📅",   color: "#f59e0b", borderColor: "#fbbf24" },
  scheduled_visit:    { emoji: "🗓️",   color: "#8b5cf6", borderColor: "#a78bfa" },
  renovation:         { emoji: "🏗️",   color: "#f59e0b", borderColor: "#fbbf24" },
  back_on_market:     { emoji: "🔄",   color: "#22c55e", borderColor: "#4ade80" },
  service:            { emoji: "💼",   color: "#06b6d4", borderColor: "#22d3ee" },
  concierge:          { emoji: "🛎️",   color: "#8b5cf6", borderColor: "#a78bfa" },
  person:             { emoji: "👤",   color: "#64748b", borderColor: "#94a3b8" },
};

interface Props {
  lat: number;
  lng: number;
  radius: number;
  entities: EcosystemEntity[];
  onSelect?: (entity: EcosystemEntity) => void;
}

export default function LiveEcosystemMap({ lat, lng, radius, entities, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const radiusRef = useRef<L.Circle | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

  // Initialize map once
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

    // Create cluster group with custom styling
    const cluster = L.markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: (clusterObj) => {
        const count = clusterObj.getChildCount();
        const size = count < 10 ? 36 : count < 50 ? 44 : 52;
        return L.divIcon({
          className: "",
          html: `<div style="
            width:${size}px;height:${size}px;border-radius:50%;
            background:linear-gradient(135deg, #06b6d4, #8b5cf6);
            display:flex;align-items:center;justify-content:center;
            color:white;font-weight:700;font-size:${count < 10 ? 13 : 12}px;
            box-shadow:0 4px 16px rgba(6,182,212,0.4);
            border:2px solid rgba(255,255,255,0.2);
          ">${count}</div>`,
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

  // Update view when center/radius changes
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setView([lat, lng], getZoomForRadius(radius), { animate: true });

    // Update radius circle
    if (radiusRef.current) {
      mapRef.current.removeLayer(radiusRef.current);
    }
    radiusRef.current = L.circle([lat, lng], {
      radius: radius * 1000,
      color: "#06b6d4",
      fillColor: "#06b6d4",
      fillOpacity: 0.03,
      weight: 1,
      opacity: 0.2,
      dashArray: "6 4",
    }).addTo(mapRef.current);

    // Update user marker
    if (userMarkerRef.current) {
      mapRef.current.removeLayer(userMarkerRef.current);
    }
    const userIcon = L.divIcon({
      className: "",
      html: `
        <div style="position:relative;width:20px;height:20px;">
          <div style="position:absolute;inset:0;border-radius:50%;background:#06b6d4;border:3px solid white;box-shadow:0 0 20px rgba(6,182,212,0.6);z-index:2;"></div>
          <div style="position:absolute;inset:-8px;border-radius:50%;border:2px solid #06b6d4;opacity:0.4;animation:ecosystemPulse 2s ease-out infinite;"></div>
        </div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
    userMarkerRef.current = L.marker([lat, lng], { icon: userIcon, zIndexOffset: 2000 })
      .addTo(mapRef.current)
      .bindPopup('<span style="font-weight:600;">📍 You are here</span>');
  }, [lat, lng, radius]);

  // Render entity markers into cluster group
  const renderMarkers = useCallback(() => {
    const cluster = clusterRef.current;
    if (!cluster) return;

    cluster.clearLayers();

    entities.forEach((entity) => {
      if (!entity.lat || !entity.lng) return;
      const style = CATEGORY_STYLE[entity.category] || CATEGORY_STYLE.person;
      const isOnline = entity.online;
      const isActive = entity.status === "active" || entity.status === "en_route";

      const icon = L.divIcon({
        className: "",
        html: `
          <div style="position:relative;width:36px;height:36px;cursor:pointer;">
            <div style="
              width:36px;height:36px;border-radius:10px;
              background:${style.color}18;
              border:2px solid ${style.borderColor}90;
              display:flex;align-items:center;justify-content:center;
              font-size:16px;
              box-shadow:0 2px 12px ${style.color}40;
              transition:transform 0.2s;
            ">${style.emoji}</div>
            ${isOnline ? `<div style="position:absolute;top:-2px;right:-2px;width:10px;height:10px;border-radius:50%;background:#22c55e;border:2px solid #0f172a;"></div>` : ""}
            ${isActive ? `<div style="position:absolute;inset:-4px;border-radius:12px;border:2px solid ${style.color};opacity:0.5;animation:ecosystemPulse 1.5s ease-out infinite;"></div>` : ""}
          </div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const priceStr = entity.price && entity.price > 0
        ? `<br/><span style="font-weight:700;color:${style.color};">${entity.price > 1000 ? `${(entity.price / 1000).toFixed(0)}k` : entity.price} ${entity.currency || "EUR"}</span>`
        : "";
      const distStr = entity.distance_km < 1
        ? `${Math.round(entity.distance_km * 1000)}m`
        : `${entity.distance_km.toFixed(1)}km`;

      const marker = L.marker([entity.lat, entity.lng], { icon })
        .bindPopup(`
          <div style="min-width:160px;">
            <div style="font-weight:700;font-size:13px;margin-bottom:2px;">${style.emoji} ${entity.title}</div>
            ${entity.subtitle ? `<div style="font-size:11px;opacity:0.7;margin-bottom:4px;">${entity.subtitle}</div>` : ""}
            <div style="font-size:10px;opacity:0.5;">${distStr} away</div>
            ${priceStr}
          </div>
        `);

      if (onSelect) {
        marker.on("click", () => onSelect(entity));
      }

      cluster.addLayer(marker);
    });
  }, [entities, onSelect]);

  useEffect(() => {
    renderMarkers();
  }, [renderMarkers]);

  return (
    <>
      <div ref={containerRef} className="w-full h-full min-h-[400px]" style={{ zIndex: 1 }} />
      <style>{`
        @keyframes ecosystemPulse {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        .marker-cluster-small, .marker-cluster-medium, .marker-cluster-large {
          background: transparent !important;
        }
        .marker-cluster-small div, .marker-cluster-medium div, .marker-cluster-large div {
          background: transparent !important;
        }
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
