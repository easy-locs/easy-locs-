import type maplibregl from "maplibre-gl";
import type { MapLayerModule } from "./types";

class LayerRegistryImpl {
  private layers = new Map<string, MapLayerModule>();
  private setupDone = new Set<string>();

  register(layer: MapLayerModule) {
    this.layers.set(layer.id, layer);
  }

  unregister(id: string) {
    this.layers.delete(id);
    this.setupDone.delete(id);
  }

  setupAll(map: maplibregl.Map) {
    for (const [id, layer] of this.layers) {
      if (!this.setupDone.has(id)) {
        try {
          layer.setup(map);
          this.setupDone.add(id);
        } catch (e) {
          console.warn(`[LayerRegistry] Failed to setup layer: ${id}`, e);
        }
      }
    }
  }

  updateLayer(map: maplibregl.Map, layerId: string, data: any) {
    const layer = this.layers.get(layerId);
    if (layer && this.setupDone.has(layerId)) {
      try { layer.update(map, data); } catch {}
    }
  }

  setVisibility(map: maplibregl.Map, layerId: string, visible: boolean) {
    const layer = this.layers.get(layerId);
    if (layer && this.setupDone.has(layerId)) {
      try { layer.setVisible(map, visible); } catch {}
    }
  }

  setVisibilityBatch(map: maplibregl.Map, visibilityMap: Record<string, boolean>) {
    for (const [id, visible] of Object.entries(visibilityMap)) {
      this.setVisibility(map, id, visible);
    }
  }

  destroyAll(map: maplibregl.Map) {
    for (const [id, layer] of this.layers) {
      if (this.setupDone.has(id) && layer.destroy) {
        try { layer.destroy(map); } catch {}
      }
    }
    this.setupDone.clear();
  }

  getLayerIds(): string[] {
    return Array.from(this.layers.keys());
  }

  getAllInteractiveLayerIds(): string[] {
    const ids: string[] = [];
    for (const layer of this.layers.values()) {
      ids.push(...layer.layerIds);
    }
    return ids;
  }

  has(id: string): boolean {
    return this.layers.has(id);
  }
}

export const LayerRegistry = new LayerRegistryImpl();
