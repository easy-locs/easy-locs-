/**
 * BACKWARD COMPATIBILITY — Re-exports from canonical taxonomy.
 * All new code should import from "@/lib/taxonomy/canonical" directly.
 * @deprecated Use @/lib/taxonomy/canonical instead.
 */
import {
  CANONICAL_VERTICALS,
  getCanonicalSubcategory,
  getParentVertical,
  ALL_SUBCATEGORY_VALUES as CANONICAL_ALL_SUBS,
} from "@/lib/taxonomy/canonical";
import type { CanonicalSubcategory, CanonicalVertical } from "@/lib/taxonomy/canonical";

export interface SubCategory {
  value: string;
  label: string;
  emoji: string;
}

export interface CategoryGroup {
  value: string;
  label: string;
  emoji: string;
  subcategories: SubCategory[];
}

/** Maps canonical verticals → old CATEGORY_HIERARCHY format for backward compat */
export const CATEGORY_HIERARCHY: CategoryGroup[] = CANONICAL_VERTICALS.map((v) => ({
  value: v.value,
  label: v.label,
  emoji: v.emoji,
  subcategories: v.subcategories.map((s) => ({
    value: s.value,
    label: s.label,
    emoji: s.emoji,
  })),
}));

export const ALL_SUBCATEGORY_VALUES = CANONICAL_ALL_SUBS;

export function getParentGroup(subValue: string): CategoryGroup | undefined {
  const parent = getParentVertical(subValue);
  if (!parent) return undefined;
  return CATEGORY_HIERARCHY.find((g) => g.value === parent.value);
}

export function getSubcategoryInfo(value: string): SubCategory | undefined {
  const found = getCanonicalSubcategory(value);
  if (!found) return undefined;
  return { value: found.value, label: found.label, emoji: found.emoji };
}
