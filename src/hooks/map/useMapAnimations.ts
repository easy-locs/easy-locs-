/**
 * useMapAnimations — Activates/deactivates animations on map layers based on preset config.
 * Zero UI. Pure animation orchestration.
 */
import { useEffect, useRef } from "react";
import type mapboxgl from "mapbox-gl";
import { AnimationRegistry } from "@/lib/map/engine/animation-registry";
import type { MapScreenPreset } from "@/lib/map/presets/map-screen-presets";

export function useMapAnimations(
  mapRef: React.RefObject<mapboxgl.Map | null>,
  ready: boolean,
  preset: MapScreenPreset
) {
  const activeRef = useRef<Map<string, string[]>>(new Map());

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const nextAnims = preset.animations;
    const prevAnims = activeRef.current;

    // Stop animations no longer in preset
    for (const [animId] of prevAnims) {
      if (!nextAnims[animId]) {
        AnimationRegistry.stop(animId);
      }
    }

    // Start/update animations in preset
    for (const [animId, targetLayerIds] of Object.entries(nextAnims)) {
      const prev = prevAnims.get(animId);
      const changed = !prev || prev.join(",") !== targetLayerIds.join(",");

      if (changed) {
        // Restart with new targets
        AnimationRegistry.stop(animId);
        AnimationRegistry.start(map, animId, targetLayerIds);
      } else if (!AnimationRegistry.isActive(animId)) {
        AnimationRegistry.start(map, animId, targetLayerIds);
      }
    }

    activeRef.current = new Map(Object.entries(nextAnims));

    return () => {
      AnimationRegistry.stopAll();
      activeRef.current.clear();
    };
  }, [ready, preset]);
}
