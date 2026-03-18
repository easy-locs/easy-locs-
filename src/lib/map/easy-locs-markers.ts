/**
 * Easy-Locs branded map markers — premium circular markers with entity icons,
 * live pulse, focus ping, and hover/click interactions.
 */
import { EASYLOCS_RADAR_THEME } from "./easy-locs-radar-theme";

export function getMarkerVisual(presence: string, entityType: string) {
  let color = EASYLOCS_RADAR_THEME.store;
  let label = "Pin";

  if (entityType === "fixed_store") {
    color = EASYLOCS_RADAR_THEME.store;
    label = "Store";
  }
  if (entityType === "mobile_seller") {
    color = EASYLOCS_RADAR_THEME.seller;
    label = "Seller";
  }
  if (entityType === "mobile_service") {
    color = EASYLOCS_RADAR_THEME.service;
    label = "Service";
  }
  if (entityType === "driver") {
    color = EASYLOCS_RADAR_THEME.driver;
    label = "Driver";
  }

  // Live overrides to cyan
  if (presence === "live") {
    color = EASYLOCS_RADAR_THEME.live;
  }

  return { color, label };
}

function iconFor(entityType: string): string {
  switch (entityType) {
    case "fixed_store": return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
    case "mobile_seller": return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`;
    case "mobile_service": return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`;
    case "driver": return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`;
    default: return `<svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="none"><circle cx="12" cy="12" r="5"/></svg>`;
  }
}

/** Inject marker CSS animations once */
function ensureMarkerStyles() {
  if (document.getElementById("easylocs-marker-css")) return;
  const s = document.createElement("style");
  s.id = "easylocs-marker-css";
  s.textContent = `
    @keyframes easylocs-live-pulse {
      0% { transform: scale(1); opacity: 0.45; }
      70% { transform: scale(1.9); opacity: 0; }
      100% { opacity: 0; }
    }
    @keyframes easylocs-focus-ping {
      0% { transform: scale(1); opacity: 0.55; }
      100% { transform: scale(2.4); opacity: 0; }
    }
    .easylocs-map-live-pulse {
      position: absolute; inset: 0;
      border-radius: 9999px;
      pointer-events: none;
      animation: easylocs-live-pulse 1.8s infinite;
    }
    .easylocs-map-focus-ping {
      position: absolute; inset: 0;
      border-radius: 9999px;
      pointer-events: none;
      animation: easylocs-focus-ping 1.2s ease-out 1;
    }
    /* Premium popup */
    .mapboxgl-popup-content {
      background: rgba(11, 18, 32, 0.95) !important;
      backdrop-filter: blur(16px) !important;
      border: 1px solid rgba(255,255,255,0.08) !important;
      border-radius: 16px !important;
      padding: 0 !important;
      box-shadow: 0 12px 48px rgba(0,0,0,0.55) !important;
    }
    .mapboxgl-popup-tip {
      border-top-color: rgba(11, 18, 32, 0.95) !important;
    }
  `;
  document.head.appendChild(s);
}

export function createEasyLocsMarkerElement(
  presence: string,
  entityType: string,
  isFocused = false
): HTMLDivElement {
  ensureMarkerStyles();

  const { color } = getMarkerVisual(presence, entityType);

  const root = document.createElement("div");
  root.style.cssText = `
    position: relative;
    width: 38px; height: 38px;
    border-radius: 9999px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    transform: translateZ(0);
    transition: transform 140ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 140ms ease;
  `;

  // Main dot
  const dot = document.createElement("div");
  dot.style.cssText = `
    width: 38px; height: 38px;
    border-radius: 9999px;
    background: ${color};
    border: 2.5px solid rgba(255,255,255,0.92);
    box-shadow: 0 8px 24px ${color}55, 0 0 0 1px ${color}22;
    display: flex; align-items: center; justify-content: center;
    position: relative; z-index: 2;
  `;
  dot.innerHTML = iconFor(entityType);
  root.appendChild(dot);

  // Live pulse
  if (presence === "live") {
    const p1 = document.createElement("div");
    p1.className = "easylocs-map-live-pulse";
    p1.style.background = color;
    p1.style.opacity = "0.28";
    root.appendChild(p1);

    const p2 = document.createElement("div");
    p2.className = "easylocs-map-live-pulse";
    p2.style.background = color;
    p2.style.opacity = "0.15";
    p2.style.animationDelay = "0.6s";
    root.appendChild(p2);
  }

  // Focus ping
  if (isFocused) {
    const ping = document.createElement("div");
    ping.className = "easylocs-map-focus-ping";
    ping.style.background = color;
    ping.style.opacity = "0.32";
    root.appendChild(ping);
  }

  // Hover
  root.onmouseenter = () => {
    root.style.transform = "scale(1.12) translateZ(0)";
    root.style.zIndex = "10";
  };
  root.onmouseleave = () => {
    root.style.transform = "scale(1) translateZ(0)";
    root.style.zIndex = "";
  };

  // Click bounce
  root.addEventListener("click", () => {
    root.style.transform = "scale(1.22) translateZ(0)";
    setTimeout(() => { root.style.transform = ""; }, 160);
  });

  return root;
}

/** Build branded popup HTML */
export function buildEasyLocsPopupHTML(listing: {
  title: string;
  price: number;
  currency: string;
  category: string;
  coverage_mode: string;
  coverage_radius_m: number | null;
  presence_mode: string;
  entity_type: string;
}): string {
  const { color, label } = getMarkerVisual(listing.presence_mode, listing.entity_type);
  const radiusLabel = listing.coverage_mode !== "point" && listing.coverage_radius_m
    ? ` · ${listing.coverage_radius_m >= 1000 ? `${listing.coverage_radius_m / 1000}km` : `${listing.coverage_radius_m}m`}`
    : "";
  const liveTag = listing.presence_mode === "live"
    ? `<span style="display:inline-flex;align-items:center;gap:3px;background:${EASYLOCS_RADAR_THEME.live}20;color:${EASYLOCS_RADAR_THEME.live};padding:2px 7px;border-radius:8px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-left:6px;">
        <span style="width:5px;height:5px;border-radius:50%;background:${EASYLOCS_RADAR_THEME.live};display:inline-block;"></span>Live
      </span>`
    : "";

  return `
    <div style="padding:14px 16px;max-width:250px;font-family:system-ui,-apple-system,sans-serif;">
      <div style="display:flex;align-items:center;margin-bottom:8px;">
        <span style="display:inline-flex;align-items:center;gap:4px;">
          <span style="width:8px;height:8px;border-radius:50%;background:${color};display:inline-block;"></span>
          <span style="font-size:10px;color:${color};font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">${label}${radiusLabel}</span>
        </span>
        ${liveTag}
      </div>
      <div style="font-size:15px;font-weight:700;color:#f1f5f9;line-height:1.3;">${listing.title}</div>
      <div style="display:flex;align-items:center;gap:6px;margin-top:8px;">
        <span style="font-size:14px;font-weight:700;color:${color};">${listing.price} ${listing.currency}</span>
        <span style="font-size:11px;color:#475569;">·</span>
        <span style="font-size:11px;color:#94a3b8;text-transform:capitalize;">${listing.category}</span>
      </div>
    </div>
  `;
}
