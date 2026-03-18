/**
 * Map rendering styles for presence_mode + entity_type + coverage combinations.
 */

export type PresenceMode = "off" | "pin" | "live";
export type EntityType = "fixed_store" | "mobile_seller" | "mobile_service" | "driver";
export type CoverageMode = "point" | "radius" | "live_radius";

export interface MapMarkerStyle {
  emoji: string;
  color: string;
  pulseRing: boolean;
  label: string;
}

const STYLES: Record<EntityType, MapMarkerStyle> = {
  fixed_store: { emoji: "🏪", color: "#38bdf8", pulseRing: false, label: "Store" },
  mobile_seller: { emoji: "🛒", color: "#fbbf24", pulseRing: true, label: "Mobile Seller" },
  mobile_service: { emoji: "🔧", color: "#a78bfa", pulseRing: true, label: "Mobile Service" },
  driver: { emoji: "🚗", color: "#34d399", pulseRing: true, label: "Driver" },
};

export function getMarkerStyle(
  presenceMode: string | null,
  entityType: string | null
): MapMarkerStyle {
  const mode = (presenceMode || "pin") as PresenceMode;
  const etype = (entityType || "fixed_store") as EntityType;
  const base = STYLES[etype] || STYLES.fixed_store;
  return {
    ...base,
    pulseRing: mode === "live" ? base.pulseRing : false,
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
    font-size: 20px;
    border-radius: 50%;
    background: ${style.color}22;
    border: 2px solid ${style.color};
    cursor: pointer;
    position: relative;
  `;
  el.textContent = style.emoji;

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
 * Uses the Mercator formula: metersPerPixel = 156543.03 * cos(lat) / 2^zoom
 */
export function metersToPixels(meters: number, lat: number, zoom: number): number {
  const metersPerPx = (156543.03 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
  return meters / metersPerPx;
}
