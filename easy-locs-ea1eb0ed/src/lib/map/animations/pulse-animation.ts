/**
 * pulse-animation — Pulsing glow effect for user location or urgent entities.
 */
import type mapboxgl from "mapbox-gl";
import type { MapAnimationModule } from "../engine/types";

export function createPulseAnimation(): MapAnimationModule {
  let rafId: number | null = null;
  let _active = false;

  return {
    id: "pulse",
    get active() { return _active; },

    start(map, targetLayerIds) {
      _active = true;
      let phase = 0;

      const animate = () => {
        if (!_active) return;
        phase = (phase + 0.02) % 1;
        const radius = 18 + Math.sin(phase * Math.PI * 2) * 8;
        const opacity = 0.15 + Math.sin(phase * Math.PI * 2) * 0.1;

        for (const layerId of targetLayerIds) {
          try {
            if (map.getLayer(layerId)) {
              map.setPaintProperty(layerId, "circle-radius", radius);
              map.setPaintProperty(layerId, "circle-opacity", opacity);
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
