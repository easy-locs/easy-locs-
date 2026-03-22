/**
 * useGeoEntities — Returns map-ready entities.
 */
import { useRadarResults } from "./useRadarResults";
export function useGeoEntities(opts?: { type?: string }) {
  return useRadarResults(opts);
}
