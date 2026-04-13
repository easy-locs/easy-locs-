/**
 * BACKWARD COMPATIBILITY — Re-exports from world-class-taxonomy.
 * @deprecated Use @/lib/taxonomy/world-class-taxonomy instead.
 */
export {
  CANONICAL_VERTICALS as VERTICALS,
  getCanonicalVertical as getVertical,
} from "@/lib/taxonomy/world-class-taxonomy";
export type {
  TaxonomyVertical as VerticalDef,
  TaxonomySubcategory as SubcategoryDef,
} from "@/lib/taxonomy/world-class-taxonomy";

import { strictGetCanonicalSubcategory } from "@/lib/taxonomy/world-class-taxonomy";

export function getSubcategoryLabel(vertical: string, sub: string): string {
  const info = strictGetCanonicalSubcategory(sub);
  if (info?.label) return info.label;
  return sub
    .replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}
