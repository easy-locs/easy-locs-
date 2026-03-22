/**
 * MarketplaceCategories — Smart, customer-friendly grouping.
 * Ordered by frequency of use: most popular first.
 */
export const MARKETPLACE_CATEGORIES = [
  // 🚗 Mobility — most searched
  { value: "car_rental", label: "Car Rental", icon: "🚗", group: "Mobility" },
  { value: "airport_transfer", label: "Airport Transfer", icon: "✈️", group: "Mobility" },
  { value: "transport", label: "Transport", icon: "🚐", group: "Mobility" },

  // 🏠 Property — high value
  { value: "real_estate_buy", label: "Buy Property", icon: "🏠", group: "Property" },
  { value: "real_estate_rent", label: "Rent", icon: "🔑", group: "Property" },
  { value: "real_estate_short_stay", label: "Short Stay", icon: "🏨", group: "Property" },
  { value: "real_estate_commercial", label: "Commercial", icon: "🏢", group: "Property" },

  // 🍽️ Food & Lifestyle
  { value: "restaurant", label: "Restaurant", icon: "🍽️", group: "Food & Lifestyle" },
  { value: "spa", label: "Wellness / Spa", icon: "🧖", group: "Food & Lifestyle" },
  { value: "personal", label: "Personal Services", icon: "💆", group: "Food & Lifestyle" },

  // 🗺️ Experiences
  { value: "tours", label: "Tours & Activities", icon: "🗺️", group: "Experiences" },
  { value: "water_sport", label: "Water Sport", icon: "🚤", group: "Experiences" },
  { value: "sports_coach", label: "Sports Coach", icon: "🏋️", group: "Experiences" },
  { value: "event", label: "Events / Tickets", icon: "🎫", group: "Experiences" },

  // 🏗️ Home Services
  { value: "cleaning", label: "Cleaning", icon: "🧹", group: "Home Services" },
  { value: "maintenance", label: "Maintenance", icon: "🔧", group: "Home Services" },
  { value: "construction", label: "Renovation", icon: "🏗️", group: "Home Services" },

  // 💼 Professional
  { value: "coworking", label: "Coworking", icon: "💻", group: "Professional" },
  { value: "legal", label: "Legal", icon: "⚖️", group: "Professional" },
  { value: "business_services", label: "Business Services", icon: "💼", group: "Professional" },
  { value: "consulting", label: "Consulting", icon: "📊", group: "Professional" },

  // 📦 Other
  { value: "other", label: "Other", icon: "📦", group: "Other" },
] as const;

export type MarketplaceCategory = typeof MARKETPLACE_CATEGORIES[number]["value"];

/** Get unique groups in display order */
export const CATEGORY_GROUPS = [...new Set(MARKETPLACE_CATEGORIES.map(c => c.group))];

/** Get categories by group */
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
  MARKETPLACE_CATEGORIES.find((c) => c.value === cat) || MARKETPLACE_CATEGORIES[MARKETPLACE_CATEGORIES.length - 1];
