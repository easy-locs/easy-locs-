/**
 * ServiceTrackingMap — Leaflet map for live service tracking (Deliveroo/Uber style).
 * Shows tracker position, destination, ETA, route line.
 * PASS55 Block G
 */
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { TrackingSession } from "@/hooks/useServiceTracking";

interface Props {
  session: TrackingSession;
  className?: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "#64748b",
  en_route: "#06b6d4",
  nearby: "#f59e0b",
  arrived: "#22c55e",
  completed: "#8b5cf6",
  cancelled: "#ef4444",
};

export default function ServiceTrackingMap({ session, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const trackerMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);

  const color = STATUS_COLORS[session.status] || "#06b6d4";

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const centerLat = session.current_lat || session.destination_lat || 0;
    const centerLng = session.current_lng || session.destination_lng || 0;

    const map = L.map(containerRef.current, {
      center: [centerLat, centerLng],
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      trackerMarkerRef.current = null;
      destMarkerRef.current = null;
      routeLineRef.current = null;
    };
  }, []);

  // Update markers when session changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Destination marker
    if (session.destination_lat && session.destination_lng) {
      const destIcon = L.divIcon({
        className: "",
        html: `
          <div style="position:relative;width:32px;height:32px;">
            <div style="width:32px;height:32px;border-radius:50% 50% 50% 0;background:${color};transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 12px ${color}60;">
              <span style="transform:rotate(45deg);font-size:14px;">📍</span>
            </div>
          </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });

      if (destMarkerRef.current) {
        destMarkerRef.current.setLatLng([session.destination_lat, session.destination_lng]);
        destMarkerRef.current.setIcon(destIcon);
      } else {
        destMarkerRef.current = L.marker([session.destination_lat, session.destination_lng], { icon: destIcon }).addTo(map);
        if (session.destination_label) {
          destMarkerRef.current.bindPopup(`<strong>${session.destination_label}</strong>`);
        }
      }
    }

    // Tracker marker
    if (session.current_lat && session.current_lng) {
      const trackerIcon = L.divIcon({
        className: "",
        html: `
          <div style="position:relative;width:24px;height:24px;">
            <div style="position:absolute;inset:0;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 0 20px ${color}80;z-index:2;"></div>
            <div style="position:absolute;inset:-6px;border-radius:50%;border:2px solid ${color};opacity:0.4;animation:trackPulse 1.5s ease-out infinite;"></div>
          </div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      if (trackerMarkerRef.current) {
        trackerMarkerRef.current.setLatLng([session.current_lat, session.current_lng]);
        trackerMarkerRef.current.setIcon(trackerIcon);
      } else {
        trackerMarkerRef.current = L.marker([session.current_lat, session.current_lng], { icon: trackerIcon, zIndexOffset: 1000 }).addTo(map);
      }

      // Route line from tracker to destination
      if (session.destination_lat && session.destination_lng) {
        const points: L.LatLngExpression[] = [
          [session.current_lat, session.current_lng],
          [session.destination_lat, session.destination_lng],
        ];
        if (routeLineRef.current) {
          routeLineRef.current.setLatLngs(points);
          routeLineRef.current.setStyle({ color, dashArray: "8 6" });
        } else {
          routeLineRef.current = L.polyline(points, {
            color,
            weight: 3,
            opacity: 0.6,
            dashArray: "8 6",
          }).addTo(map);
        }

        // Fit bounds to show both points
        map.fitBounds(L.latLngBounds(points).pad(0.2), { animate: true });
      }
    }
  }, [session, color]);

  return (
    <>
      <div ref={containerRef} className={className || "w-full h-full min-h-[300px]"} style={{ zIndex: 1 }} />
      <style>{`
        @keyframes trackPulse {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      `}</style>
    </>
  );
}
