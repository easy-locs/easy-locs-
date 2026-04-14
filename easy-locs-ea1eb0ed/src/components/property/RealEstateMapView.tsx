import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Property } from "@/domains/real-estate/canonical-types";
import { bannerCover } from "@/lib/image/category-covers";

interface Props {
  properties: Property[];
  onSelectProperty?: (id: string) => void;
}

const TYPE_COLORS: Record<string, string> = {
  sale: "#22c55e",
  rent: "#3b82f6",
  lease: "#3b82f6",
  short_stay: "#a855f7",
  long_stay: "#f97316",
};

function esc(str: string | number | undefined | null): string {
  return String(str ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function RealEstateMapView({ properties, onSelectProperty }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
    }

    const validProps = properties.filter(p => p.address.geoPoint?.lat && p.address.geoPoint?.lng);
    const center: [number, number] = validProps.length > 0
      ? [validProps[0].address.geoPoint!.lat, validProps[0].address.geoPoint!.lng]
      : [25.2048, 55.2708];

    const map = L.map(mapRef.current, { center, zoom: 11, zoomControl: true });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    validProps.forEach((p) => {
      const lat = p.address.geoPoint!.lat;
      const lng = p.address.geoPoint!.lng;
      const color = TYPE_COLORS[p.listingType] || "#6b7280";
      const priceStr = p.price >= 1000000
        ? `${(p.price / 1000000).toFixed(1)}M`
        : `${(p.price / 1000).toFixed(0)}K`;

      const icon = L.divIcon({
        className: "custom-property-marker",
        html: `<div style="
          background: ${color};
          color: white;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          border: 2px solid white;
          cursor: pointer;
        ">${esc(p.currency)} ${esc(priceStr)}</div>`,
        iconSize: [0, 0],
        iconAnchor: [40, 15],
      });

      const marker = L.marker([lat, lng], { icon }).addTo(map);

      const container = document.createElement("div");
      container.style.cssText = "width:200px;font-family:system-ui,sans-serif;";

      const realMediaUrls = (p.mediaIds || []).filter(id => id.startsWith("http") || id.startsWith("/"));
      const coverUrl = realMediaUrls.length > 0 ? realMediaUrls[0] : bannerCover(`buy_${p.propertyType}`);
      const img = document.createElement("img");
      img.src = coverUrl;
      img.alt = "";
      img.style.cssText = "width:100%;height:100px;object-fit:cover;border-radius:8px;margin-bottom:8px;";
      img.onerror = () => { img.style.display = "none"; };
      container.appendChild(img);

      const h3 = document.createElement("h3");
      h3.textContent = p.title;
      h3.style.cssText = "font-size:13px;font-weight:700;margin:0 0 4px 0;";
      container.appendChild(h3);

      const loc = document.createElement("p");
      loc.textContent = [p.address.district, p.address.city].filter(Boolean).join(", ");
      loc.style.cssText = "font-size:11px;color:#666;margin:0 0 4px 0;";
      container.appendChild(loc);

      const details = document.createElement("div");
      details.style.cssText = "display:flex;gap:8px;font-size:11px;color:#888;margin-bottom:6px;";
      if (p.bedrooms) { const s = document.createElement("span"); s.textContent = `${p.bedrooms} bed`; details.appendChild(s); }
      if (p.bathrooms) { const s = document.createElement("span"); s.textContent = `${p.bathrooms} bath`; details.appendChild(s); }
      if (p.area) { const s = document.createElement("span"); s.textContent = `${p.area} ${p.areaUnit}`; details.appendChild(s); }
      container.appendChild(details);

      const priceEl = document.createElement("p");
      priceEl.textContent = `${p.currency} ${p.price.toLocaleString()}`;
      priceEl.style.cssText = `font-size:14px;font-weight:800;color:${color};margin:0 0 6px 0;`;
      container.appendChild(priceEl);

      if (onSelectProperty) {
        const btn = document.createElement("button");
        btn.textContent = "View Details →";
        btn.style.cssText = `width:100%;padding:6px;border:none;border-radius:6px;background:${color};color:white;font-size:12px;font-weight:600;cursor:pointer;`;
        btn.addEventListener("click", () => onSelectProperty(p.id));
        container.appendChild(btn);
      }

      marker.bindPopup(container, { maxWidth: 220 });
      marker.on("click", () => {
        marker.openPopup();
      });
    });

    if (validProps.length > 1) {
      const bounds = L.latLngBounds(
        validProps.map(p => [p.address.geoPoint!.lat, p.address.geoPoint!.lng] as [number, number])
      );
      map.fitBounds(bounds, { padding: [30, 30] });
    }

    mapInstanceRef.current = map;
    return () => { map.remove(); mapInstanceRef.current = null; };
  }, [properties, onSelectProperty]);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #e5e7eb" }}>
      <div ref={mapRef} style={{ height: 350, width: "100%" }} />
      <div className="flex items-center gap-4 px-3 py-2" style={{ background: "#fff" }}>
        {([
          ["sale", "#22c55e", "For Sale"],
          ["rent", "#3b82f6", "For Rent"],
          ["short_stay", "#a855f7", "Short Stay"],
        ] as const).map(([key, color, label]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: color }} />
            <span className="text-[10px] font-medium" style={{ color: "#888" }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
