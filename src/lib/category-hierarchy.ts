/**
 * Category → Sub-category → Sector hierarchy for the marketplace.
 * Drives the discovery filtering UX.
 */

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

export const CATEGORY_HIERARCHY: CategoryGroup[] = [
  {
    value: "property",
    label: "Real Estate",
    emoji: "🏠",
    subcategories: [
      { value: "seasonal", label: "Vacation Rentals", emoji: "🏖️" },
      { value: "real-estate", label: "Real Estate", emoji: "🏡" },
      { value: "property_management", label: "Property Management", emoji: "🏢" },
      { value: "real_estate_agent", label: "Real Estate Agents", emoji: "🤝" },
      { value: "property_photo", label: "Property Photography", emoji: "📸" },
    ],
  },
  {
    value: "home_services",
    label: "Home Services",
    emoji: "🔧",
    subcategories: [
      { value: "cleaning", label: "Cleaning", emoji: "🧹" },
      { value: "maintenance", label: "Maintenance", emoji: "🔧" },
      { value: "plumbing", label: "Plumbing", emoji: "🚿" },
      { value: "electrical", label: "Electrical", emoji: "⚡" },
      { value: "construction", label: "Renovation", emoji: "🏗️" },
    ],
  },
  {
    value: "concierge",
    label: "Concierge",
    emoji: "🔑",
    subcategories: [
      { value: "private_driver", label: "Private Driver", emoji: "🚘" },
      { value: "airport_transfer", label: "Airport Transfer", emoji: "✈️" },
      { value: "personal_assistant", label: "Personal Assistant", emoji: "👤" },
      { value: "car_rental", label: "Car Rental", emoji: "🚗" },
      { value: "transport", label: "Transport", emoji: "🚐" },
    ],
  },
  {
    value: "experiences",
    label: "Experiences",
    emoji: "🗺️",
    subcategories: [
      { value: "tours", label: "Tours & Activities", emoji: "🗺️" },
      { value: "water_sport", label: "Water Sports", emoji: "🏄" },
      { value: "sports_coach", label: "Sports Coach", emoji: "🏋️" },
      { value: "spa", label: "Wellness & Spa", emoji: "🧖" },
      { value: "event", label: "Events & Tickets", emoji: "🎫" },
    ],
  },
  {
    value: "food_work",
    label: "Food & Workspace",
    emoji: "🍽️",
    subcategories: [
      { value: "restaurant", label: "Restaurant", emoji: "🍽️" },
      { value: "coworking", label: "Coworking", emoji: "💻" },
    ],
  },
  {
    value: "professional",
    label: "Professional Services",
    emoji: "💼",
    subcategories: [
      { value: "legal", label: "Legal & Advocate", emoji: "⚖️" },
      { value: "business_services", label: "Business Services", emoji: "💼" },
      { value: "consulting", label: "Consulting", emoji: "📊" },
      { value: "personal", label: "Personal Services", emoji: "💆" },
    ],
  },
];

/** Flat list of all sub-category values */
export const ALL_SUBCATEGORY_VALUES = CATEGORY_HIERARCHY.flatMap(g => g.subcategories.map(s => s.value));

/** Find which group a subcategory belongs to */
export function getParentGroup(subValue: string): CategoryGroup | undefined {
  return CATEGORY_HIERARCHY.find(g => g.subcategories.some(s => s.value === subValue));
}

/** Get subcategory info */
export function getSubcategoryInfo(value: string): SubCategory | undefined {
  for (const g of CATEGORY_HIERARCHY) {
    const found = g.subcategories.find(s => s.value === value);
    if (found) return found;
  }
  return undefined;
}
