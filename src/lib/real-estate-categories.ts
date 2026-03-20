/**
 * Real Estate categories for marketplace discovery.
 */
export const REAL_ESTATE_CATEGORIES = [
  { value: "buy", label: "Buy", icon: "🏠", description: "Properties for sale" },
  { value: "rent", label: "Rent", icon: "🔑", description: "Long-term rentals" },
  { value: "short_stay", label: "Short Stay", icon: "🏨", description: "Vacation & short-term rentals" },
  { value: "commercial", label: "Commercial", icon: "🏢", description: "Office & retail spaces" },
] as const;

export type RealEstateCategory = typeof REAL_ESTATE_CATEGORIES[number]["value"];

export const getRealEstateCategoryInfo = (cat: string) =>
  REAL_ESTATE_CATEGORIES.find((c) => c.value === cat) ?? REAL_ESTATE_CATEGORIES[0];

/** Map icon for map markers */
export const REAL_ESTATE_MAP_ICONS: Record<RealEstateCategory, string> = {
  buy: "🏠",
  rent: "🔑",
  short_stay: "🏨",
  commercial: "🏢",
};
