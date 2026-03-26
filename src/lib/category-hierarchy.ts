/**
 * BACKWARD COMPATIBILITY — Re-exports from canonical category-tree.
 * @deprecated Use @/lib/taxonomy/category-tree instead.
 */
import { CATEGORY_TREE, resolveSubcategory } from "@/lib/taxonomy/category-tree";

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

export const CATEGORY_HIERARCHY: CategoryGroup[] = CATEGORY_TREE.map((c) => ({
  value: c.vertical,
  label: c.label,
  emoji: c.emoji,
  subcategories: c.subcategories.map((s) => ({
    value: s.value,
    label: s.label,
    emoji: s.emoji,
  })),
}));

export const ALL_SUBCATEGORY_VALUES = CATEGORY_TREE.flatMap(c => c.subcategories.map(s => s.value));

export function getParentGroup(subValue: string): CategoryGroup | undefined {
  const resolved = resolveSubcategory(subValue);
  if (!resolved) return undefined;
  return CATEGORY_HIERARCHY.find((g) => g.value === resolved.primary.vertical);
}

export function getSubcategoryInfo(value: string): SubCategory | undefined {
  const resolved = resolveSubcategory(value);
  if (!resolved) return undefined;
  return {
    value: resolved.subcategory.value,
    label: resolved.subcategory.label,
    emoji: resolved.subcategory.emoji,
  };
}
