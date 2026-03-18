/**
 * Easy-Locs branded map marker styles & elements.
 * Premium markers with hover/click interactions, live pulse, and branded colors.
 */
import { ENTITY_ICON_MAP, iconPin } from "./easy-locs-icons";

export type PresenceMode = "off" | "pin" | "live";
export type EntityType = "fixed_store" | "mobile_seller" | "mobile_service" | "driver";
export type CoverageMode = "point" | "radius" | "live_radius";

/** Easy-Locs branded color system */
export const EASYLOCS_COLORS = {
  primary: "#4F46E5",
  accent: "#22C55E",
  warning: "#F59E0B",
  live: "#06B6D4",
  dark: "#0B1220",
} as const;

export interface MapMarkerStyle {
  icon: string;
  color: string;
  pulseRing: boolean;
  label: string;
}

const STYLE_META: Record<EntityType, { color: string; label: string }> = {
  fixed_store: { color: "#D4A853", label: "Store" },
  mobile_seller: { color: "#fbbf24", label: "Mobile Seller" },
  mobile_service: { color: EASYLOCS_COLORS.warning, label: "Mobile Service" },
  driver: { color: EASYLOCS_COLORS.accent, label: "Driver" },
};

export function getMarkerStyle(
  presenceMode: string | null,
  entityType: string | null
): MapMarkerStyle {
  const mode = (presenceMode || "pin") as PresenceMode;
  const etype = (entityType || "fixed_store") as EntityType;
  const meta = STYLE_META[etype] || STYLE_META.fixed_store;
  const iconFn = ENTITY_ICON_MAP[etype] || iconPin;

  // Live mode overrides color to cyan
  const color = mode === "live" ? EASYLOCS_COLORS.live : meta.color;

  return {
    icon: iconFn(40),
    color,
    pulseRing: mode === "live",
    label: meta.label,
  };
}

/** Inject global marker animations once */
function ensureAnimations() {
  if (document.getElementById("easylocs-marker-styles")) return;
  const s = document.createElement("style");
  s.id = "easylocs-marker-styles";
  s.textContent = `
    @keyframes el-pulse {
      0% { transform: scale(1); opacity: 0.6; }
      100% { transform: scale(2.4); opacity: 0; }
    }
    @keyframes el-glow {
      0%, 100% { box-shadow: 0 0 8px var(--el-color, #06B6D4)44; }
      50% { box-shadow: 0 0 18px var(--el-color, #06B6D4)66; }
    }
    .el-marker {
      transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.2s ease;
      will-change: transform;
    }
    .el-marker:hover {
      transform: scale(1.15);
      filter: drop-shadow(0 4px 12px rgba(0,0,0,0.4));
      z-index: 10 !important;
    }
    .el-marker:active {
      transform: scale(1.25);
    }
    .el-pulse-ring {
      position: absolute;
      inset: -8px;
      border-radius: 50%;
      pointer-events: none;
      animation: el-pulse 2s ease-out infinite;
    }
    .el-glow-ring {
      position: absolute;
      inset: -3px;
      border-radius: 50%;
      pointer-events: none;
      animation: el-glow 2.5s ease-in-out infinite;
    }
    /* Premium popup override */
    .mapboxgl-popup-content {
      background: rgba(11, 18, 32, 0.95) !important;
      backdrop-filter: blur(12px) !important;
      border: 1px solid rgba(255,255,255,0.08) !important;
      border-radius: 14px !important;
      padding: 0 !important;
      box-shadow: 0 12px 40px rgba(0,0,0,0.5) !important;
    }
    .mapboxgl-popup-tip {
      border-top-color: rgba(11, 18, 32, 0.95) !important;
    }
  `;
  document.head.appendChild(s);
}

export function createMarkerElement(
  presenceMode: string | null,
  entityType: string | null
): HTMLDivElement {
  ensureAnimations();

  const style = getMarkerStyle(presenceMode, entityType);
  const isLive = (presenceMode || "pin") === "live";
  const size = 40;

  const el = document.createElement("div");
  el.className = "el-marker";
  el.style.cssText = `
    width: ${size}px; height: ${size}px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    position: relative;
    filter: drop-shadow(0 3px 8px ${style.color}44);
  `;
  el.innerHTML = style.icon;

  // Glow ring for all markers
  const glow = document.createElement("div");
  glow.className = "el-glow-ring";
  glow.style.setProperty("--el-color", style.color);
  glow.style.border = `1.5px solid ${style.color}33`;
  el.appendChild(glow);

  // Live pulse ring
  if (isLive) {
    const pulse = document.createElement("div");
    pulse.className = "el-pulse-ring";
    pulse.style.border = `2px solid ${style.color}`;
    el.appendChild(pulse);

    // Second staggered pulse
    const pulse2 = document.createElement("div");
    pulse2.className = "el-pulse-ring";
    pulse2.style.border = `1.5px solid ${style.color}`;
    pulse2.style.animationDelay = "0.8s";
    el.appendChild(pulse2);
  }

  // Click bounce
  el.addEventListener("click", () => {
    el.style.transform = "scale(1.25)";
    setTimeout(() => { el.style.transform = ""; }, 180);
  });

  return el;
}

/** Get premium coverage circle paint properties */
export function getCoverageStyle(coverageMode: string, color: string) {
  const isLiveRadius = coverageMode === "live_radius";
  return {
    fill: {
      "fill-color": color,
      "fill-opacity": isLiveRadius ? 0.1 : 0.06,
    },
    line: {
      "line-color": color,
      "line-width": isLiveRadius ? 2 : 1.2,
      "line-opacity": isLiveRadius ? 0.45 : 0.3,
      "line-dasharray": isLiveRadius ? [3, 3] : [1, 0],
    },
  };
}

/** Build premium popup HTML */
export function buildPopupHTML(listing: {
  title: string;
  price: number;
  currency: string;
  category: string;
  coverage_mode: string;
  coverage_radius_m: number | null;
  presence_mode: string;
}, style: MapMarkerStyle): string {
  const radiusLabel = listing.coverage_mode !== "point" && listing.coverage_radius_m
    ? ` · ${listing.coverage_radius_m >= 1000 ? `${listing.coverage_radius_m / 1000}km` : `${listing.coverage_radius_m}m`}`
    : "";
  const liveTag = listing.presence_mode === "live"
    ? `<span style="display:inline-flex;align-items:center;gap:3px;background:${EASYLOCS_COLORS.live}20;color:${EASYLOCS_COLORS.live};padding:2px 6px;border-radius:6px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-left:6px;">
        <span style="width:5px;height:5px;border-radius:50%;background:${EASYLOCS_COLORS.live};"></span>Live
      </span>`
    : "";

  return `
    <div style="padding:12px 14px;max-width:240px;font-family:system-ui,-apple-system,sans-serif;">
      <div style="display:flex;align-items:center;margin-bottom:6px;">
        <span style="font-size:10px;color:${style.color};font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">
          ${style.label}${radiusLabel}
        </span>
        ${liveTag}
      </div>
      <div style="font-size:14px;font-weight:700;color:#f1f5f9;line-height:1.3;">${listing.title}</div>
      <div style="display:flex;align-items:center;gap:6px;margin-top:6px;">
        <span style="font-size:13px;font-weight:700;color:${style.color};">${listing.price} ${listing.currency}</span>
        <span style="font-size:11px;color:#64748b;">·</span>
        <span style="font-size:11px;color:#94a3b8;">${listing.category}</span>
      </div>
    </div>
  `;
}

/**
 * Convert radius in meters to Mapbox circle-radius in pixels at a given zoom & lat.
 */
export function metersToPixels(meters: number, lat: number, zoom: number): number {
  const metersPerPx = (156543.03 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
  return meters / metersPerPx;
}
