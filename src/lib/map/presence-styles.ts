/**
 * Map rendering styles for presence_mode + entity_type + coverage combinations.
 * Now uses Easy-Locs branded SVG icons instead of emojis.
 */
import { ENTITY_ICON_MAP, PRESENCE_ICON_MAP, iconPin } from "./easy-locs-icons";

export type PresenceMode = "off" | "pin" | "live";
export type EntityType = "fixed_store" | "mobile_seller" | "mobile_service" | "driver";
export type CoverageMode = "point" | "radius" | "live_radius";

export interface MapMarkerStyle {
  icon: string; // SVG string
  color: string;
  pulseRing: boolean;
  label: string;
}

const STYLE_META: Record<EntityType, { color: string; pulseRing: boolean; label: string }> = {
  fixed_store: { color: "#D4A853", pulseRing: false, label: "Store" },
  mobile_seller: { color: "#fbbf24", pulseRing: true, label: "Mobile Seller" },
  mobile_service: { color: "#a78bfa", pulseRing: true, label: "Mobile Service" },
  driver: { color: "#34d399", pulseRing: true, label: "Driver" },
};

export function getMarkerStyle(
  presenceMode: string | null,
  entityType: string | null
): MapMarkerStyle {
  const mode = (presenceMode || "pin") as PresenceMode;
  const etype = (entityType || "fixed_store") as EntityType;
  const meta = STYLE_META[etype] || STYLE_META.fixed_store;
  const iconFn = ENTITY_ICON_MAP[etype] || iconPin;

  return {
    icon: iconFn(36),
    color: meta.color,
    pulseRing: mode === "live" ? meta.pulseRing : false,
    label: meta.label,
  };
}

export function createMarkerElement(
  presenceMode: string | null,
  entityType: string | null
): HTMLDivElement {
  const style = getMarkerStyle(presenceMode, entityType);
  const el = document.createElement("div");
  el.style.cssText = `
    width: 36px; height: 36px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    position: relative;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
  `;
  el.innerHTML = style.icon;

  if (style.pulseRing) {
    const ring = document.createElement("div");
    ring.style.cssText = `
      position: absolute; inset: -6px;
      border-radius: 50%;
      border: 2px solid ${style.color}66;
      animation: radar-pulse 2s ease-out infinite;
      pointer-events: none;
    `;
    el.appendChild(ring);
    if (!document.getElementById("radar-pulse-style")) {
      const s = document.createElement("style");
      s.id = "radar-pulse-style";
      s.textContent = `@keyframes radar-pulse { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(2.2); opacity: 0; } }`;
      document.head.appendChild(s);
    }
  }
  return el;
}

/**
 * Convert radius in meters to Mapbox circle-radius in pixels at a given zoom & lat.
 */
export function metersToPixels(meters: number, lat: number, zoom: number): number {
  const metersPerPx = (156543.03 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
  return meters / metersPerPx;
}
