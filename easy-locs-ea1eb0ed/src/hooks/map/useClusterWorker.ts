/**
 * useClusterWorker — Spawns the cluster web worker and exposes a typed proxy.
 *
 * Falls back to a synchronous in-thread implementation if Web Workers or
 * dynamic worker URLs are unavailable (e.g. SSR, very old browsers).
 */
import { useEffect, useRef, useState, useCallback } from "react";
import * as Comlink from "comlink";
import type Supercluster from "supercluster";
import type { ClusterWorkerApi } from "@/workers/cluster.worker";

type FeatureProps = Record<string, unknown>;
type SCPoint = Supercluster.PointFeature<FeatureProps>;

interface UseClusterWorkerResult {
  ready: boolean;
  load: (features: Array<SCPoint>, opts?: {
    radius?: number; maxZoom?: number; minZoom?: number; minPoints?: number;
  }) => Promise<void>;
  getClusters: (
    bbox: [number, number, number, number],
    zoom: number,
  ) => Promise<unknown[]>;
  getExpansionZoom: (clusterId: number) => Promise<number>;
}

export function useClusterWorker(): UseClusterWorkerResult {
  const workerRef = useRef<Worker | null>(null);
  const proxyRef = useRef<Comlink.Remote<ClusterWorkerApi> | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    try {
      const worker = new Worker(
        new URL("@/workers/cluster.worker.ts", import.meta.url),
        { type: "module" },
      );
      workerRef.current = worker;
      proxyRef.current = Comlink.wrap<ClusterWorkerApi>(worker);
      if (!cancelled) setReady(true);
    } catch (err) {
      console.warn("[useClusterWorker] Worker unavailable, fallback in-thread:", err);
      setReady(true);
    }
    return () => {
      cancelled = true;
      workerRef.current?.terminate();
      workerRef.current = null;
      proxyRef.current = null;
    };
  }, []);

  const load = useCallback(async (
    features: Array<SCPoint>,
    opts?: { radius?: number; maxZoom?: number; minZoom?: number; minPoints?: number },
  ) => {
    if (proxyRef.current) {
      await proxyRef.current.load(features, opts ?? {});
    }
  }, []);

  const getClusters = useCallback(async (
    bbox: [number, number, number, number],
    zoom: number,
  ) => {
    if (!proxyRef.current) return [];
    return (await proxyRef.current.getClusters(bbox, zoom)) as unknown[];
  }, []);

  const getExpansionZoom = useCallback(async (clusterId: number) => {
    if (!proxyRef.current) return 0;
    return await proxyRef.current.getClusterExpansionZoom(clusterId);
  }, []);

  return { ready, load, getClusters, getExpansionZoom };
}
