/**
 * taxonomy.category.map — Maps raw categories to canonical taxonomy.
 * Uses unified TaxonomyRegistry as the SOLE alias resolver.
 * Unknown subcategories are hard-rejected (null + needs_review tag).
 * Unknown clusters do NOT fall back to raw category strings.
 * Canonical verticals are returned exactly as resolved (no lossy downcast to "services").
 */
import type { TaxonomyCategoryMapping } from "../contracts";
import type { Vertical } from "../../types";
import { taxonomyRegistry } from "@/lib/taxonomy/taxonomy-registry";
import { guardSubcategory } from "@/lib/taxonomy/vertical-boundary-guard";

/**
 * Input alias normalizer — maps legacy input values to canonical registry keys.
 * "hotel" is a legacy pipeline hint; the canonical registry value is "stay".
 * This is a ONE-WAY INPUT normalizer, not an output downcast.
 */
const INPUT_VERTICAL_ALIAS: Record<string, string> = {
  hotel: "stay",
};

function normalizeInputVertical(v: string): string {
  return INPUT_VERTICAL_ALIAS[v] ?? v;
}

export function mapCategory(
  vertical: Vertical,
  categories: string[],
  subcategories: string[],
): TaxonomyCategoryMapping {
  const canonicalVertical = normalizeInputVertical(vertical);
  const allCats = [...categories, ...subcategories].map((c) => c.trim().toLowerCase());
  const tags = [...new Set([...categories, ...subcategories])];

  let bestResolution = taxonomyRegistry.resolve(null);
  let bestConfidence = 0;
  let bestCluster: string | null = null;
  let bestCanonicalType: string | null = null;
  let resolvedRegistryVertical: Vertical = vertical;
  let flaggedForReview = false;

  for (const cat of allCats) {
    const resolved = taxonomyRegistry.resolve(cat);
    const resolvedV = normalizeInputVertical(resolved.vertical);
    if (resolvedV === canonicalVertical && resolved.confidence > bestConfidence) {
      bestResolution = resolved;
      bestConfidence = resolved.confidence;
      bestCluster = resolved.cluster;
      bestCanonicalType = resolved.canonicalType;
      resolvedRegistryVertical = resolved.vertical as Vertical;
    }
  }

  // Strict subcategory guard — unknown subcategories are hard-rejected.
  // They are NOT resolved through the registry; they become null + needs_review.
  let resolvedSubcategory: string | null = null;

  for (const sub of subcategories) {
    const guardVertical = (resolvedRegistryVertical || vertical) as Parameters<typeof guardSubcategory>[0];
    const guard = guardSubcategory(guardVertical, sub);
    if (!guard.allowed) {
      flaggedForReview = true;
    } else if (!resolvedSubcategory && guard.resolvedSubcategory) {
      resolvedSubcategory = guard.resolvedSubcategory;
    }
  }

  // If no subcategory passed the guard but we have a canonical type from the
  // registry, validate it through the guard before accepting it.
  if (!resolvedSubcategory && bestCanonicalType) {
    const guardVertical = (resolvedRegistryVertical || vertical) as Parameters<typeof guardSubcategory>[0];
    const guardCheck = guardSubcategory(guardVertical, bestCanonicalType);
    if (guardCheck.allowed) {
      resolvedSubcategory = guardCheck.resolvedSubcategory;
    } else {
      flaggedForReview = true;
    }
  }

  // Cluster is required for a confident mapping.
  // If the registry could not resolve a cluster, flag for review.
  if (bestCluster === null) {
    flaggedForReview = true;
  }

  // Confidence rules:
  //   - Unknown resolution (source === "unknown"): 0.10
  //   - flaggedForReview (ANY reason: unknown subcategory, cluster-missing, etc.):
  //     hard-cap at 0.35 — well below the 0.70 publish gate threshold.
  //     This means an unknown subcategory ALONE blocks publish even if the cluster
  //     resolved from other category text at high confidence.
  //   - Clean mapping (cluster + subcategory both resolved): full registry confidence
  let finalConfidence = bestConfidence > 0 ? bestConfidence : 0.10;
  if (flaggedForReview) {
    finalConfidence = Math.min(finalConfidence, 0.35);
  }

  // Return the exact canonical vertical from the registry (no lossy downcast).
  // If the registry returned "unknown" source, fall back to the hint vertical.
  const outputVertical: Vertical =
    bestResolution.source !== "unknown"
      ? (resolvedRegistryVertical || vertical)
      : vertical;

  return {
    vertical: outputVertical,
    // Only use a cluster if the registry resolved one — never fall back to raw categories[0].
    category: bestCluster ?? null,
    subcategory: resolvedSubcategory,
    tags: [...tags, ...(flaggedForReview ? ["needs_review"] : [])],
    confidence: finalConfidence,
  };
}
