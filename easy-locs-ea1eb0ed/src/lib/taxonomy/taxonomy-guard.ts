/**
 * Taxonomy Guard — Validates and enforces canonical taxonomy coherence.
 * Used at write time to prevent incoherent vertical/cluster/subcategory combos.
 */
import type { Vertical } from "@/lib/taxonomy/world-class-taxonomy";
import {
  normalizeVertical,
  normalizeSubcategory,
  getCanonicalVertical,
  getClusterForSubcategory,
} from "./taxonomy-aliases";

export interface TaxonomyValidation {
  valid: boolean;
  vertical: Vertical;
  cluster: string | null;
  subcategory: string | null;
  corrections: string[];
  errors: string[];
}

/**
 * Validates and auto-corrects taxonomy fields.
 * Returns canonical values — always use the returned values for DB writes.
 */
export function validateAndCorrectTaxonomy(
  rawVertical?: string | null,
  rawCluster?: string | null,
  rawSubcategory?: string | null
): TaxonomyValidation {
  const corrections: string[] = [];
  const errors: string[] = [];

  // 1. Normalize vertical
  const vertical = normalizeVertical(rawVertical);
  if (rawVertical && vertical !== rawVertical?.toLowerCase().trim()) {
    corrections.push(`Vertical normalized: "${rawVertical}" → "${vertical}"`);
  }

  const verticalDef = getCanonicalVertical(vertical);
  if (!verticalDef) {
    errors.push(`Unknown vertical: ${vertical}`);
    return { valid: false, vertical, cluster: null, subcategory: null, corrections, errors };
  }

  // 2. Normalize subcategory
  let subcategory: string | null = null;
  if (rawSubcategory) {
    subcategory = normalizeSubcategory(rawSubcategory);
    if (subcategory) {
      const subExists = verticalDef.subcategories.some(s => s.value === subcategory);
      if (!subExists) {
        // Check if it belongs to a different vertical — reject it
        const correctCluster = getClusterForSubcategory(subcategory);
        if (correctCluster) {
          errors.push(`Subcategory "${subcategory}" does not belong to vertical "${vertical}"`);
          subcategory = null;
        } else {
          errors.push(`Unknown subcategory: "${rawSubcategory}"`);
          subcategory = null;
        }
      }
    }
  }

  // 3. Resolve cluster — always canonical, never free text
  let cluster: string | null = null;

  if (subcategory) {
    // Cluster MUST match the subcategory's canonical cluster
    const canonicalCluster = getClusterForSubcategory(subcategory);
    if (canonicalCluster) {
      cluster = canonicalCluster;
      if (rawCluster && rawCluster !== canonicalCluster) {
        corrections.push(`Cluster corrected: "${rawCluster}" → "${canonicalCluster}" (from subcategory)`);
      }
    }
  } else if (rawCluster) {
    // Validate cluster exists in this vertical
    const clusterExists = verticalDef.clusters.some(c => c.value === rawCluster);
    if (clusterExists) {
      cluster = rawCluster;
    } else {
      // Try to find a matching cluster
      const normalized = rawCluster.toLowerCase().trim().replace(/[\s-]+/g, "_");
      const found = verticalDef.clusters.find(c => c.value === normalized);
      if (found) {
        cluster = found.value;
        corrections.push(`Cluster normalized: "${rawCluster}" → "${found.value}"`);
      } else {
        errors.push(`Cluster "${rawCluster}" not found in vertical "${vertical}"`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    vertical,
    cluster,
    subcategory,
    corrections,
    errors,
  };
}

/**
 * Strict taxonomy payload — returns only canonical values for DB insert/update.
 * Call this before any storefront_pages write.
 */
export function canonicalTaxonomyPayload(
  rawVertical?: string | null,
  rawCluster?: string | null,
  rawSubcategory?: string | null
): { vertical: string; cluster: string | null; subcategory: string | null } {
  const result = validateAndCorrectTaxonomy(rawVertical, rawCluster, rawSubcategory);
  return {
    vertical: result.vertical,
    cluster: result.cluster,
    subcategory: result.subcategory,
  };
}
