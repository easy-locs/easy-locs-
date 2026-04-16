/**
 * 3D buildings extrusion + sky layer + terrain DEM helpers.
 *
 * `applyImmersive3D(map, opts)` is idempotent and safe to call multiple
 * times. It looks for a building source layer in the active style and
 * upgrades it to a fill-extrusion. Falls back gracefully when the active
 * style does not include building data.
 */
import type maplibregl from "maplibre-gl";

const BUILDINGS_LAYER_ID = "ml-3d-buildings";
const SKY_LAYER_ID = "ml-sky";
const TERRAIN_SOURCE_ID = "ml-terrain-dem";

const TERRARIUM_TILES = "https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{z}/{x}/{y}.png";

export interface Immersive3DOptions {
  buildings?: boolean;
  sky?: boolean;
  terrain?: boolean;
  /** Pitch angle to engage when activating immersive mode. */
  pitch?: number;
  /** Bearing in degrees. */
  bearing?: number;
  /** Color of the building extrusions, hex/hsl string. */
  buildingColor?: string;
  /** Roof color used when zoomed in. */
  buildingRoofColor?: string;
}

function findBuildingSource(map: maplibregl.Map): { source: string; sourceLayer: string } | null {
  const style = map.getStyle();
  if (!style?.sources) return null;
  const candidates: Array<[string, string[]]> = [
    ["openmaptiles", ["building"]],
    ["protomaps", ["buildings", "building"]],
    ["composite", ["building"]],
    ["carto", ["building"]],
  ];
  for (const [src, layers] of candidates) {
    if (style.sources[src]) {
      for (const sl of layers) return { source: src, sourceLayer: sl };
    }
  }
  return null;
}

export function applyImmersive3D(
  map: maplibregl.Map,
  opts: Immersive3DOptions = {},
): { buildings: boolean; sky: boolean; terrain: boolean } {
  const result = { buildings: false, sky: false, terrain: false };
  if (!map || !map.isStyleLoaded()) return result;

  const buildings = opts.buildings ?? true;
  const sky = opts.sky ?? true;
  const terrain = opts.terrain ?? false;

  if (buildings) {
    try {
      const found = findBuildingSource(map);
      if (found && !map.getLayer(BUILDINGS_LAYER_ID)) {
        map.addLayer({
          id: BUILDINGS_LAYER_ID,
          type: "fill-extrusion",
          source: found.source,
          "source-layer": found.sourceLayer,
          minzoom: 14,
          paint: {
            "fill-extrusion-color": [
              "interpolate", ["linear"], ["zoom"],
              14, opts.buildingColor ?? "hsl(220, 18%, 22%)",
              17, opts.buildingRoofColor ?? "hsl(220, 28%, 32%)",
            ],
            "fill-extrusion-height": [
              "interpolate", ["linear"], ["zoom"],
              14, 0,
              16, ["coalesce", ["get", "render_height"], ["get", "height"], 12],
            ],
            "fill-extrusion-base": [
              "coalesce", ["get", "render_min_height"], ["get", "min_height"], 0,
            ],
            "fill-extrusion-opacity": 0.85,
          },
        } as maplibregl.LayerSpecification);
        result.buildings = true;
      }
    } catch (err) {
      console.warn("[buildings-3d] Failed to add buildings:", err);
    }
  }

  if (sky) {
    try {
      if (!map.getLayer(SKY_LAYER_ID)) {
        map.addLayer({
          id: SKY_LAYER_ID,
          type: "background",
          paint: {
            "background-color": "hsl(220, 30%, 8%)",
            "background-opacity": 0.0,
          },
          maxzoom: 5,
        } as maplibregl.LayerSpecification);
        result.sky = true;
      }
    } catch {}
  }

  if (terrain) {
    try {
      if (!map.getSource(TERRAIN_SOURCE_ID)) {
        map.addSource(TERRAIN_SOURCE_ID, {
          type: "raster-dem",
          tiles: [TERRARIUM_TILES],
          tileSize: 256,
          encoding: "terrarium",
          maxzoom: 15,
        } as unknown as maplibregl.SourceSpecification);
      }
      (map as unknown as { setTerrain?: (t: { source: string; exaggeration: number } | null) => void })
        .setTerrain?.({ source: TERRAIN_SOURCE_ID, exaggeration: 1.2 });
      result.terrain = true;
    } catch (err) {
      console.warn("[buildings-3d] Terrain init failed:", err);
    }
  }

  if (typeof opts.pitch === "number" || typeof opts.bearing === "number") {
    map.easeTo({
      pitch: opts.pitch ?? map.getPitch(),
      bearing: opts.bearing ?? map.getBearing(),
      duration: 600,
    });
  }
  return result;
}

export function disableImmersive3D(map: maplibregl.Map) {
  try {
    if (map.getLayer(BUILDINGS_LAYER_ID)) map.removeLayer(BUILDINGS_LAYER_ID);
    if (map.getLayer(SKY_LAYER_ID)) map.removeLayer(SKY_LAYER_ID);
    (map as unknown as { setTerrain?: (t: null) => void }).setTerrain?.(null);
    if (map.getSource(TERRAIN_SOURCE_ID)) map.removeSource(TERRAIN_SOURCE_ID);
  } catch {}
}

export const IMMERSIVE_PRESETS: Record<string, Immersive3DOptions> = {
  radar: { buildings: true, sky: true, terrain: false, pitch: 45, bearing: 0 },
  ride: { buildings: true, sky: false, terrain: false, pitch: 55, bearing: 0 },
  delivery: { buildings: true, sky: false, terrain: false, pitch: 50, bearing: 0 },
  travel: { buildings: false, sky: true, terrain: true, pitch: 30, bearing: 0 },
  property: { buildings: true, sky: false, terrain: false, pitch: 40, bearing: 0 },
  flat: { buildings: false, sky: false, terrain: false, pitch: 0, bearing: 0 },
};
