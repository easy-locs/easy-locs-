/**
 * Ride Type Fallback — Fallback chains for ride type matching.
 */

export type RideType = "eco" | "standard" | "premium";

export function getRideTypeFallbackChain(type: RideType): RideType[] {
  if (type === "eco") return ["eco", "standard"];
  if (type === "standard") return ["standard", "eco", "premium"];
  return ["premium", "standard"];
}
