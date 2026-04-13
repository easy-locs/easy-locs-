/**
 * Taxonomy Guard — Validates and enforces canonical taxonomy coherence.
 * Used at write time to prevent incoherent vertical/cluster/subcategory combos.
 */
import type { Vertical } from "@/lib/taxonomy/world-class-taxonomy";

let _aliasCache: Awaited<ReturnType<typeof _load>> | null = null;
const _load = () => import("./taxonomy-aliases");
async function aliases() {
  if (!_aliasCache) _aliasCache = await _load();
  return _aliasCache;
}

export interface TaxonomyValidation {
  valid: boolean;
  vertical: Vertical;
  cluster: string | null;
  subcategory: string | null;
  corrections: string[];
  errors: string[];
}

export async function validateAndCorrectTaxonomy(
  rawVertical?: string | null,
  rawCluster?: string | null,
  rawSubcategory?: string | null
): Promise<TaxonomyValidation> {
  const { normalizeVertical, normalizeSubcategory, getCanonicalVertical, getClusterForSubcategory } = await aliases();
  const corrections: string[] = [];
  const errors: string[] = [];

  const vertical = normalizeVertical(rawVertical);
  if (rawVertical && vertical !== rawVertical?.toLowerCase().trim()) {
    corrections.push(`Vertical normalized: "${rawVertical}" → "${vertical}"`);
  }

  const verticalDef = getCanonicalVertical(vertical);
  if (!verticalDef) {
    errors.push(`Unknown vertical: ${vertical}`);
    return { valid: false, vertical, cluster: null, subcategory: null, corrections, errors };
  }

  let subcategory: string | null = null;
  if (rawSubcategory) {
    subcategory = normalizeSubcategory(rawSubcategory);
    if (subcategory) {
      const subExists = verticalDef.subcategories.some(s => s.value === subcategory);
      if (!subExists) {
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

  let cluster: string | null = null;

  if (subcategory) {
    const canonicalCluster = getClusterForSubcategory(subcategory);
    if (canonicalCluster) {
      cluster = canonicalCluster;
      if (rawCluster && rawCluster !== canonicalCluster) {
        corrections.push(`Cluster corrected: "${rawCluster}" → "${canonicalCluster}" (from subcategory)`);
      }
    }
  } else if (rawCluster) {
    const clusterExists = verticalDef.clusters.some(c => c.value === rawCluster);
    if (clusterExists) {
      cluster = rawCluster;
    } else {
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

export async function canonicalTaxonomyPayload(
  rawVertical?: string | null,
  rawCluster?: string | null,
  rawSubcategory?: string | null
): Promise<{ vertical: string; cluster: string | null; subcategory: string | null }> {
  const result = await validateAndCorrectTaxonomy(rawVertical, rawCluster, rawSubcategory);
  return {
    vertical: result.vertical,
    cluster: result.cluster,
    subcategory: result.subcategory,
  };
}
