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
    value: "property_sale",
    label: "Sale",
    emoji: "🏡",
    subcategories: [
      { value: "property_sale", label: "Property Sales", emoji: "🏡" },
      { value: "new_development", label: "New Developments", emoji: "🏗️" },
      { value: "office_commercial_sale", label: "Commercial Sales", emoji: "🏢" },
    ],
  },
  {
    value: "property_rent",
    label: "Rent",
    emoji: "📋",
    subcategories: [
      { value: "long_term_rental", label: "Long-term Rentals", emoji: "📋" },
      { value: "seasonal", label: "Seasonal Rentals", emoji: "🏖️" },
      { value: "roommate", label: "Roommates", emoji: "🤝" },
      { value: "office_commercial", label: "Offices & Commercial", emoji: "🏢" },
    ],
  },
  {
    value: "home_services",
    label: "Services",
    emoji: "🔧",
    subcategories: [
      { value: "cleaning", label: "Cleaning", emoji: "🧹" },
      { value: "maintenance", label: "Maintenance", emoji: "🔧" },
      { value: "plumbing", label: "Plumbing", emoji: "🚿" },
      { value: "electrical", label: "Electrical", emoji: "⚡" },
      { value: "construction", label: "Renovation", emoji: "🏗️" },
      { value: "moving", label: "Moving", emoji: "🚛" },
      { value: "personal", label: "Personal Services", emoji: "💆" },
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
    label: "Activities",
    emoji: "🗺️",
    subcategories: [
      { value: "tours", label: "Tourism & Tours", emoji: "🗺️" },
      { value: "water_sport", label: "Water Sports", emoji: "🏄" },
      { value: "sports_coach", label: "Sports Coach", emoji: "🏋️" },
      { value: "spa", label: "Wellness & Spa", emoji: "🧖" },
      { value: "event", label: "Events & Tickets", emoji: "🎫" },
      { value: "local_activity", label: "Local Activities", emoji: "🎭" },
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
    ],
  },
  {
    value: "jobs",
    label: "Jobs & Freelance",
    emoji: "📋",
    subcategories: [
      { value: "job_hospitality", label: "Hospitality", emoji: "🏨" },
      { value: "job_construction", label: "Construction", emoji: "🏗️" },
      { value: "job_services", label: "Services", emoji: "🛎️" },
      { value: "job_admin", label: "Administration", emoji: "📂" },
      { value: "freelance", label: "Freelance", emoji: "🧑‍💻" },
      { value: "internship", label: "Internships", emoji: "🎓" },
      { value: "remote_work", label: "Remote Work", emoji: "🌍" },
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
