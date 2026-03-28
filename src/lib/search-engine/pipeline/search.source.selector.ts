/**
 * search.source.selector — Determines which data sources to query.
 * Pure function based on intent + vertical classification.
 */
import type { SearchIntent } from "./search.query.intent_classifier";
import type { Vertical } from "@/lib/taxonomy/world-class-taxonomy";

export type SearchSource = "storefronts" | "products" | "taxonomy" | "locations";

export interface SourcePlan {
  sources: SearchSource[];
  reason: string;
}

export function selectSources(
  intent: SearchIntent,
  vertical?: Vertical | "all"
): SourcePlan {
  switch (intent) {
    case "browse":
      return {
        sources: ["storefronts", "taxonomy"],
        reason: "browsing: show shops + categories",
      };

    case "location":
      return {
        sources: ["storefronts", "locations"],
        reason: "location query: geo-focused results",
      };

    case "category":
      return {
        sources: ["storefronts", "products", "taxonomy"],
        reason: "category query: full catalog search",
      };

    case "lookup":
      return {
        sources: ["storefronts", "products"],
        reason: "name lookup: shops + products by name",
      };

    case "mixed":
      return {
        sources: ["storefronts", "products", "taxonomy", "locations"],
        reason: "mixed query: all sources",
      };

    default:
      return {
        sources: ["storefronts", "products"],
        reason: "default source plan",
      };
  }
}
