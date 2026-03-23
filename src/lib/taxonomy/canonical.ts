/**
 * BACKWARD COMPATIBILITY — Re-exports from world-class-taxonomy.
 * All new code should import from "@/lib/taxonomy/world-class-taxonomy" directly.
 * @deprecated Use @/lib/taxonomy/world-class-taxonomy instead.
 */
export {
  CANONICAL_VERTICALS,
  VERTICALS,
  RADAR_CATEGORIES,
  ALL_SUBCATEGORY_VALUES,
  normalizeVertical,
  normalizeSubcategory,
  verticalToRadarCategory,
  getCanonicalVertical,
  getCanonicalSubcategory,
  getParentVertical,
  getSubcategoriesForRadarCategory,
  getClustersForVertical,
  getSubcategoriesForVertical,
  getSubcategoriesForCluster,
} from "@/lib/taxonomy/world-class-taxonomy";

export type {
  Vertical,
  RadarMainCategory,
  ServiceMode,
  TimePeriod,
  TaxonomySubcategory,
  TaxonomyCluster,
  TaxonomyVertical,
} from "@/lib/taxonomy/world-class-taxonomy";

// Legacy type aliases for backward compat
export type { TaxonomySubcategory as CanonicalSubcategory } from "@/lib/taxonomy/world-class-taxonomy";
export type { TaxonomyVertical as CanonicalVertical } from "@/lib/taxonomy/world-class-taxonomy";
