/**
 * Map Screen Presets — Per-screen configuration for layers, animations, style, density, camera.
 * Weather data is always-on. "radarOverlay" controls visual overlay only.
 */
import type { MapStylePreset, MapDensityMode } from "../engine/types";

export interface MapScreenPreset {
  id: string;
  label: string;
  /** Which layers to show */
  layers: Record<string, boolean>;
  /** Which animations to activate, mapped to target layer IDs */
  animations: Record<string, string[]>;
  style: MapStylePreset;
  density: MapDensityMode;
  /** Camera easing duration in ms */
  cameraDuration: number;
  /** Interaction level: minimal = no popups, standard = popups, full = popups + deep-link */
  interactionLevel: "minimal" | "standard" | "full";
}

export const MAP_PRESETS: Record<string, MapScreenPreset> = {
  default: {
    id: "default",
    label: "Explore",
    layers: {
      "user-location": true,
      merchants: true,
      "drivers-live": false,
      heatmap: false,
      zones: false,
      radius: false,
      radarOverlay: false,
    },
    animations: {
      pulse: ["ml-user-glow"],
    },
    style: "dark",
    density: "medium",
    cameraDuration: 600,
    interactionLevel: "standard",
  },

  radar: {
    id: "radar",
    label: "Live Radar",
    layers: {
      "user-location": true,
      merchants: true,
      "drivers-live": true,
      heatmap: true,
      zones: true,
      radius: false,
      radarOverlay: true,
    },
    animations: {
      pulse: ["ml-user-glow"],
      glow: ["ml-merchants-glow"],
      "live-move": ["ml-drivers-point"],
    },
    style: "dark",
    density: "high",
    cameraDuration: 500,
    interactionLevel: "full",
  },

  delivery: {
    id: "delivery",
    label: "Delivery Ops",
    layers: {
      "user-location": true,
      merchants: true,
      "drivers-live": true,
      heatmap: false,
      zones: true,
      radius: true,
      radarOverlay: false,
    },
    animations: {
      "live-move": ["ml-drivers-point"],
      pulse: ["ml-user-glow"],
    },
    style: "dark",
    density: "high",
    cameraDuration: 400,
    interactionLevel: "full",
  },

  storefront: {
    id: "storefront",
    label: "Storefront",
    layers: {
      "user-location": true,
      merchants: true,
      "drivers-live": false,
      heatmap: false,
      zones: false,
      radius: true,
      radarOverlay: false,
    },
    animations: {
      pulse: ["ml-user-glow"],
      glow: ["ml-merchants-glow"],
    },
    style: "dark",
    density: "medium",
    cameraDuration: 700,
    interactionLevel: "standard",
  },

  travel: {
    id: "travel",
    label: "Travel & Weather",
    layers: {
      "user-location": true,
      merchants: true,
      "drivers-live": false,
      heatmap: false,
      zones: false,
      radius: false,
      radarOverlay: true,
    },
    animations: {
      pulse: ["ml-user-glow"],
      glow: ["ml-merchants-glow"],
    },
    style: "dark",
    density: "low",
    cameraDuration: 800,
    interactionLevel: "standard",
  },

  property: {
    id: "property",
    label: "Property",
    layers: {
      "user-location": true,
      merchants: false,
      "drivers-live": false,
      heatmap: false,
      zones: true,
      radius: true,
      radarOverlay: false,
    },
    animations: {
      pulse: ["ml-user-glow"],
    },
    style: "dark",
    density: "medium",
    cameraDuration: 700,
    interactionLevel: "standard",
  },

  services: {
    id: "services",
    label: "Services",
    layers: {
      "user-location": true,
      merchants: true,
      "drivers-live": false,
      heatmap: false,
      zones: false,
      radius: true,
      radarOverlay: false,
    },
    animations: {
      pulse: ["ml-user-glow"],
      glow: ["ml-merchants-glow"],
    },
    style: "dark",
    density: "medium",
    cameraDuration: 600,
    interactionLevel: "standard",
  },

  food: {
    id: "food",
    label: "Food & Dining",
    layers: {
      "user-location": true,
      merchants: true,
      "drivers-live": true,
      heatmap: false,
      zones: false,
      radius: true,
      radarOverlay: false,
    },
    animations: {
      pulse: ["ml-user-glow"],
      glow: ["ml-merchants-glow"],
      "live-move": ["ml-drivers-point"],
    },
    style: "dark",
    density: "high",
    cameraDuration: 500,
    interactionLevel: "full",
  },

  retail: {
    id: "retail",
    label: "Shopping",
    layers: {
      "user-location": true,
      merchants: true,
      "drivers-live": false,
      heatmap: false,
      zones: false,
      radius: true,
      radarOverlay: false,
    },
    animations: {
      pulse: ["ml-user-glow"],
      glow: ["ml-merchants-glow"],
    },
    style: "dark",
    density: "medium",
    cameraDuration: 600,
    interactionLevel: "standard",
  },
};

export type MapPresetId = keyof typeof MAP_PRESETS;
