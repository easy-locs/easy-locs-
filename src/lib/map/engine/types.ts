/**
 * Map Engine Types — Shared types for the micro-layer map architecture.
 */
import type mapboxgl from "mapbox-gl";

/** A single map layer module */
export interface MapLayerModule {
  id: string;
  /** Add sources + layers to map */
  setup: (map: mapboxgl.Map) => void;
  /** Update data for this layer */
  update: (map: mapboxgl.Map, data: any) => void;
  /** Show/hide */
  setVisible: (map: mapboxgl.Map, visible: boolean) => void;
  /** Teardown (optional) */
  destroy?: (map: mapboxgl.Map) => void;
  /** Layer IDs owned by this module (for z-ordering / interaction) */
  layerIds: string[];
}

/** A single animation module */
export interface MapAnimationModule {
  id: string;
  /** Start the animation loop */
  start: (map: mapboxgl.Map, targets: string[]) => void;
  /** Stop the animation */
  stop: () => void;
  /** Is currently running */
  active: boolean;
}

/** Interaction event emitted by the map */
export interface MapInteractionEvent {
  type: "click" | "hover" | "select" | "deselect";
  entityId?: string;
  entityType?: string;
  lngLat: { lng: number; lat: number };
  features?: mapboxgl.MapboxGeoJSONFeature[];
}

/** Style preset */
export type MapStylePreset = "dark" | "light" | "satellite" | "premium";

/** Density mode */
export type MapDensityMode = "low" | "medium" | "high";
