export const MARKETPLACE_CATEGORIES = [
  // Property & Home
  { value: "cleaning", label: "Cleaning", icon: "🧹" },
  { value: "maintenance", label: "Property Maintenance", icon: "🔧" },
  { value: "construction", label: "Construction / Renovation", icon: "🏗️" },
  // Transport
  { value: "transport", label: "Transport", icon: "🚐" },
  { value: "car_rental", label: "Car Rental", icon: "🚗" },
  { value: "airport_transfer", label: "Airport Transfer", icon: "✈️" },
  // Experiences
  { value: "tours", label: "Tours & Activities", icon: "🗺️" },
  { value: "water_sport", label: "Water Sport", icon: "🚤" },
  { value: "spa", label: "Wellness / Spa", icon: "🧖" },
  { value: "sports_coach", label: "Sports Coach", icon: "🏋️" },
  // Food & Workspace
  { value: "restaurant", label: "Restaurant", icon: "🍽️" },
  { value: "coworking", label: "Coworking", icon: "💻" },
  // Professional Services
  { value: "legal", label: "Legal / Advocate", icon: "⚖️" },
  { value: "business_services", label: "Business Services", icon: "💼" },
  { value: "consulting", label: "Professional Consulting", icon: "📊" },
  { value: "personal", label: "Personal Services", icon: "💆" },
  // Events & Other
  { value: "event", label: "Events / Tickets", icon: "🎫" },
  // Real Estate
  { value: "real_estate_buy", label: "Buy Property", icon: "🏠" },
  { value: "real_estate_rent", label: "Rent", icon: "🔑" },
  { value: "real_estate_short_stay", label: "Short Stay", icon: "🏨" },
  { value: "real_estate_commercial", label: "Commercial", icon: "🏢" },
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
