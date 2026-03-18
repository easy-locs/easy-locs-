/**
 * Map rendering styles for presence_mode + mobility_type combinations.
 * Used by SuperMapRadar to decide icon, color, animation behavior.
 */

export type PresenceMode = "pin" | "orbit";
export type MobilityType = "fixed_store" | "mobile_seller" | "mobile_service" | "driver";

export interface MapMarkerStyle {
  emoji: string;
  color: string;        // hex
  pulseRing: boolean;   // orbit items get a pulse ring
  label: string;
}

const STYLES: Record<MobilityType, MapMarkerStyle> = {
  fixed_store: {
    emoji: "🏪",
    color: "#38bdf8",    // sky-400
    pulseRing: false,
    label: "Store",
  },
  mobile_seller: {
    emoji: "🛒",
    color: "#fbbf24",    // amber-400
    pulseRing: true,
    label: "Mobile Seller",
  },
  mobile_service: {
    emoji: "🔧",
    color: "#a78bfa",    // violet-400
    pulseRing: true,
    label: "Mobile Service",
  },
  driver: {
    emoji: "🚗",
    color: "#34d399",    // emerald-400
    pulseRing: true,
    label: "Driver",
  },
};

export function getMarkerStyle(
  presenceMode: PresenceMode | string | null,
  mobilityType: MobilityType | string | null
): MapMarkerStyle {
  const mode = (presenceMode || "pin") as PresenceMode;
  const mtype = (mobilityType || "fixed_store") as MobilityType;
  const base = STYLES[mtype] || STYLES.fixed_store;

  return {
    ...base,
    // Override: pin mode never pulses
    pulseRing: mode === "orbit" ? base.pulseRing : false,
  };
}

/**
 * Creates an HTML element for a map marker with presence styling.
 */
export function createMarkerElement(
  presenceMode: PresenceMode | string | null,
  mobilityType: MobilityType | string | null
): HTMLDivElement {
  const style = getMarkerStyle(presenceMode, mobilityType);
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

    // Inject keyframes once
    if (!document.getElementById("radar-pulse-style")) {
      const styleTag = document.createElement("style");
      styleTag.id = "radar-pulse-style";
      styleTag.textContent = `
        @keyframes radar-pulse {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      `;
      document.head.appendChild(styleTag);
    }
  }

  return el;
}
