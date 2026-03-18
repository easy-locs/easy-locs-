/**
 * DriverMap — Leaflet map showing live driver position, pickup, and dropoff markers.
 */
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useDriverTracking } from "@/hooks/useDriverTracking";

function createDotIcon(color: string, label?: string) {
  return L.divIcon({
    className: "",
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;">
        <div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 0 6px ${color}88;"></div>
        ${label ? `<span style="font-size:9px;font-weight:700;color:${color};margin-top:2px;white-space:nowrap;">${label}</span>` : ""}
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

export default function DriverMap({
  driverId,
  pickupLat,
  pickupLng,
  dropoffLat,
  dropoffLng,
}: {
  driverId?: string;
  pickupLat?: number | null;
  pickupLng?: number | null;
  dropoffLat?: number | null;
  dropoffLng?: number | null;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<L.Map | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const pickupMarkerRef = useRef<L.Marker | null>(null);
  const dropoffMarkerRef = useRef<L.Marker | null>(null);

  const { position } = useDriverTracking(driverId ?? null);

  // Init map
  useEffect(() => {
    if (!mapRef.current || leafletRef.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([25.2048, 55.2708], 12);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    leafletRef.current = map;

    return () => {
      map.remove();
      leafletRef.current = null;
    };
  }, []);

  // Pickup & Dropoff markers
  useEffect(() => {
    const map = leafletRef.current;
    if (!map) return;

    if (pickupLat != null && pickupLng != null) {
      if (!pickupMarkerRef.current) {
        pickupMarkerRef.current = L.marker([pickupLat, pickupLng], {
          icon: createDotIcon("#10b981", "Pickup"),
        }).addTo(map);
      } else {
        pickupMarkerRef.current.setLatLng([pickupLat, pickupLng]);
      }
    }

    if (dropoffLat != null && dropoffLng != null) {
      if (!dropoffMarkerRef.current) {
        dropoffMarkerRef.current = L.marker([dropoffLat, dropoffLng], {
          icon: createDotIcon("#f59e0b", "Dropoff"),
        }).addTo(map);
      } else {
        dropoffMarkerRef.current.setLatLng([dropoffLat, dropoffLng]);
      }
    }
  }, [pickupLat, pickupLng, dropoffLat, dropoffLng]);

  // Driver marker + auto-fit bounds
  useEffect(() => {
    const map = leafletRef.current;
    if (!map || !position) return;

    const latlng: L.LatLngExpression = [position.lat, position.lng];

    if (!driverMarkerRef.current) {
      driverMarkerRef.current = L.marker(latlng, {
        icon: createDotIcon("#2563eb", "Driver"),
      }).addTo(map);
    } else {
      driverMarkerRef.current.setLatLng(latlng);
    }

    const bounds: L.LatLngExpression[] = [latlng];
    if (pickupLat != null && pickupLng != null) bounds.push([pickupLat, pickupLng]);
    if (dropoffLat != null && dropoffLng != null) bounds.push([dropoffLat, dropoffLng]);

    if (bounds.length > 1) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [40, 40] });
    } else {
      map.setView([position.lat, position.lng], 15);
    }
  }, [position, pickupLat, pickupLng, dropoffLat, dropoffLng]);

  return <div ref={mapRef} className="h-full w-full rounded-2xl" />;
}
