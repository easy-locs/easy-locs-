/**
 * ShopsMapView — Leaflet map showing shops with clustering and radius.
 * PASS151: Lightweight shop map for /shops page.
 */
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { useGeolocation } from "@/hooks/useGeolocation";

interface Shop {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  description?: string | null;
  vertical?: string | null;
  lat?: number | null;
  lng?: number | null;
}

interface Props {
  shops: Shop[];
  radiusKm?: number;
  onOpenShop?: (slug: string) => void;
}

export default function ShopsMapView({ shops, radiusKm = 25, onOpenShop }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const { lat: userLat, lng: userLng } = useGeolocation();

  const centerLat = userLat || 48.8566;
  const centerLng = userLng || 2.3522;

  useEffect(() => {
    if (!containerRef.current) return;

    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current, {
        center: [centerLat, centerLng],
        zoom: getZoom(radiusKm),
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
      }).addTo(mapRef.current);

      L.control.zoom({ position: "bottomright" }).addTo(mapRef.current);

      clusterRef.current = L.markerClusterGroup({
        maxClusterRadius: 50,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        iconCreateFunction: (cluster) => {
          const count = cluster.getChildCount();
          const size = count < 10 ? 38 : count < 50 ? 46 : 54;
          return L.divIcon({
            className: "",
            html: `<div style="
              width:${size}px;height:${size}px;border-radius:50%;
              background:linear-gradient(145deg, hsl(var(--primary)), hsl(var(--primary) / 0.7));
              display:flex;align-items:center;justify-content:center;
              color:white;font-weight:800;font-size:13px;letter-spacing:-0.3px;
              box-shadow:0 6px 24px hsl(var(--primary) / 0.45), inset 0 1px 0 rgba(255,255,255,0.2);
              border:2px solid rgba(255,255,255,0.18);
              position:relative;
            "><span style="position:relative;z-index:1;">${count}</span></div>
            <div style="position:absolute;inset:-5px;border-radius:50%;border:2px solid hsl(var(--primary) / 0.3);animation:shopPulse 2.5s ease-out infinite;pointer-events:none;"></div>`,
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
          });
        },
      }).addTo(mapRef.current);
    }

    const map = mapRef.current;
    const cluster = clusterRef.current!;

    map.setView([centerLat, centerLng], getZoom(radiusKm), { animate: true });

    // Clear old
    map.eachLayer((layer) => {
      if (layer instanceof L.Circle || (layer instanceof L.Marker && !(layer as any).__isCluster)) {
        map.removeLayer(layer);
      }
    });
    cluster.clearLayers();

    // User position
    if (userLat && userLng) {
      const userIcon = L.divIcon({
        className: "",
        html: `<div style="position:relative;width:20px;height:20px;">
          <div style="position:absolute;inset:3px;border-radius:50%;background:radial-gradient(circle at 40% 40%,#93c5fd,#3b82f6);border:3px solid white;box-shadow:0 0 16px rgba(59,130,246,0.6);z-index:2;"></div>
          <div style="position:absolute;inset:-4px;border-radius:50%;border:2px solid rgba(59,130,246,0.4);animation:shopPulse 2s ease-out infinite;"></div>
          <div style="position:absolute;inset:-4px;border-radius:50%;border:2px solid rgba(59,130,246,0.4);animation:shopPulse 2s ease-out infinite;animation-delay:0.7s;"></div>
        </div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
      L.marker([userLat, userLng], { icon: userIcon, zIndexOffset: 1000 }).addTo(map).bindPopup("You");

      L.circle([userLat, userLng], {
        radius: radius * 1000,
        color: "#3b82f6",
        fillColor: "#3b82f6",
        fillOpacity: 0.04,
        weight: 1,
        opacity: 0.25,
        dashArray: "6 4",
      }).addTo(map);
    }

    // Shop markers
    shops.forEach((shop) => {
      const sLat = (shop as any).lat;
      const sLng = (shop as any).lng;
      if (!sLat || !sLng) return;

      const icon = L.divIcon({
        className: "",
        html: `<div style="
          position:relative;width:36px;height:36px;
        ">
          <div style="
            width:36px;height:36px;border-radius:11px;
            background:${shop.logo_url ? `url(${shop.logo_url}) center/cover` : "linear-gradient(145deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))"};
            border:2px solid rgba(255,255,255,0.15);
            box-shadow:0 4px 16px rgba(0,0,0,0.35), 0 0 12px hsl(var(--primary) / 0.2);
            display:flex;align-items:center;justify-content:center;
            color:white;font-size:15px;
          ">${shop.logo_url ? "" : "🏪"}</div>
          <div style="position:absolute;inset:-4px;border-radius:15px;background:radial-gradient(circle, hsl(var(--primary) / 0.3) 0%, transparent 65%);opacity:0.4;pointer-events:none;z-index:-1;animation:shopGlow 2.5s ease-in-out infinite alternate;"></div>
        </div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker([sLat, sLng], { icon })
        .bindPopup(`<div style="min-width:120px;"><strong>${shop.name}</strong>${shop.vertical ? `<br/><span style="font-size:11px;opacity:0.6;">${shop.vertical}</span>` : ""}</div>`);

      marker.on("click", () => onShopClick(shop.slug));
      cluster.addLayer(marker);
    });
  }, [shops, radius, centerLat, centerLng, userLat, userLng, onShopClick]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        clusterRef.current = null;
      }
    };
  }, []);

  return (
    <>
      <div ref={containerRef} className="w-full h-full min-h-[400px]" style={{ zIndex: 1 }} />
      <style>{`
        @keyframes shopPulse { 0% { transform:scale(1);opacity:0.5; } 100% { transform:scale(2.2);opacity:0; } }
        @keyframes shopGlow { 0% { opacity:0.25;transform:scale(0.95); } 100% { opacity:0.5;transform:scale(1.08); } }
        .leaflet-popup-content-wrapper { background:rgba(10,18,35,0.94)!important;backdrop-filter:blur(16px) saturate(1.5);color:white!important;border:1px solid rgba(59,130,246,0.15)!important;border-radius:14px!important;box-shadow:0 10px 40px rgba(0,0,0,0.5)!important; }
        .leaflet-popup-tip { background:rgba(10,18,35,0.94)!important; }
        .marker-cluster-small,.marker-cluster-medium,.marker-cluster-large { background:transparent!important; }
        .marker-cluster-small div,.marker-cluster-medium div,.marker-cluster-large div { background:transparent!important; }
      `}</style>
    </>
  );
}

function getZoom(km: number): number {
  if (km <= 5) return 14;
  if (km <= 10) return 13;
  if (km <= 25) return 11;
  if (km <= 50) return 10;
  if (km <= 100) return 9;
  return 8;
}
