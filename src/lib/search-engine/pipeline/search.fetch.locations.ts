/**
 * search.fetch.locations — Matches query against known districts/areas.
 * Pure function — no DB calls.
 */
import type { SearchResult } from "../search-types";

const DUBAI_DISTRICTS = [
  "Dubai Marina", "JLT", "Downtown Dubai", "Business Bay", "JBR",
  "Al Barsha", "Deira", "Jumeirah", "Palm Jumeirah", "DIFC",
  "Silicon Oasis", "Sports City", "Motor City", "Discovery Gardens",
  "International City", "Al Quoz", "Bur Dubai", "Karama",
];

export function matchLocations(query: string): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  return DUBAI_DISTRICTS
    .filter((d) => d.toLowerCase().includes(q))
    .slice(0, 4)
    .map((d) => ({
      id: `loc_${d.replace(/\s+/g, "_").toLowerCase()}`,
      type: "location" as const,
      title: d,
      subtitle: "Dubai",
      district: d,
      city: "Dubai",
    }));
}
