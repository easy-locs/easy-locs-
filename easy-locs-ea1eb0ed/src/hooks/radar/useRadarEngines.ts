/**
 * useRadarEngines — React hook bridging radar engines into RadarView.
 * Provides viewport state, filtered/fused entities, layer management,
 * and interaction handling via the decoupled engine suite.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RadarViewportEngine, type ViewportState } from "@/lib/radar/engines/viewport-engine";
import { RadarFusionEngine } from "@/lib/radar/engines/fusion-engine";
import { RadarLayerEngine, type RadarLayer } from "@/lib/radar/engines/layer-engine";
import { RadarFilterEngine, type RadarFilter } from "@/lib/radar/engines/filter-engine";
import { RadarInteractionEngine } from "@/lib/radar/engines/interaction-engine";
import { RadarGeoEngine } from "@/lib/radar/engines/geo-engine";
import { RadarRealtimeBridge } from "@/lib/radar/engines/realtime-bridge";
import type { CanonicalRadarProjection } from "@/lib/domains/canonical-entities";

export interface UseRadarEnginesOptions {
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  enableRealtime?: boolean;
}

export function useRadarEngines(options: UseRadarEnginesOptions = {}) {
  const viewportRef = useRef(new RadarViewportEngine({
    center: options.initialCenter,
    zoom: options.initialZoom,
  }));
  const fusionRef = useRef(new RadarFusionEngine());
  const layerRef = useRef(new RadarLayerEngine());
  const filterRef = useRef(new RadarFilterEngine());
  const interactionRef = useRef(new RadarInteractionEngine());
  const geoRef = useRef(new RadarGeoEngine());
  const realtimeRef = useRef(new RadarRealtimeBridge());

  const [viewport, setViewport] = useState<ViewportState>(viewportRef.current.getState());
  const [layers, setLayers] = useState<RadarLayer[]>([]);
  const [selected, setSelected] = useState<CanonicalRadarProjection | null>(null);
  const [realtimeEntities, setRealtimeEntities] = useState<Map<string, CanonicalRadarProjection[]>>(new Map());

  // Sync viewport changes
  useEffect(() => {
    const unsub = viewportRef.current.onChanged(setViewport);
    return unsub;
  }, []);

  // Sync layer changes
  useEffect(() => {
    const unsub = layerRef.current.onChanged(setLayers);
    return unsub;
  }, []);

  // Sync interaction changes
  useEffect(() => {
    const unsub = interactionRef.current.onInteraction((interaction) => {
      if (interaction.event === "select") setSelected(interaction.entity);
      if (interaction.event === "deselect") setSelected(null);
    });
    return unsub;
  }, []);

  // Start realtime bridge
  useEffect(() => {
    if (!options.enableRealtime) return;
    const bridge = realtimeRef.current;
    bridge.start();
    const unsub = bridge.onUpdate((layerKey, items) => {
      setRealtimeEntities(prev => {
        const next = new Map(prev);
        next.set(layerKey, items);
        return next;
      });
    });
    return () => { bridge.stop(); unsub(); };
  }, [options.enableRealtime]);

  /** Fuse static sources + realtime into final list */
  const fuseEntities = useCallback((
    staticSources: Map<string, CanonicalRadarProjection[]>
  ): CanonicalRadarProjection[] => {
    // Merge static + realtime
    const merged = new Map(staticSources);
    for (const [key, items] of realtimeEntities) {
      const existing = merged.get(key) || [];
      merged.set(key, [...existing, ...items]);
    }
    // Fuse (dedup + prioritize)
    const fused = fusionRef.current.fuse(merged);
    // Filter
    return filterRef.current.apply(fused);
  }, [realtimeEntities]);

  /** Update viewport */
  const updateViewport = useCallback((patch: Partial<ViewportState>) => {
    viewportRef.current.update(patch);
  }, []);

  /** Register a layer */
  const registerLayer = useCallback((layer: RadarLayer) => {
    layerRef.current.register(layer);
  }, []);

  /** Toggle layer visibility */
  const toggleLayer = useCallback((key: string) => {
    const l = layerRef.current.get(key);
    if (l) layerRef.current.setVisible(key, !l.visible);
  }, []);

  /** Register a filter */
  const registerFilter = useCallback((filter: RadarFilter) => {
    filterRef.current.register(filter);
  }, []);

  /** Select entity */
  const selectEntity = useCallback((entity: CanonicalRadarProjection) => {
    interactionRef.current.select(entity);
  }, []);

  /** Deselect */
  const deselectEntity = useCallback(() => {
    interactionRef.current.deselect();
  }, []);

  /** Distance calculation */
  const distanceTo = useCallback((target: { lat: number; lng: number }) => {
    return geoRef.current.distanceMeters(viewport.center, target);
  }, [viewport.center]);

  /** Cleanup */
  useEffect(() => {
    return () => {
      layerRef.current.destroy();
      filterRef.current.destroy();
      interactionRef.current.destroy();
      realtimeRef.current.destroy();
    };
  }, []);

  return {
    // State
    viewport,
    layers,
    selected,
    // Engines (for advanced access)
    viewportEngine: viewportRef.current,
    fusionEngine: fusionRef.current,
    layerEngine: layerRef.current,
    filterEngine: filterRef.current,
    interactionEngine: interactionRef.current,
    geoEngine: geoRef.current,
    realtimeBridge: realtimeRef.current,
    // Actions
    updateViewport,
    registerLayer,
    toggleLayer,
    registerFilter,
    selectEntity,
    deselectEntity,
    fuseEntities,
    distanceTo,
  };
}
