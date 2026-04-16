import { useEffect, useMemo, useRef } from "react";
import type maplibregl from "maplibre-gl";

interface NightlifeZone {
  id: string;
  lat: number;
  lng: number;
  name: string;
  intensity: number;
  entityCount: number;
  vibe: "club" | "bar" | "lounge" | "mixed";
  isHot: boolean;
}

interface Props {
  map: maplibregl.Map | null;
  entities: Array<{
    id: string;
    lat: number;
    lng: number;
    category?: string;
    type?: string;
    name: string;
    rating?: number;
    reviewsCount?: number;
  }>;
  visible: boolean;
  onZoneTap?: (lat: number, lng: number) => void;
}

const NIGHTLIFE_TYPES = [
  "nightlife", "bar", "club", "lounge", "nightclub", "pub", "disco",
  "karaoke", "hookah", "cocktail", "brewery", "wine_bar",
];

const VIBE_COLORS: Record<string, string> = {
  club: "hsl(280, 70%, 55%)",
  bar: "hsl(330, 70%, 55%)",
  lounge: "hsl(260, 60%, 50%)",
  mixed: "hsl(300, 65%, 55%)",
};

function classifyVibe(category: string): NightlifeZone["vibe"] {
  const cat = category.toLowerCase();
  if (cat.includes("club") || cat.includes("disco") || cat.includes("nightclub")) return "club";
  if (cat.includes("bar") || cat.includes("pub") || cat.includes("cocktail") || cat.includes("brewery")) return "bar";
  if (cat.includes("lounge") || cat.includes("hookah")) return "lounge";
  return "mixed";
}

function clusterNightlifeEntities(
  entities: Props["entities"],
  gridSize: number = 0.003
): NightlifeZone[] {
  const nightlife = entities.filter(e => {
    const cat = (e.category || e.type || "").toLowerCase();
    return NIGHTLIFE_TYPES.some(t => cat.includes(t));
  });

  if (nightlife.length === 0) return [];

  const clusters = new Map<string, typeof nightlife>();

  for (const e of nightlife) {
    const gridLat = Math.round(e.lat / gridSize) * gridSize;
    const gridLng = Math.round(e.lng / gridSize) * gridSize;
    const key = `${gridLat.toFixed(4)}_${gridLng.toFixed(4)}`;
    const group = clusters.get(key) || [];
    group.push(e);
    clusters.set(key, group);
  }

  const zones: NightlifeZone[] = [];

  for (const [key, group] of clusters) {
    if (group.length === 0) continue;

    const avgLat = group.reduce((s, e) => s + e.lat, 0) / group.length;
    const avgLng = group.reduce((s, e) => s + e.lng, 0) / group.length;

    const avgRating = group.reduce((s, e) => s + (e.rating || 0), 0) / group.length;
    const totalReviews = group.reduce((s, e) => s + (e.reviewsCount || 0), 0);

    const intensity = Math.min(1, (group.length / 5) * 0.5 + (avgRating / 5) * 0.3 + Math.min(totalReviews / 100, 1) * 0.2);

    const dominantCat = group[0].category || group[0].type || "nightlife";

    zones.push({
      id: key,
      lat: avgLat,
      lng: avgLng,
      name: group.length > 1 ? `${group.length} nightlife spots` : group[0].name,
      intensity,
      entityCount: group.length,
      vibe: classifyVibe(dominantCat),
      isHot: intensity > 0.65,
    });
  }

  return zones.sort((a, b) => b.intensity - a.intensity);
}

const SOURCE_ID = "nightlife-zones-source";
const GLOW_LAYER = "nightlife-zones-glow";
const FILL_LAYER = "nightlife-zones-fill";
const LABEL_LAYER = "nightlife-zones-label";
const HOT_LAYER = "nightlife-zones-hot";

export default function NightlifeZonesLayer({ map, entities, visible, onZoneTap }: Props) {
  const zones = useMemo(() => clusterNightlifeEntities(entities), [entities]);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!map) return;

    const setup = () => {
      [HOT_LAYER, LABEL_LAYER, FILL_LAYER, GLOW_LAYER].forEach(id => {
        if (map.getLayer(id)) map.removeLayer(id);
      });
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);

      if (!visible || zones.length === 0) return;

      const geojson: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: zones.map(z => ({
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: [z.lng, z.lat] },
          properties: {
            id: z.id,
            name: z.name,
            vibe: z.vibe,
            intensity: z.intensity,
            entityCount: z.entityCount,
            isHot: z.isHot,
            color: VIBE_COLORS[z.vibe] || VIBE_COLORS.mixed,
          },
        })),
      };

      map.addSource(SOURCE_ID, { type: "geojson", data: geojson });

      map.addLayer({
        id: GLOW_LAYER,
        type: "circle",
        source: SOURCE_ID,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 30, 14, 60, 18, 120],
          "circle-color": [
            "match", ["get", "vibe"],
            "club", "hsla(280, 70%, 55%, 0.12)",
            "bar", "hsla(330, 70%, 55%, 0.12)",
            "lounge", "hsla(260, 60%, 50%, 0.12)",
            "hsla(300, 65%, 55%, 0.12)",
          ],
          "circle-blur": 0.8,
          "circle-opacity": ["interpolate", ["linear"], ["get", "intensity"], 0.3, 0.3, 1, 0.7],
        },
      });

      map.addLayer({
        id: FILL_LAYER,
        type: "circle",
        source: SOURCE_ID,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 15, 14, 35, 18, 70],
          "circle-color": [
            "match", ["get", "vibe"],
            "club", "hsla(280, 70%, 55%, 0.25)",
            "bar", "hsla(330, 70%, 55%, 0.25)",
            "lounge", "hsla(260, 60%, 50%, 0.25)",
            "hsla(300, 65%, 55%, 0.25)",
          ],
          "circle-stroke-width": 1.5,
          "circle-stroke-color": [
            "match", ["get", "vibe"],
            "club", "hsla(280, 70%, 55%, 0.5)",
            "bar", "hsla(330, 70%, 55%, 0.5)",
            "lounge", "hsla(260, 60%, 50%, 0.5)",
            "hsla(300, 65%, 55%, 0.5)",
          ],
          "circle-opacity": ["interpolate", ["linear"], ["get", "intensity"], 0.3, 0.5, 1, 0.85],
        },
      });

      map.addLayer({
        id: LABEL_LAYER,
        type: "symbol",
        source: SOURCE_ID,
        layout: {
          "text-field": [
            "case",
            ["==", ["get", "vibe"], "club"], "🎵",
            ["==", ["get", "vibe"], "bar"], "🍸",
            ["==", ["get", "vibe"], "lounge"], "💃",
            "🔥",
          ],
          "text-size": ["interpolate", ["linear"], ["zoom"], 10, 14, 14, 22, 18, 30],
          "text-allow-overlap": true,
          "text-ignore-placement": true,
        },
      });

      map.addLayer({
        id: HOT_LAYER,
        type: "symbol",
        source: SOURCE_ID,
        filter: ["==", ["get", "isHot"], true],
        layout: {
          "text-field": "HOT",
          "text-size": 9,
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
          "text-offset": [0, -2.2],
          "text-allow-overlap": true,
          "text-ignore-placement": true,
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "hsl(0, 80%, 55%)",
          "text-halo-width": 4,
          "text-halo-blur": 1,
        },
      });

      const handleClick = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
        if (e.features && e.features.length > 0 && onZoneTap) {
          const coords = (e.features[0].geometry as GeoJSON.Point).coordinates;
          onZoneTap(coords[1], coords[0]);
        }
      };

      const handleEnter = () => { map.getCanvas().style.cursor = "pointer"; };
      const handleLeave = () => { map.getCanvas().style.cursor = ""; };

      map.on("click", FILL_LAYER, handleClick);
      map.on("click", LABEL_LAYER, handleClick);
      map.on("mouseenter", FILL_LAYER, handleEnter);
      map.on("mouseleave", FILL_LAYER, handleLeave);

      cleanupRef.current = () => {
        map.off("click", FILL_LAYER, handleClick);
        map.off("click", LABEL_LAYER, handleClick);
        map.off("mouseenter", FILL_LAYER, handleEnter);
        map.off("mouseleave", FILL_LAYER, handleLeave);
      };
    };

    if (map.isStyleLoaded()) {
      setup();
    } else {
      map.on("style.load", setup);
    }

    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
      try {
        map.off("style.load", setup);
        [HOT_LAYER, LABEL_LAYER, FILL_LAYER, GLOW_LAYER].forEach(id => {
          if (map.getLayer(id)) map.removeLayer(id);
        });
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
      } catch {}
    };
  }, [map, zones, visible, onZoneTap]);

  const pulseFrameRef = useRef(0);
  useEffect(() => {
    if (!map || !visible || zones.length === 0) return;

    let animId: number;
    const animate = () => {
      pulseFrameRef.current++;
      const t = (Math.sin(pulseFrameRef.current * 0.03) + 1) / 2;
      try {
        if (map.getLayer(GLOW_LAYER)) {
          map.setPaintProperty(GLOW_LAYER, "circle-opacity", 0.3 + t * 0.4);
        }
      } catch {}
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animId);
  }, [map, visible, zones.length]);

  return null;
}

export { clusterNightlifeEntities, type NightlifeZone };
