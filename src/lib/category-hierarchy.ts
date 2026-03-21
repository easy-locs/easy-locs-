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
      { value: "gardening", label: "Gardening", emoji: "🌱" },
      { value: "pest_control", label: "Pest Control", emoji: "🐛" },
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
      { value: "luxury_concierge", label: "Luxury Concierge", emoji: "💎" },
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
      { value: "outdoor", label: "Outdoor & Adventure", emoji: "🧗" },
    ],
  },
  {
    value: "food_work",
    label: "Food & Workspace",
    emoji: "🍽️",
    subcategories: [
      { value: "restaurant", label: "Restaurant", emoji: "🍽️" },
      { value: "coworking", label: "Coworking", emoji: "💻" },
      { value: "catering", label: "Catering", emoji: "🍴" },
      { value: "private_chef", label: "Private Chef", emoji: "👨‍🍳" },
    ],
  },
  {
    value: "mobility",
    label: "Mobility",
    emoji: "🚕",
    subcategories: [
      { value: "taxi", label: "Taxi", emoji: "🚕" },
      { value: "private_driver", label: "Private Driver", emoji: "🚘" },
      { value: "airport_transfer", label: "Airport Transfer", emoji: "✈️" },
      { value: "transport", label: "Transport", emoji: "🚐" },
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
      { value: "accounting", label: "Accounting & Tax", emoji: "🧮" },
      { value: "insurance", label: "Insurance", emoji: "🛡️" },
      { value: "translation", label: "Translation", emoji: "🌐" },
    ],
  },
  {
    value: "jobs",
    label: "Jobs & Freelance",
    emoji: "📋",
    subcategories: [
      // ── Hospitality & Tourism ──
      { value: "job_hospitality", label: "Hospitality & Tourism", emoji: "🏨" },
      { value: "job_services", label: "Customer Service", emoji: "🛎️" },
      // ── Construction & Technical ──
      { value: "job_construction", label: "Construction & BTP", emoji: "🏗️" },
      { value: "job_engineering", label: "Engineering", emoji: "⚙️" },
      // ── Office & Business ──
      { value: "job_admin", label: "Administration & Office", emoji: "📂" },
      { value: "job_finance", label: "Finance & Accounting", emoji: "💰" },
      { value: "job_sales", label: "Sales & Marketing", emoji: "📈" },
      { value: "job_hr", label: "Human Resources", emoji: "👥" },
      // ── Tech & Creative ──
      { value: "job_tech", label: "IT & Technology", emoji: "💻" },
      { value: "job_creative", label: "Creative & Design", emoji: "🎨" },
      { value: "job_data", label: "Data & Analytics", emoji: "📊" },
      // ── Healthcare & Education ──
      { value: "job_healthcare", label: "Healthcare & Medical", emoji: "🏥" },
      { value: "job_education", label: "Education & Training", emoji: "📚" },
      // ── Logistics & Real Estate ──
      { value: "job_logistics", label: "Logistics & Transport", emoji: "🚛" },
      { value: "job_real_estate", label: "Real Estate & Property", emoji: "🏠" },
      // ── Legal & Agriculture ──
      { value: "job_legal", label: "Legal & Compliance", emoji: "⚖️" },
      { value: "job_agriculture", label: "Agriculture & Environment", emoji: "🌾" },
      // ── Work Types ──
      { value: "freelance", label: "Freelance", emoji: "🧑‍💻" },
      { value: "internship", label: "Internships & Apprentice", emoji: "🎓" },
      { value: "remote_work", label: "Remote Work", emoji: "🌍" },
      { value: "seasonal_job", label: "Seasonal Jobs", emoji: "☀️" },
      { value: "part_time", label: "Part-time", emoji: "⏰" },
      { value: "executive", label: "Executive & Management", emoji: "🎩" },
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
