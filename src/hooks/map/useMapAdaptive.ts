/**
 * useMapAdaptive — Auto-adapts map behavior by zoom, density, device, realtime rate.
 * Feeds back into animation/density decisions.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import type mapboxgl from "mapbox-gl";
import { setDensity } from "@/lib/map/engine/style-engine";
import { AnimationRegistry } from "@/lib/map/engine/animation-registry";
import type { MapDensityMode } from "@/lib/map/engine/types";

export interface MapAdaptiveState {
  zoom: number;
  entityCount: number;
  visibleCount: number;
  isMobile: boolean;
  density: MapDensityMode;
  realtimeRate: number; // updates/sec
  animationsActive: string[];
  animationsPaused: string[];
}

const IS_MOBILE = typeof window !== "undefined" && window.innerWidth < 768;

export function useMapAdaptive(
  mapRef: React.RefObject<mapboxgl.Map | null>,
  ready: boolean,
  entityCount: number
) {
  const [state, setState] = useState<MapAdaptiveState>({
    zoom: 12,
    entityCount: 0,
    visibleCount: 0,
    isMobile: IS_MOBILE,
    density: "medium",
    realtimeRate: 0,
    animationsActive: [],
    animationsPaused: [],
  });

  const realtimeCounterRef = useRef(0);
  const lastRateResetRef = useRef(Date.now());

  // Track realtime update rate
  const trackRealtimeUpdate = useCallback(() => {
    realtimeCounterRef.current++;
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const evaluate = () => {
      const zoom = map.getZoom();
      const bounds = map.getBounds();
      const now = Date.now();
      const elapsed = (now - lastRateResetRef.current) / 1000;
      const rate = elapsed > 0 ? realtimeCounterRef.current / elapsed : 0;

      // Reset counter every 5s
      if (elapsed > 5) {
        realtimeCounterRef.current = 0;
        lastRateResetRef.current = now;
      }

      // Compute visible count (rough via queryRenderedFeatures)
      let visibleCount = 0;
      try {
        const rendered = map.queryRenderedFeatures(undefined, {
          layers: map.getStyle()?.layers
            ?.filter(l => l.id.startsWith("ml-"))
            .map(l => l.id)
            .filter(id => !!map.getLayer(id)) ?? [],
        });
        visibleCount = rendered.length;
      } catch {
        visibleCount = entityCount;
      }

      // Decide density
      let density: MapDensityMode = "medium";
      if (IS_MOBILE && visibleCount > 200) density = "low";
      else if (IS_MOBILE && visibleCount > 80) density = "medium";
      else if (visibleCount > 500) density = "low";
      else if (visibleCount > 150) density = "medium";
      else density = "high";

      setDensity(density);

      // Throttle secondary animations on mobile + high density
      const animationsActive: string[] = [];
      const animationsPaused: string[] = [];

      for (const animId of AnimationRegistry.getRegistered()) {
        if (IS_MOBILE && density === "low" && animId !== "pulse") {
          // Pause non-essential animations on mobile under stress
          if (AnimationRegistry.isActive(animId)) {
            AnimationRegistry.stop(animId);
            animationsPaused.push(animId);
          }
        } else {
          if (AnimationRegistry.isActive(animId)) {
            animationsActive.push(animId);
          }
        }
      }

      setState({
        zoom,
        entityCount,
        visibleCount,
        isMobile: IS_MOBILE,
        density,
        realtimeRate: Math.round(rate * 10) / 10,
        animationsActive,
        animationsPaused,
      });
    };

    // Evaluate on zoom/move
    map.on("zoomend", evaluate);
    map.on("moveend", evaluate);

    // Initial evaluation
    const timer = setTimeout(evaluate, 500);

    // Periodic check
    const interval = setInterval(evaluate, 3000);

    return () => {
      map.off("zoomend", evaluate);
      map.off("moveend", evaluate);
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [ready, entityCount]);

  return { adaptive: state, trackRealtimeUpdate };
}
