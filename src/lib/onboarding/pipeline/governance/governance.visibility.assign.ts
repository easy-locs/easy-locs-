/**
 * governance.visibility.assign — Maps publish decision to visibility mode.
 * ONE thing: determine storefront visibility mode.
 */

export function assignVisibility(params: {
  allowed: boolean;
  qualityScore: number;
  isClaimed: boolean;
}): "live" | "coming_soon" | "hidden" | "search_only" {
  if (params.allowed && params.qualityScore >= 70) return "live";
  if (params.qualityScore >= 50) return "search_only";
  if (params.qualityScore >= 30) return "coming_soon";
  return "hidden";
}
