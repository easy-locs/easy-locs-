/**
 * Map Feature Flags — Progressive enhancement toggles.
 * Registered at app boot via registerMapFlags().
 * Safe defaults: all disabled until explicitly enabled.
 */
import { registerFlags, isEnabled } from "@/lib/feature-flags";

const MAP_FLAGS = [
  {
    key: "mapHeatmapEnabled",
    defaultValue: false,
    description: "Enable business density heatmap overlay on discovery map",
  },
  {
    key: "mapStoriesEnabled",
    defaultValue: false,
    description: "Enable story ring layer on map pins (requires story adapter)",
  },
  {
    key: "mapBusinessBadgesEnabled",
    defaultValue: true,
    description: "Enable premium visual badges on map markers (verified, trending, sponsored)",
  },
];

let registered = false;

export function registerMapFlags(): void {
  if (registered) return;
  registerFlags(MAP_FLAGS);
  registered = true;
}

export function isHeatmapEnabled(): boolean {
  return isEnabled("mapHeatmapEnabled");
}

export function isStoriesEnabled(): boolean {
  return isEnabled("mapStoriesEnabled");
}

export function isBusinessBadgesEnabled(): boolean {
  return isEnabled("mapBusinessBadgesEnabled");
}
