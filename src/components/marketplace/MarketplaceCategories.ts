export const MARKETPLACE_CATEGORIES = [
  { value: "cleaning", label: "Cleaning", icon: "🧹" },
  { value: "maintenance", label: "Property Maintenance", icon: "🔧" },
  { value: "concierge", label: "Concierge", icon: "🔑" },
  { value: "car_rental", label: "Car Rental", icon: "🚗" },
  { value: "tours", label: "Tours & Activities", icon: "🗺️" },
  { value: "airport_transfer", label: "Airport Transfer", icon: "✈️" },
  { value: "personal", label: "Personal Services", icon: "💆" },
  { value: "real_estate", label: "Real Estate Agency", icon: "🏢" },
  { value: "experience", label: "Experience", icon: "🌟" },
  { value: "adventure", label: "Adventure", icon: "🏜️" },
  { value: "water_sport", label: "Water Sport", icon: "🚤" },
  { value: "city_tour", label: "City Tour", icon: "🏛️" },
  { value: "restaurant", label: "Restaurant", icon: "🍽️" },
  { value: "spa", label: "Spa & Wellness", icon: "🧖" },
  { value: "coworking", label: "Coworking", icon: "💻" },
  { value: "event", label: "Event / Tickets", icon: "🎫" },
  { value: "other", label: "Other", icon: "📦" },
] as const;

export type MarketplaceCategory = typeof MARKETPLACE_CATEGORIES[number]["value"];

export const getCategoryInfo = (cat: string) =>
  MARKETPLACE_CATEGORIES.find((c) => c.value === cat) || MARKETPLACE_CATEGORIES[MARKETPLACE_CATEGORIES.length - 1];
