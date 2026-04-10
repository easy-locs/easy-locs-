/**
 * bounce-animation — Bounce effect for newly appearing entities.
 */
import type mapboxgl from "mapbox-gl";
import type { MapAnimationModule } from "../engine/types";

export function createBounceAnimation(): MapAnimationModule {
  let rafId: number | null = null;
  let _active = false;

  return {
    id: "bounce",
    get active() { return _active; },

    start(map, targetLayerIds) {
      _active = true;
      let t = 0;
      const duration = 0.5; // seconds
      const startTime = performance.now();

      const animate = () => {
        if (!_active) return;
        const elapsed = (performance.now() - startTime) / 1000;
        if (elapsed > duration) {
          // Reset to normal
          for (const layerId of targetLayerIds) {
            try {
              if (map.getLayer(layerId)) {
                map.setPaintProperty(layerId, "circle-radius", 8);
              }
            } catch {}
          }
          _active = false;
          return;
        }

        const progress = elapsed / duration;
        // Bounce easing
        const bounce = Math.abs(Math.sin(progress * Math.PI * 3)) * (1 - progress);
        const radius = 8 + bounce * 6;

        for (const layerId of targetLayerIds) {
          try {
            if (map.getLayer(layerId)) {
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
