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
    value: "real_estate",
    label: "Real Estate",
    emoji: "🏠",
    subcategories: [
      { value: "property_sale", label: "Sale", emoji: "🏡" },
      { value: "long_term_rental", label: "Rent", emoji: "📋" },
      { value: "new_development", label: "New Developments", emoji: "🏗️" },
      { value: "seasonal", label: "Seasonal", emoji: "🏖️" },
      { value: "roommate", label: "Roommates", emoji: "🤝" },
      { value: "office_commercial", label: "Commercial", emoji: "🏢" },
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
      { value: "job_hospitality", label: "Hospitality & Tourism", emoji: "🏨" },
      { value: "job_construction", label: "Construction & BTP", emoji: "🏗️" },
      { value: "job_services", label: "Customer Service", emoji: "🛎️" },
      { value: "job_admin", label: "Administration & Office", emoji: "📂" },
      { value: "job_tech", label: "IT & Technology", emoji: "💻" },
      { value: "job_healthcare", label: "Healthcare & Medical", emoji: "🏥" },
      { value: "job_education", label: "Education & Training", emoji: "📚" },
      { value: "job_logistics", label: "Logistics & Transport", emoji: "🚛" },
      { value: "job_sales", label: "Sales & Marketing", emoji: "📈" },
      { value: "job_finance", label: "Finance & Accounting", emoji: "💰" },
      { value: "job_creative", label: "Creative & Design", emoji: "🎨" },
      { value: "job_legal", label: "Legal & Compliance", emoji: "⚖️" },
      { value: "job_real_estate", label: "Real Estate & Property", emoji: "🏠" },
      { value: "job_agriculture", label: "Agriculture & Environment", emoji: "🌾" },
      { value: "freelance", label: "Freelance", emoji: "🧑‍💻" },
      { value: "internship", label: "Internships & Apprentice", emoji: "🎓" },
      { value: "remote_work", label: "Remote Work", emoji: "🌍" },
      { value: "seasonal_job", label: "Seasonal Jobs", emoji: "☀️" },
      { value: "part_time", label: "Part-time", emoji: "⏰" },
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
