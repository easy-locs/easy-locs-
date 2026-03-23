/**
 * BACKWARD COMPATIBILITY — Re-exports from world-class-taxonomy.
 * @deprecated Use @/lib/taxonomy/world-class-taxonomy instead.
 */
import {
  CANONICAL_VERTICALS,
  ALL_SUBCATEGORY_VALUES as CANONICAL_ALL_SUBS,
  getCanonicalSubcategory,
  getParentVertical,
} from "@/lib/taxonomy/world-class-taxonomy";

export type SubCategory = {
  value: string;
  label: string;
  emoji: string;
};

export type CategoryGroup = {
  value: string;
  label: string;
  emoji: string;
  subcategories: SubCategory[];
};

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
  return {
    value: found.value,
    label: found.label,
    emoji: found.emoji,
  };
}
