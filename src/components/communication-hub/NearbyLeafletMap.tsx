/**
 * NearbyLeafletMap — Interactive Leaflet map with MarkerCluster for Nearby section.
 * Renders OpenStreetMap tiles with clustered markers for users and items.
 */
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

interface NearbyUser {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  status: string;
  lat: number;
  lng: number;
  distance_km: number;
  professional_category: string | null;
}

interface NearbyItem {
  item_id: string;
  item_type: string;
  title: string;
  lat: number;
  lng: number;
  distance_km: number;
  price: number;
  currency: string;
  provider_name: string | null;
}

interface Props {
  lat: number;
  lng: number;
  radius: number;
  users: NearbyUser[];
  items: NearbyItem[];
  onRefresh?: () => void;
}

export default function NearbyLeafletMap({ lat, lng, radius, users, items }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current, {
        center: [lat, lng],
        zoom: getZoomForRadius(radius),
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(mapRef.current);

      L.control.zoom({ position: "bottomright" }).addTo(mapRef.current);

      clusterRef.current = L.markerClusterGroup({
        maxClusterRadius: 45,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        iconCreateFunction: (cluster) => {
          const count = cluster.getChildCount();
          const size = count < 10 ? 34 : count < 50 ? 42 : 50;
          return L.divIcon({
            className: "",
            html: `<div style="
              width:${size}px;height:${size}px;border-radius:50%;
              background:linear-gradient(135deg, #06b6d4, #3b82f6);
              display:flex;align-items:center;justify-content:center;
              color:white;font-weight:700;font-size:${count < 10 ? 13 : 12}px;
              box-shadow:0 3px 12px rgba(6,182,212,0.35);
              border:2px solid rgba(255,255,255,0.25);
            ">${count}</div>`,
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
          });
        },
      }).addTo(mapRef.current);
    }

    const map = mapRef.current;
    const cluster = clusterRef.current!;
    map.setView([lat, lng], getZoomForRadius(radius));

    // Clear existing non-cluster layers (user marker, radius circle)
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.CircleMarker || layer instanceof L.Circle) {
        if (!(layer as any).__isClusterChild) {
          map.removeLayer(layer);
        }
      }
    });
    cluster.clearLayers();

    // User position marker (cyan pulse)
    const userIcon = L.divIcon({
      className: "",
      html: `<div style="width:16px;height:16px;border-radius:50%;background:#06b6d4;border:3px solid white;box-shadow:0 0 16px rgba(6,182,212,0.5);"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });
    L.marker([lat, lng], { icon: userIcon, zIndexOffset: 1000 }).addTo(map).bindPopup("You are here");

    // Radius circle
    L.circle([lat, lng], {
      radius: radius * 1000,
      color: "#06b6d4",
      fillColor: "#06b6d4",
      fillOpacity: 0.04,
      weight: 1,
      opacity: 0.3,
    }).addTo(map);

    // Nearby user markers → cluster
    users.forEach((u) => {
      if (!u.lat || !u.lng) return;
      const isOnline = u.status === "online";
      const color = isOnline ? "#22c55e" : "#94a3b8";
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:32px;height:32px;border-radius:50%;background:${u.avatar_url ? `url(${u.avatar_url}) center/cover` : "#1e293b"};border:2px solid ${color};box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:#06b6d4;font-size:14px;">${u.avatar_url ? "" : "👤"}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      const marker = L.marker([u.lat, u.lng], { icon })
        .bindPopup(`<strong>${u.display_name || "User"}</strong><br/>${u.distance_km.toFixed(1)} km`);
      cluster.addLayer(marker);
    });

    // Nearby item markers → cluster
    items.forEach((item) => {
      if (!item.lat || !item.lng) return;
      const color = item.item_type === "real_estate" ? "#f59e0b" : item.item_type === "concierge" ? "#8b5cf6" : "#06b6d4";
      const emoji = item.item_type === "real_estate" ? "🏠" : item.item_type === "concierge" ? "🛎️" : "💼";
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:28px;height:28px;border-radius:8px;background:${color}20;border:2px solid ${color}90;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.3);">${emoji}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      const priceLabel = item.price > 0 ? `<br/>${item.price > 1000 ? `${(item.price / 1000).toFixed(0)}k` : item.price} ${item.currency}` : "";
      const marker = L.marker([item.lat, item.lng], { icon })
        .bindPopup(`<strong>${item.title}</strong>${priceLabel}<br/>${item.distance_km.toFixed(1)} km`);
      cluster.addLayer(marker);
    });

    return () => {};
  }, [lat, lng, radius, users, items]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        clusterRef.current = null;
      }
    };
  }, []);

  return <div ref={containerRef} className="w-full h-full min-h-[400px]" style={{ zIndex: 1 }} />;
}

function getZoomForRadius(km: number): number {
  if (km <= 5) return 13;
  if (km <= 10) return 12;
  if (km <= 25) return 11;
  if (km <= 50) return 10;
  if (km <= 100) return 9;
  return 8;
}
