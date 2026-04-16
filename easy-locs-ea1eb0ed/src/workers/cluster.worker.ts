/**
 * Cluster Web Worker — Off-main-thread point clustering using Supercluster.
 *
 * Designed for 50k+ entities without main-thread jank. Communication via
 * Comlink so callers can `await proxy.load(features)` and `await proxy.getClusters(bbox, zoom)`.
 */
import * as Comlink from "comlink";
import Supercluster from "supercluster";

type FeatureProps = Record<string, unknown>;
type SCPoint = Supercluster.PointFeature<FeatureProps>;
type SCCluster = Supercluster.ClusterFeature<FeatureProps>;

let index: Supercluster<FeatureProps, FeatureProps> | null = null;

export const clusterWorker = {
  load(
    features: Array<SCPoint>,
    options: {
      radius?: number;
      maxZoom?: number;
      minZoom?: number;
      minPoints?: number;
    } = {},
  ): { count: number } {
    index = new Supercluster<FeatureProps, FeatureProps>({
      radius: options.radius ?? 60,
      maxZoom: options.maxZoom ?? 17,
      minZoom: options.minZoom ?? 0,
      minPoints: options.minPoints ?? 2,
    });
    index.load(features);
    return { count: features.length };
  },

  getClusters(
    bbox: [number, number, number, number],
    zoom: number,
  ): Array<SCCluster | SCPoint> {
    if (!index) return [];
    return index.getClusters(bbox, Math.floor(zoom)) as Array<SCCluster | SCPoint>;
  },

  getClusterExpansionZoom(clusterId: number): number {
    if (!index) return 0;
    return index.getClusterExpansionZoom(clusterId);
  },

  getLeaves(clusterId: number, limit = 50, offset = 0) {
    if (!index) return [];
    return index.getLeaves(clusterId, limit, offset);
  },

  reset() {
    index = null;
  },
};

export type ClusterWorkerApi = typeof clusterWorker;

Comlink.expose(clusterWorker);
