/**
 * fetchUnifiedPoints — LEGACY WRAPPER.
 * Now delegates to the canonical discovery pipeline.
 * All consumers should migrate to fetchCanonicalDiscovery directly.
 */
import { fetchCanonicalDiscovery, type CanonicalDiscoveryOpts } from "@/lib/discovery/canonical-discovery-pipeline";
import type { RadarPoint, RadarCategory, UserGeoPoint } from "@/lib/radar/types";

export interface FetchUnifiedPointsOpts {
  searchQuery?: string;
  userLocation?: UserGeoPoint | null;
  category?: RadarCategory;
  subcategory?: string | null;
  vertical?: string;
  limit?: number;
  /** Surface type for visibility rules — defaults to "discover" */
  surface?: CanonicalDiscoveryOpts["surface"];
  /** Radius in km for geo filtering */
  radiusKm?: number | null;
}

export async function fetchUnifiedPoints(opts?: FetchUnifiedPointsOpts): Promise<RadarPoint[]> {
  return fetchCanonicalDiscovery({
    surface: opts?.surface ?? "discover",
    searchQuery: opts?.searchQuery,
    userLocation: opts?.userLocation,
    category: opts?.category,
    subcategory: opts?.subcategory,
    vertical: opts?.vertical,
    radiusKm: opts?.radiusKm,
    limit: opts?.limit,
  });
}
