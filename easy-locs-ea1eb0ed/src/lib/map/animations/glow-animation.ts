/**
 * glow-animation — Breathing glow for sponsored/highlighted entities.
 */
import type mapboxgl from "mapbox-gl";
import type { MapAnimationModule } from "../engine/types";

export function createGlowAnimation(): MapAnimationModule {
  let rafId: number | null = null;
  let _active = false;

  return {
    id: "glow",
    get active() { return _active; },

    start(map, targetLayerIds) {
      _active = true;
      let t = 0;

      const animate = () => {
        if (!_active) return;
        t = (t + 0.015) % 1;
        const blur = 0.6 + Math.sin(t * Math.PI * 2) * 0.3;
        const radius = 18 + Math.sin(t * Math.PI * 2) * 4;

        for (const layerId of targetLayerIds) {
          try {
            if (map.getLayer(layerId)) {
              map.setPaintProperty(layerId, "circle-blur", blur);
              map.setPaintProperty(layerId, "circle-radius", radius);
            }
          } catch {}
        }
        rafId = requestAnimationFrame(animate);
      };
      rafId = requestAnimationFrame(animate);
    },

    stop() {
      _active = false;
      if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    },
  };
}
