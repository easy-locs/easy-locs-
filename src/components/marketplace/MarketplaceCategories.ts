export const MARKETPLACE_CATEGORIES = [
  { value: "cleaning", label: "Cleaning", icon: "🧹" },
  { value: "maintenance", label: "Property Maintenance", icon: "🔧" },
  { value: "transport", label: "Transport", icon: "🚐" },
  { value: "car_rental", label: "Car Rental", icon: "🚗" },
  { value: "tours", label: "Tours & Activities", icon: "🗺️" },
  { value: "airport_transfer", label: "Airport Transfer", icon: "✈️" },
  { value: "personal", label: "Personal Services", icon: "💆" },
  { value: "real_estate", label: "Real Estate", icon: "🏢" },
  { value: "spa", label: "Wellness / Spa", icon: "🧖" },
  { value: "water_sport", label: "Water Sport", icon: "🚤" },
  { value: "restaurant", label: "Restaurant", icon: "🍽️" },
  { value: "coworking", label: "Coworking", icon: "💻" },
  { value: "event", label: "Events / Tickets", icon: "🎫" },
  { value: "other", label: "Other", icon: "📦" },
] as const;

export type MarketplaceCategory = typeof MARKETPLACE_CATEGORIES[number]["value"];

export const PROVIDER_TYPES = [
  { value: "concierge", label: "Concierge Company", icon: "🔑" },
  { value: "agency", label: "Agency", icon: "🏬" },
  { value: "freelancer", label: "Freelancer", icon: "👤" },
  { value: "company", label: "Company", icon: "🏢" },
] as const;

export type ProviderType = typeof PROVIDER_TYPES[number]["value"];

export const getCategoryInfo = (cat: string) =>
  MARKETPLACE_CATEGORIES.find((c) => c.value === cat) || MARKETPLACE_CATEGORIES[MARKETPLACE_CATEGORIES.length - 1];
