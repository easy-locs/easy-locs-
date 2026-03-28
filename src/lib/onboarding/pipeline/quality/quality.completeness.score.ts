/**
 * quality.completeness.score — Scores data completeness.
 * ONE thing: measure which fields are present.
 */
import type { QualityDimension } from "../contracts";

export function scoreCompleteness(params: {
  name: boolean; address: boolean; city: boolean; country: boolean;
  lat: boolean; lng: boolean; phone: boolean; website: boolean;
  categories: number; hasHours: boolean;
}): QualityDimension {
  const weights = { name: 20, address: 15, city: 10, country: 5, lat: 10, lng: 10, phone: 5, website: 5, categories: 10, hasHours: 10 };
  let score = 0;
  const details: string[] = [];

  if (params.name) score += weights.name; else details.push("missing name");
  if (params.address) score += weights.address; else details.push("missing address");
  if (params.city) score += weights.city; else details.push("missing city");
  if (params.country) score += weights.country; else details.push("missing country");
  if (params.lat) score += weights.lat; else details.push("missing lat");
  if (params.lng) score += weights.lng; else details.push("missing lng");
  if (params.phone) score += weights.phone; else details.push("missing phone");
  if (params.website) score += weights.website; else details.push("missing website");
  if (params.categories > 0) score += weights.categories; else details.push("missing categories");
  if (params.hasHours) score += weights.hasHours; else details.push("missing hours");

  return { dimension: "completeness", score, weight: 0.3, details: details.join("; ") || "all fields present" };
}
