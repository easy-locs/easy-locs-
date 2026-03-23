/**
 * Subcategory → Vertical Auto-Mapper
 * Uses the canonical taxonomy to derive the correct vertical from a subcategory.
 * Used at ingestion time AND for bulk correction of misclassified shops.
 */
import { getParentVertical, normalizeVertical, type Vertical } from "./world-class-taxonomy";

/**
 * Hard overrides for subcategories that don't exist in the canonical taxonomy
 * but appear in real-world data (e.g. UAE imports).
 */
const OVERRIDE_MAP: Record<string, Vertical> = {
  // Grocery
  grocery: "grocery",
  supermarket: "grocery",
  organic: "grocery",
  // Shops / Retail
  hardware: "shops",
  furniture: "shops",
  variety: "shops",
  fashion: "shops",
  luxury: "shops",
  retail: "shops",
  electronics: "shops",
  // Property
  rent: "property",
  sale: "property",
  short_stay: "property",
  commercial_lease: "property",
  // Food
  restaurant: "food",
  fast_food: "food",
  cafe: "food",
  bakery: "food",
  // Services (explicit)
  car_wash: "services",
  cleaning: "services",
  plumbing: "services",
  electrical: "services",
  ac_repair: "services",
  tech_repair: "services",
  tailoring: "services",
  photography: "services",
  landscaping: "services",
  moving: "services",
  painting: "services",
  legal: "services",
  fitness: "services",
  pet_care: "services",
  beauty: "services",
  salon: "services",
};

/**
 * Resolve the correct vertical for a given subcategory.
 * Priority: canonical taxonomy lookup → override map → fallback to "services".
 */
export function resolveVerticalFromSubcategory(subcategory: string | null | undefined): Vertical {
  if (!subcategory) return "services";

  const normalized = subcategory.toLowerCase().trim().replace(/[\s-]+/g, "_");

  // 1. Canonical taxonomy lookup (most reliable)
  const parent = getParentVertical(normalized);
  if (parent) return parent.value as Vertical;

  // 2. Override map for non-canonical subcategories
  if (OVERRIDE_MAP[normalized]) return OVERRIDE_MAP[normalized];

  // 3. Conservative fallback
  return "services";
}

/**
 * Batch resolve: given an array of {id, subcategory}, returns corrections needed.
 */
export function batchResolveVerticals(
  items: Array<{ id: string; name: string; subcategory: string | null; currentVertical: string; city: string }>
): Array<{
  id: string;
  name: string;
  city: string;
  subcategory: string | null;
  oldVertical: string;
  newVertical: string;
  changed: boolean;
}> {
  return items.map((item) => {
    const newVertical = resolveVerticalFromSubcategory(item.subcategory);
    return {
      id: item.id,
      name: item.name,
      city: item.city,
      subcategory: item.subcategory,
      oldVertical: item.currentVertical,
      newVertical,
      changed: newVertical !== item.currentVertical,
    };
  });
}
