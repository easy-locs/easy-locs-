/**
 * Easy-Locs branded "You Are Here" user marker.
 * Replaces generic blue dot with a premium radar-halo identity.
 */

const BRAND_GOLD = "#D4A853";
const USER_BLUE = "#4F46E5";

/** Inject user marker CSS once */
function ensureUserMarkerCSS() {
  if (document.getElementById("easylocs-user-marker-css")) return;
  const s = document.createElement("style");
  s.id = "easylocs-user-marker-css";
  s.textContent = `
    @keyframes el-user-pulse {
      0% { transform: scale(1); opacity: 0.5; }
      70% { transform: scale(2.6); opacity: 0; }
      100% { opacity: 0; }
    }
    @keyframes el-user-ring {
      0% { transform: scale(1); opacity: 0.3; }
      50% { transform: scale(1.4); opacity: 0.1; }
      100% { transform: scale(1); opacity: 0.3; }
    }
    @keyframes el-user-sweep {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(s);
}

/**
 * Creates a branded "You Are Here" marker element.
 * Features: center dot, radar halo ring, pulse wave, mini Easy-Locs logo.
 */
export function createUserMarkerElement(size = 48): HTMLDivElement {
  ensureUserMarkerCSS();

  const root = document.createElement("div");
  root.style.cssText = `
    position: relative;
    width: ${size}px; height: ${size}px;
    display: flex; align-items: center; justify-content: center;
    pointer-events: none;
  `;

  // Radar halo ring
  const halo = document.createElement("div");
  halo.style.cssText = `
    position: absolute; inset: 0;
    border-radius: 9999px;
    border: 2px solid ${USER_BLUE};
    opacity: 0.25;
    animation: el-user-ring 3s ease-in-out infinite;
  `;
  root.appendChild(halo);

  // Pulse wave
  const pulse = document.createElement("div");
  pulse.style.cssText = `
    position: absolute; inset: 0;
    border-radius: 9999px;
    background: ${USER_BLUE};
    animation: el-user-pulse 2.2s ease-out infinite;
  `;
  root.appendChild(pulse);

  // Center dot with golden ring
  const center = document.createElement("div");
  const dotSize = Math.round(size * 0.38);
  center.style.cssText = `
    width: ${dotSize}px; height: ${dotSize}px;
    border-radius: 9999px;
    background: ${USER_BLUE};
    border: 2.5px solid ${BRAND_GOLD};
    box-shadow: 0 0 12px ${USER_BLUE}66, 0 0 24px ${USER_BLUE}33;
    position: relative; z-index: 2;
    display: flex; align-items: center; justify-content: center;
  `;

  // Mini "EL" text inside
  const label = document.createElement("span");
  label.style.cssText = `
    font-size: ${Math.round(dotSize * 0.42)}px;
    font-weight: 800;
    color: white;
    letter-spacing: -0.5px;
    line-height: 1;
  `;
  label.textContent = "EL";
  center.appendChild(label);
  root.appendChild(center);

  return root;
}

/**
 * Creates branded pickup marker (green with gold ring).
 */
export function createPickupMarkerElement(): HTMLDivElement {
  return createBrandedPin("#22C55E", "A", "📦");
}

/**
 * Creates branded dropoff marker (purple with gold ring).
 */
export function createDropoffMarkerElement(): HTMLDivElement {
  return createBrandedPin("#8B5CF6", "B", "📍");
}

function createBrandedPin(color: string, letter: string, _emoji: string): HTMLDivElement {
  const root = document.createElement("div");
  root.style.cssText = `
    position: relative;
    width: 40px; height: 40px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
  `;

  const dot = document.createElement("div");
  dot.style.cssText = `
    width: 36px; height: 36px;
    border-radius: 9999px;
    background: ${color};
    border: 2.5px solid ${BRAND_GOLD};
    box-shadow: 0 4px 16px ${color}55, 0 0 0 1px ${color}22;
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; font-weight: 800; color: white;
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
    opacity: 0.15;
    animation: el-user-pulse 2.5s ease-out infinite;
  `;
  root.appendChild(pulse);

  return root;
}
