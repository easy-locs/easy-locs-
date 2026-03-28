/**
 * Map Engine — Main barrel export for the micro-layer map architecture.
 * Registers all layers and animations.
 */
export { LayerRegistry } from "./engine/layer-registry";
export { AnimationRegistry } from "./engine/animation-registry";
export { setupInteractions } from "./engine/interaction-engine";
export { startMapRealtimeBridge, stopMapRealtimeBridge } from "./engine/realtime-bridge";
export { queueSourceUpdate, cullFeaturesToViewport, shouldThrottleRealtimeUpdate, destroyPerformanceEngine } from "./engine/performance-engine";
export { getStyleUrl, getCurrentPreset, setPreset, getDensity, setDensity, getAutoPreset, applyPremiumFog } from "./engine/style-engine";
export type { MapLayerModule, MapAnimationModule, MapInteractionEvent, MapStylePreset, MapDensityMode } from "./engine/types";

// Layers
export { userLocationLayer } from "./layers/user-location-layer";
export { merchantsLayer } from "./layers/merchants-layer";
export { driversLiveLayer } from "./layers/drivers-live-layer";
export { heatmapLayer } from "./layers/heatmap-layer";
export { zonesLayer } from "./layers/zones-layer";
export { radiusLayer } from "./layers/radius-layer";
export { weatherLayer } from "./layers/weather-layer";

// Animations
export { createPulseAnimation } from "./animations/pulse-animation";
export { createGlowAnimation } from "./animations/glow-animation";
export { createBounceAnimation } from "./animations/bounce-animation";
export { createLiveMoveAnimation, setTargetPositions, getInterpolatedPositions } from "./animations/live-move-animation";

/* ── Auto-register all layers + animations on import ── */
import { LayerRegistry } from "./engine/layer-registry";
import { AnimationRegistry } from "./engine/animation-registry";
import { userLocationLayer } from "./layers/user-location-layer";
import { merchantsLayer } from "./layers/merchants-layer";
import { driversLiveLayer } from "./layers/drivers-live-layer";
import { heatmapLayer } from "./layers/heatmap-layer";
import { zonesLayer } from "./layers/zones-layer";
import { radiusLayer } from "./layers/radius-layer";
import { weatherLayer } from "./layers/weather-layer";
import { createPulseAnimation } from "./animations/pulse-animation";
import { createGlowAnimation } from "./animations/glow-animation";
import { createBounceAnimation } from "./animations/bounce-animation";
import { createLiveMoveAnimation } from "./animations/live-move-animation";

// Register layers
[userLocationLayer, merchantsLayer, driversLiveLayer, heatmapLayer, zonesLayer, radiusLayer, weatherLayer]
  .forEach(l => LayerRegistry.register(l));

// Register animations
[createPulseAnimation(), createGlowAnimation(), createBounceAnimation(), createLiveMoveAnimation()]
  .forEach(a => AnimationRegistry.register(a));
