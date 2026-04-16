import type maplibregl from "maplibre-gl";

export interface MapLayerModule {
  id: string;
  setup: (map: maplibregl.Map) => void;
  update: (map: maplibregl.Map, data: any) => void;
  setVisible: (map: maplibregl.Map, visible: boolean) => void;
  destroy?: (map: maplibregl.Map) => void;
  layerIds: string[];
}

export interface MapAnimationModule {
  id: string;
  start: (map: maplibregl.Map, targets: string[]) => void;
  stop: () => void;
  active: boolean;
}

export interface MapInteractionEvent {
  type: "click" | "hover" | "select" | "deselect";
  entityId?: string;
  entityType?: string;
  lngLat: { lng: number; lat: number };
  features?: maplibregl.MapGeoJSONFeature[];
}

export type MapStylePreset = "dark" | "light" | "satellite" | "premium";

export type MapDensityMode = "low" | "medium" | "high";
