/**
 * Search Mode Resolver — Determines strict_address vs place_discovery mode.
 * Only Search Brain should call this. No UI may own mode logic.
 */

export type SearchMode = "strict_address" | "place_discovery";

const STRICT_CONTEXTS = new Set([
  "food_delivery",
  "grocery_delivery",
  "taxi_pickup",
  "taxi_dropoff",
  "parcel_pickup",
  "parcel_dropoff",
]);

const DISCOVERY_PLACE_TYPES = new Set([
  "mall", "landmark", "tower", "hotel", "airport", "station",
  "district", "city", "neighborhood", "poi",
]);

export function resolveSearchMode(contextType?: string): SearchMode {
  if (contextType && STRICT_CONTEXTS.has(contextType)) return "strict_address";
  return "place_discovery";
}

export function isDiscoveryPlaceType(placeType?: string): boolean {
  return placeType ? DISCOVERY_PLACE_TYPES.has(placeType) : false;
}

/** Penalty multiplier for incompatible place types in strict mode */
export function strictPlaceTypePenalty(placeType: string): number {
  // In strict address mode, landmarks/malls/airports are less useful as delivery addresses
  if (DISCOVERY_PLACE_TYPES.has(placeType)) return 0.5;
  return 1.0;
}
