/**
 * Canonical vertical taxonomy — sourced from storefront_pages data.
 * Single source of truth for all hub pages, radar, search, and map.
 */

export interface SubcategoryDef {
  value: string;
  label: string;
  icon: string;
}

export interface VerticalDef {
  value: string;
  label: string;
  icon: string;
  emoji: string;
  gradient: string;
  seoTitle: string;
  seoDescription: string;
  subcategories: SubcategoryDef[];
}

export const VERTICALS: VerticalDef[] = [
  {
    value: "food",
    label: "Food & Dining",
    icon: "UtensilsCrossed",
    emoji: "🍕",
    gradient: "linear-gradient(135deg, hsl(16 85% 50%), hsl(30 80% 55%))",
    seoTitle: "Food & Restaurants — Order Delivery & Pickup | Easy-Locs",
    seoDescription: "Browse nearby restaurants, order your favourite cuisine and get fast delivery.",
    subcategories: [
      { value: "fast_food", label: "Fast Food", icon: "🍔" },
      { value: "italian", label: "Italian", icon: "🍕" },
      { value: "japanese", label: "Japanese", icon: "🍣" },
      { value: "indian", label: "Indian", icon: "🍛" },
      { value: "chinese", label: "Chinese", icon: "🥡" },
      { value: "lebanese", label: "Lebanese", icon: "🥙" },
      { value: "french", label: "French", icon: "🥐" },
      { value: "turkish", label: "Turkish", icon: "🥘" },
      { value: "arabic", label: "Arabic", icon: "🧆" },
      { value: "american", label: "American", icon: "🌮" },
      { value: "asian", label: "Asian", icon: "🍜" },
      { value: "seafood", label: "Seafood", icon: "🦐" },
      { value: "healthy", label: "Healthy", icon: "🥗" },
      { value: "bakery", label: "Bakery", icon: "🍰" },
      { value: "cafe", label: "Café", icon: "☕" },
      { value: "restaurant", label: "Restaurant", icon: "🍽️" },
    ],
  },
  {
    value: "retail",
    label: "Shops & Retail",
    icon: "ShoppingBag",
    emoji: "🛍️",
    gradient: "linear-gradient(135deg, hsl(270 55% 50%), hsl(290 50% 60%))",
    seoTitle: "Shops & Retail — Browse Local Stores | Easy-Locs",
    seoDescription: "Discover local shops: grocery, fashion, beauty, electronics and more.",
    subcategories: [
      { value: "grocery", label: "Grocery", icon: "🛒" },
      { value: "fashion", label: "Fashion", icon: "👗" },
      { value: "beauty", label: "Beauty", icon: "💄" },
      { value: "furniture", label: "Furniture", icon: "🪑" },
      { value: "hardware", label: "Hardware", icon: "🔩" },
      { value: "luxury", label: "Luxury", icon: "💎" },
      { value: "sports", label: "Sports", icon: "⚽" },
      { value: "variety", label: "Variety", icon: "🏬" },
    ],
  },
  {
    value: "services",
    label: "Services",
    icon: "Wrench",
    emoji: "🔧",
    gradient: "linear-gradient(135deg, hsl(220 70% 45%), hsl(220 60% 60%))",
    seoTitle: "Local Services — Book Professionals Near You | Easy-Locs",
    seoDescription: "Find and book trusted local professionals for cleaning, plumbing, beauty, moving and more.",
    subcategories: [
      { value: "cleaning", label: "Cleaning", icon: "🧹" },
      { value: "plumbing", label: "Plumbing", icon: "🔧" },
      { value: "electrical", label: "Electrical", icon: "⚡" },
      { value: "beauty", label: "Beauty", icon: "💇" },
      { value: "fitness", label: "Fitness", icon: "🏋️" },
      { value: "moving", label: "Moving", icon: "📦" },
      { value: "painting", label: "Painting", icon: "🎨" },
      { value: "ac_repair", label: "AC Repair", icon: "❄️" },
      { value: "auto_repair", label: "Auto Repair", icon: "🔧" },
      { value: "car_wash", label: "Car Wash", icon: "🚗" },
      { value: "education", label: "Education", icon: "📚" },
      { value: "landscaping", label: "Landscaping", icon: "🌿" },
      { value: "legal", label: "Legal", icon: "⚖️" },
      { value: "pet_care", label: "Pet Care", icon: "🐾" },
      { value: "photography", label: "Photography", icon: "📸" },
      { value: "tailoring", label: "Tailoring", icon: "🧵" },
      { value: "tech_repair", label: "Tech Repair", icon: "💻" },
    ],
  },
  {
    value: "real_estate",
    label: "Property",
    icon: "Building2",
    emoji: "🏠",
    gradient: "linear-gradient(135deg, hsl(210 70% 45%), hsl(200 60% 55%))",
    seoTitle: "Property — Buy, Rent & Short Stay | Easy-Locs",
    seoDescription: "Browse properties for sale, rent, or short-term stays in your area.",
    subcategories: [
      { value: "rent", label: "Rent", icon: "🔑" },
      { value: "sale", label: "Buy", icon: "🏠" },
    ],
  },
];

export const getVertical = (v: string) => VERTICALS.find((vt) => vt.value === v);
export const getSubcategoryLabel = (vertical: string, sub: string) => {
  const vt = getVertical(vertical);
  return vt?.subcategories.find((s) => s.value === sub)?.label || sub.replace(/_/g, " ");
};
