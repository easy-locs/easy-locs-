import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { FallbackProperty } from "@/data/fallback-properties";

interface Props {
  properties: FallbackProperty[];
  onSelectProperty?: (id: string) => void;
}

const MARKER_COLORS: Record<string, string> = {
  buy: "#22c55e",
  rent: "#3b82f6",
  project: "#a855f7",
};

function esc(str: string | number | undefined | null): string {
  return String(str ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function PropertyMapView({ properties, onSelectProperty }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
    }

    const center: [number, number] = properties.length > 0
      ? [properties[0].latitude, properties[0].longitude]
      : [25.2048, 55.2708];

    const map = L.map(mapRef.current, {
      center,
      zoom: 11,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    properties.forEach((p) => {
      if (!p.latitude || !p.longitude) return;
      const color = MARKER_COLORS[p.intent] || "#6b7280";
      const price = p.totalPrice
        ? `${(p.totalPrice / 1000000).toFixed(1)}M`
        : p.annualRent
          ? `${(p.annualRent / 1000).toFixed(0)}K/yr`
          : "N/A";

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
        ">${esc(p.currency)} ${esc(price)}</div>`,
        iconSize: [0, 0],
        iconAnchor: [40, 15],
      });

      const marker = L.marker([p.latitude, p.longitude], { icon }).addTo(map);

      const container = document.createElement("div");
      container.style.cssText = "width:200px;font-family:system-ui,sans-serif;";

      if (p.image) {
        const img = document.createElement("img");
        img.src = p.image;
        img.alt = "";
        img.style.cssText = "width:100%;height:100px;object-fit:cover;border-radius:8px;margin-bottom:8px;";
        img.onerror = () => { img.style.display = "none"; };
        container.appendChild(img);
      }

      const h3 = document.createElement("h3");
      h3.textContent = p.title;
      h3.style.cssText = "font-size:13px;font-weight:700;margin:0 0 4px 0;line-height:1.3;";
      container.appendChild(h3);

      const loc = document.createElement("p");
      loc.textContent = `${p.area}, ${p.city}`;
      loc.style.cssText = "font-size:11px;color:#666;margin:0 0 4px 0;";
      container.appendChild(loc);

      const details = document.createElement("div");
      details.style.cssText = "display:flex;gap:8px;font-size:11px;color:#888;margin-bottom:6px;";
      if (p.bedrooms > 0) { const s = document.createElement("span"); s.textContent = `${p.bedrooms} bed`; details.appendChild(s); }
      if (p.bathrooms > 0) { const s = document.createElement("span"); s.textContent = `${p.bathrooms} bath`; details.appendChild(s); }
      if (p.sizeSqft > 0) { const s = document.createElement("span"); s.textContent = `${p.sizeSqft.toLocaleString()} sqft`; details.appendChild(s); }
      container.appendChild(details);

      const priceEl = document.createElement("p");
      priceEl.textContent = `${p.currency} ${(p.totalPrice ?? p.annualRent ?? 0).toLocaleString()}${p.intent === "rent" ? "/year" : ""}`;
      priceEl.style.cssText = `font-size:14px;font-weight:800;color:${color};margin:0 0 6px 0;`;
      container.appendChild(priceEl);

      if (onSelectProperty) {
        const btn = document.createElement("button");
        btn.textContent = "View Details →";
        btn.style.cssText = `width:100%;padding:6px;border:none;border-radius:6px;background:${color};color:white;font-size:12px;font-weight:600;cursor:pointer;`;
        btn.addEventListener("click", () => onSelectProperty(p.id));
        container.appendChild(btn);
      }

      marker.bindPopup(container, { maxWidth: 220, closeButton: true });

      marker.on("click", () => {
        marker.openPopup();
      });
    });

    if (properties.length > 1) {
      const bounds = L.latLngBounds(
        properties
          .filter(p => p.latitude && p.longitude)
          .map(p => [p.latitude, p.longitude] as [number, number])
      );
      map.fitBounds(bounds, { padding: [30, 30] });
    }

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [properties, onSelectProperty]);

  return (
    <div className="rounded-2xl overflow-hidden border" style={{ borderColor: "hsl(var(--border))" }}>
      <div ref={mapRef} style={{ height: 400, width: "100%" }} />
      <div className="flex items-center gap-4 px-3 py-2" style={{ background: "hsl(var(--card))" }}>
        {Object.entries(MARKER_COLORS).map(([key, color]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: color }} />
            <span className="text-[10px] font-medium capitalize" style={{ color: "hsl(var(--muted-foreground))" }}>
              {key === "buy" ? "For Sale" : key === "rent" ? "For Rent" : "Projects"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
