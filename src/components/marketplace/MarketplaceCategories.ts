/**
 * MarketplaceCategories — Derived from canonical category-tree.
 * @deprecated Use @/lib/taxonomy/category-tree instead for new code.
 */
import { CATEGORY_TREE } from "@/lib/taxonomy/category-tree";

// Build marketplace categories from canonical tree (flatten subcategories)
export const MARKETPLACE_CATEGORIES = CATEGORY_TREE.flatMap(primary =>
  primary.subcategories.map(sub => ({
    value: sub.value,
    label: sub.label,
    icon: sub.emoji,
    group: primary.label,
  }))
);

export type MarketplaceCategory = string;

export const CATEGORY_GROUPS = CATEGORY_TREE.map(c => c.label);

export function getCategoriesByGroup(group: string) {
  return MARKETPLACE_CATEGORIES.filter(c => c.group === group);
}

export const PROVIDER_TYPES = [
  { value: "concierge", label: "Concierge", icon: "🔑" },
  { value: "agency", label: "Agency", icon: "🏬" },
  { value: "freelancer", label: "Freelancer", icon: "👤" },
  { value: "company", label: "Company", icon: "🏢" },
] as const;

export type ProviderType = typeof PROVIDER_TYPES[number]["value"];

export const getCategoryInfo = (cat: string) =>
  MARKETPLACE_CATEGORIES.find((c) => c.value === cat) || { value: cat, label: cat, icon: "📦", group: "Other" };
