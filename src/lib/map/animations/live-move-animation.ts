/**
 * live-move-animation — Smooth GPS interpolation for moving entities (drivers).
 */
import type mapboxgl from "mapbox-gl";
import type { MapAnimationModule } from "../engine/types";

type Position = { id: string; lng: number; lat: number };

const currentPositions = new Map<string, { lng: number; lat: number }>();
const targetPositions = new Map<string, { lng: number; lat: number }>();

export function setTargetPositions(positions: Position[]) {
  for (const p of positions) {
    const current = currentPositions.get(p.id);
    if (!current) {
      currentPositions.set(p.id, { lng: p.lng, lat: p.lat });
    }
    targetPositions.set(p.id, { lng: p.lng, lat: p.lat });
  }
}

export function createLiveMoveAnimation(): MapAnimationModule {
  let rafId: number | null = null;
  let _active = false;
  const LERP = 0.08;

  return {
    id: "live-move",
    get active() { return _active; },

    start(map, _targetLayerIds) {
      _active = true;

      const animate = () => {
        if (!_active) return;

        let moved = false;
        for (const [id, target] of targetPositions) {
          const current = currentPositions.get(id);
          if (!current) { currentPositions.set(id, { ...target }); continue; }

          const dx = target.lng - current.lng;
          const dy = target.lat - current.lat;
          if (Math.abs(dx) > 0.000001 || Math.abs(dy) > 0.000001) {
            current.lng += dx * LERP;
            current.lat += dy * LERP;
            moved = true;
          }
        }

        // The actual source update should be triggered by the layer's update method
        // This animation just smooths the positions
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

export function getInterpolatedPositions(): Map<string, { lng: number; lat: number }> {
  return currentPositions;
}
