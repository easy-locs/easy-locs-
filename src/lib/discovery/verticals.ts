/**
 * BACKWARD COMPATIBILITY — Re-exports from canonical taxonomy.
 * All new code should import from "@/lib/taxonomy/canonical" directly.
 * @deprecated Use @/lib/taxonomy/canonical instead.
 */
export {
  CANONICAL_VERTICALS as VERTICALS,
  getCanonicalVertical as getVertical,
} from "@/lib/taxonomy/canonical";
export type { CanonicalVertical as VerticalDef, CanonicalSubcategory as SubcategoryDef } from "@/lib/taxonomy/canonical";

import { getCanonicalSubcategory } from "@/lib/taxonomy/canonical";

export function getSubcategoryLabel(vertical: string, sub: string): string {
  const info = getCanonicalSubcategory(sub);
  return info?.label || sub.replace(/_/g, " ");
}
