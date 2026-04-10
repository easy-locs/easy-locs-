import type { RadarVertical } from "./radar-result-item";

export type FilterType = "chip" | "range" | "toggle" | "select" | "date_range";

export interface FilterOption {
  value: string;
  label: string;
  emoji?: string;
}

export interface RadarFilterDef {
  id: string;
  label: string;
  type: FilterType;
  options?: FilterOption[];
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: unknown;
}

export type RadarFilterValues = Record<string, unknown>;

const COMMON_FILTERS: RadarFilterDef[] = [
  { id: "open_now", label: "Open now", type: "toggle", defaultValue: false },
  { id: "rating_min", label: "Rating", type: "range", min: 0, max: 5, step: 0.5, defaultValue: 0 },
  { id: "distance_max", label: "Distance", type: "select", options: [
    { value: "1", label: "1 km" }, { value: "3", label: "3 km" },
    { value: "5", label: "5 km" }, { value: "10", label: "10 km" },
    { value: "25", label: "25 km" }, { value: "any", label: "Any" },
  ], defaultValue: "5" },
];

const FOOD_FILTERS: RadarFilterDef[] = [
  ...COMMON_FILTERS,
  { id: "cuisine", label: "Cuisine", type: "chip", options: [
    { value: "italian", label: "Italian", emoji: "🍝" },
    { value: "japanese", label: "Japanese", emoji: "🍣" },
    { value: "indian", label: "Indian", emoji: "🍛" },
    { value: "chinese", label: "Chinese", emoji: "🥡" },
    { value: "french", label: "French", emoji: "🥐" },
    { value: "mexican", label: "Mexican", emoji: "🌮" },
    { value: "thai", label: "Thai", emoji: "🍜" },
    { value: "lebanese", label: "Lebanese", emoji: "🧆" },
    { value: "american", label: "American", emoji: "🍔" },
    { value: "korean", label: "Korean", emoji: "🥘" },
  ]},
  { id: "price_level", label: "Price", type: "chip", options: [
    { value: "1", label: "$", emoji: "" },
    { value: "2", label: "$$", emoji: "" },
    { value: "3", label: "$$$", emoji: "" },
    { value: "4", label: "$$$$", emoji: "" },
  ]},
  { id: "delivery", label: "Delivery", type: "toggle", defaultValue: false },
  { id: "dine_in", label: "Dine-in", type: "toggle", defaultValue: false },
];

const HOTEL_FILTERS: RadarFilterDef[] = [
  ...COMMON_FILTERS,
  { id: "stars", label: "Stars", type: "chip", options: [
    { value: "3", label: "3★" }, { value: "4", label: "4★" }, { value: "5", label: "5★" },
  ]},
  { id: "budget_max", label: "Budget/night", type: "select", options: [
    { value: "100", label: "< $100" }, { value: "200", label: "< $200" },
    { value: "500", label: "< $500" }, { value: "1000", label: "< $1000" },
    { value: "any", label: "Any" },
  ], defaultValue: "any" },
  { id: "hotel_type", label: "Type", type: "chip", options: [
    { value: "hotel", label: "Hotel", emoji: "🏨" },
    { value: "resort", label: "Resort", emoji: "🏖️" },
    { value: "hostel", label: "Hostel", emoji: "🛏️" },
    { value: "apartment", label: "Apart", emoji: "🏢" },
    { value: "villa", label: "Villa", emoji: "🏡" },
  ]},
  { id: "pool", label: "Pool", type: "toggle", defaultValue: false },
  { id: "breakfast", label: "Breakfast", type: "toggle", defaultValue: false },
];

const PROPERTY_FILTERS: RadarFilterDef[] = [
  { id: "listing_type", label: "Type", type: "chip", options: [
    { value: "buy", label: "Buy", emoji: "🏠" },
    { value: "rent", label: "Rent", emoji: "🔑" },
  ]},
  { id: "budget_max", label: "Budget", type: "select", options: [
    { value: "500", label: "< $500/m" }, { value: "1000", label: "< $1K/m" },
    { value: "3000", label: "< $3K/m" }, { value: "5000", label: "< $5K/m" },
    { value: "any", label: "Any" },
  ], defaultValue: "any" },
  { id: "bedrooms", label: "Bedrooms", type: "chip", options: [
    { value: "studio", label: "Studio" }, { value: "1", label: "1" },
    { value: "2", label: "2" }, { value: "3", label: "3" }, { value: "4+", label: "4+" },
  ]},
  { id: "furnished", label: "Furnished", type: "toggle", defaultValue: false },
  { id: "rating_min", label: "Rating", type: "range", min: 0, max: 5, step: 0.5, defaultValue: 0 },
];

const SERVICE_FILTERS: RadarFilterDef[] = [
  ...COMMON_FILTERS,
  { id: "urgency", label: "Urgency", type: "chip", options: [
    { value: "normal", label: "Normal" },
    { value: "today", label: "Today" },
    { value: "urgent", label: "Urgent", emoji: "⚡" },
  ]},
  { id: "availability", label: "Availability", type: "chip", options: [
    { value: "available_now", label: "Now" },
    { value: "available_today", label: "Today" },
    { value: "available_week", label: "This week" },
  ]},
  { id: "price_level", label: "Price", type: "chip", options: [
    { value: "1", label: "$" }, { value: "2", label: "$$" },
    { value: "3", label: "$$$" }, { value: "4", label: "$$$$" },
  ]},
];

const SHOP_FILTERS: RadarFilterDef[] = [
  ...COMMON_FILTERS,
  { id: "shop_type", label: "Type", type: "chip", options: [
    { value: "fashion", label: "Fashion", emoji: "👗" },
    { value: "electronics", label: "Electronics", emoji: "📱" },
    { value: "home", label: "Home", emoji: "🏠" },
    { value: "beauty", label: "Beauty", emoji: "💄" },
    { value: "sports", label: "Sports", emoji: "⚽" },
  ]},
  { id: "price_level", label: "Price", type: "chip", options: [
    { value: "1", label: "$" }, { value: "2", label: "$$" },
    { value: "3", label: "$$$" }, { value: "4", label: "$$$$" },
  ]},
];

const TAXI_FILTERS: RadarFilterDef[] = [
  { id: "vehicle_type", label: "Vehicle", type: "chip", options: [
    { value: "economy", label: "Economy", emoji: "🚗" },
    { value: "comfort", label: "Comfort", emoji: "🚙" },
    { value: "premium", label: "Premium", emoji: "🏎️" },
    { value: "xl", label: "XL", emoji: "🚐" },
  ]},
  { id: "eta_max", label: "ETA", type: "select", options: [
    { value: "5", label: "< 5 min" }, { value: "10", label: "< 10 min" },
    { value: "15", label: "< 15 min" }, { value: "any", label: "Any" },
  ], defaultValue: "any" },
];

const HEALTHCARE_FILTERS: RadarFilterDef[] = [
  ...COMMON_FILTERS,
  { id: "specialty", label: "Specialty", type: "chip", options: [
    { value: "general", label: "General", emoji: "🩺" },
    { value: "dental", label: "Dental", emoji: "🦷" },
    { value: "eye", label: "Eye", emoji: "👁️" },
    { value: "pharmacy", label: "Pharmacy", emoji: "💊" },
    { value: "lab", label: "Lab", emoji: "🔬" },
  ]},
  { id: "availability", label: "Availability", type: "chip", options: [
    { value: "available_now", label: "Now" },
    { value: "available_today", label: "Today" },
  ]},
];

const VERTICAL_FILTER_MAP: Record<RadarVertical, RadarFilterDef[]> = {
  food: FOOD_FILTERS,
  hotel: HOTEL_FILTERS,
  property: PROPERTY_FILTERS,
  services: SERVICE_FILTERS,
  shops: SHOP_FILTERS,
  taxi: TAXI_FILTERS,
  healthcare: HEALTHCARE_FILTERS,
  nightlife: FOOD_FILTERS,
  grocery: FOOD_FILTERS,
};

export function getFiltersForVertical(vertical: RadarVertical): RadarFilterDef[] {
  return VERTICAL_FILTER_MAP[vertical] ?? COMMON_FILTERS;
}

export function getDefaultFilterValues(vertical: RadarVertical): RadarFilterValues {
  const defs = getFiltersForVertical(vertical);
  const values: RadarFilterValues = {};
  for (const def of defs) {
    if (def.defaultValue !== undefined) {
      values[def.id] = def.defaultValue;
    }
  }
  return values;
}
