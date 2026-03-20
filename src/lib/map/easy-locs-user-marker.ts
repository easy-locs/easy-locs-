/**
 * Premium GPS location marker — Apple/Google Maps style.
 * Clean blue dot with subtle pulse ring. No text inside.
 */

const USER_BLUE = "#007AFF";
const BRAND_GOLD = "#D4A853";

/** Inject user marker CSS once */
function ensureUserMarkerCSS() {
  if (document.getElementById("easylocs-user-marker-css")) return;
  const s = document.createElement("style");
  s.id = "easylocs-user-marker-css";
  s.textContent = `
    @keyframes el-user-pulse {
      0% { transform: scale(1); opacity: 0.35; }
      70% { transform: scale(2.8); opacity: 0; }
      100% { opacity: 0; }
    }
    @keyframes el-user-ring {
      0% { transform: scale(1); opacity: 0.2; }
      50% { transform: scale(1.3); opacity: 0.08; }
      100% { transform: scale(1); opacity: 0.2; }
    }
  `;
  document.head.appendChild(s);
}

/**
 * Creates a premium GPS dot marker (Apple Maps style).
 * Clean blue dot with white border and subtle pulse.
 */
export function createUserMarkerElement(size = 44): HTMLDivElement {
  ensureUserMarkerCSS();

  const root = document.createElement("div");
  root.style.cssText = `
    position: relative;
    width: ${size}px; height: ${size}px;
    display: flex; align-items: center; justify-content: center;
    pointer-events: none;
  `;

  // Pulse ring
  const pulse = document.createElement("div");
  pulse.style.cssText = `
    position: absolute; inset: 0;
    border-radius: 9999px;
    background: ${USER_BLUE};
    animation: el-user-pulse 2s ease-out infinite;
  `;
  root.appendChild(pulse);

  // Outer ring
  const ring = document.createElement("div");
  ring.style.cssText = `
    position: absolute; inset: ${size * 0.18}px;
    border-radius: 9999px;
    border: 1.5px solid ${USER_BLUE};
    opacity: 0.18;
    animation: el-user-ring 3s ease-in-out infinite;
  `;
  root.appendChild(ring);

  // Center dot — clean, no text
  const dotSize = Math.round(size * 0.36);
  const center = document.createElement("div");
  center.style.cssText = `
    width: ${dotSize}px; height: ${dotSize}px;
    border-radius: 9999px;
    background: ${USER_BLUE};
    border: 2.5px solid #ffffff;
    box-shadow: 0 0 8px ${USER_BLUE}55, 0 2px 8px rgba(0,0,0,0.15);
    position: relative; z-index: 2;
  `;
  root.appendChild(center);

  return root;
}

/**
 * Creates branded pickup marker (green).
 */
export function createPickupMarkerElement(): HTMLDivElement {
  return createBrandedPin("#22C55E", "A");
}

/**
 * Creates branded dropoff marker (purple).
 */
export function createDropoffMarkerElement(): HTMLDivElement {
  return createBrandedPin("#8B5CF6", "B");
}

function createBrandedPin(color: string, letter: string): HTMLDivElement {
  ensureUserMarkerCSS();

  const root = document.createElement("div");
  root.style.cssText = `
    position: relative;
    width: 40px; height: 40px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
  `;

  const dot = document.createElement("div");
  dot.style.cssText = `
    width: 34px; height: 34px;
    border-radius: 9999px;
    background: ${color};
    border: 2.5px solid #ffffff;
    box-shadow: 0 2px 12px ${color}44, 0 2px 6px rgba(0,0,0,0.12);
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; font-weight: 700; color: white;
    position: relative; z-index: 2;
  `;
  dot.textContent = letter;
  root.appendChild(dot);

  // Subtle pulse
  const pulse = document.createElement("div");
  pulse.style.cssText = `
    position: absolute; inset: 0;
    border-radius: 9999px;
    background: ${color};
    opacity: 0.12;
    animation: el-user-pulse 2.5s ease-out infinite;
  `;
  root.appendChild(pulse);

  return root;
}
