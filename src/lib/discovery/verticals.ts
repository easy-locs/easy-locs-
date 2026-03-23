/**
 * Canonical vertical taxonomy — sourced from storefront_pages data.
 * Single source of truth for all hub pages, radar, search, and map.
 * Expanded with Careem-style categories for full super-app coverage.
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
      { value: "dineout", label: "Dine Out", icon: "🍷" },
    ],
  },
  {
    value: "grocery",
    label: "Grocery & Market",
    icon: "ShoppingCart",
    emoji: "🛒",
    gradient: "linear-gradient(135deg, hsl(120 50% 40%), hsl(140 55% 50%))",
    seoTitle: "Grocery & Market — Fresh Delivery | Easy-Locs",
    seoDescription: "Order fresh fruits, vegetables, dairy, bakery and household essentials delivered to your door.",
    subcategories: [
      { value: "fruits", label: "Fruits", icon: "🍌" },
      { value: "vegetables", label: "Vegetables", icon: "🥬" },
      { value: "dairy", label: "Milk & Yogurt", icon: "🥛" },
      { value: "cheese_butter", label: "Cheese & Butter", icon: "🧈" },
      { value: "beverages", label: "Beverages", icon: "🥤" },
      { value: "water", label: "Water", icon: "💧" },
      { value: "bakery_grocery", label: "Bakery", icon: "🍞" },
      { value: "meat_seafood", label: "Meat & Seafood", icon: "🥩" },
      { value: "eggs", label: "Eggs", icon: "🥚" },
      { value: "frozen", label: "Frozen", icon: "🧊" },
      { value: "snacks", label: "Snacks", icon: "🍿" },
      { value: "baby", label: "Baby Essentials", icon: "🍼" },
      { value: "household", label: "Household", icon: "🧹" },
      { value: "personal_hygiene", label: "Personal Hygiene", icon: "🧴" },
      { value: "ready_to_eat", label: "Ready to Eat", icon: "🥡" },
      { value: "organic", label: "Organic & Specialty", icon: "🌿" },
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
      { value: "fashion", label: "Fashion", icon: "👗" },
      { value: "beauty", label: "Beauty", icon: "💄" },
      { value: "furniture", label: "Furniture", icon: "🪑" },
      { value: "hardware", label: "Hardware", icon: "🔩" },
      { value: "luxury", label: "Luxury", icon: "💎" },
      { value: "sports", label: "Sports", icon: "⚽" },
      { value: "toys", label: "Toys & Games", icon: "🧸" },
      { value: "stationery", label: "Stationery", icon: "📝" },
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
      { value: "beauty", label: "Beauty & Spa", icon: "💇" },
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
      { value: "laundry", label: "Laundry", icon: "👔" },
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
      { value: "commercial", label: "Commercial", icon: "🏢" },
    ],
  },
  {
    value: "healthcare",
    label: "Healthcare",
    icon: "Heart",
    emoji: "💊",
    gradient: "linear-gradient(135deg, hsl(160 60% 40%), hsl(170 55% 50%))",
    seoTitle: "Healthcare — Medical Services Near You | Easy-Locs",
    seoDescription: "Find pharmacies, clinics, lab tests at home, and wellness services in your area.",
    subcategories: [
      { value: "pharmacy", label: "Pharmacy", icon: "💊" },
      { value: "lab_tests", label: "Lab Tests", icon: "🧪" },
      { value: "clinic", label: "Clinics", icon: "🏥" },
      { value: "dental", label: "Dental", icon: "🦷" },
      { value: "optician", label: "Optician", icon: "👓" },
      { value: "wellness", label: "Wellness", icon: "🧘" },
      { value: "iv_therapy", label: "IV Therapy", icon: "💉" },
    ],
  },
  {
    value: "electronics",
    label: "Electronics",
    icon: "Smartphone",
    emoji: "📱",
    gradient: "linear-gradient(135deg, hsl(220 60% 35%), hsl(240 50% 45%))",
    seoTitle: "Electronics — Gadgets & Tech Deals | Easy-Locs",
    seoDescription: "Shop smartphones, laptops, gaming, home appliances and accessories.",
    subcategories: [
      { value: "phones", label: "Phones", icon: "📱" },
      { value: "laptops", label: "Laptops", icon: "💻" },
      { value: "gaming", label: "Gaming", icon: "🎮" },
      { value: "tech_accessories", label: "Accessories", icon: "🎧" },
      { value: "home_appliances", label: "Appliances", icon: "🔌" },
      { value: "tablets", label: "Tablets", icon: "📱" },
      { value: "smart_home", label: "Smart Home", icon: "🏠" },
    ],
  },
  {
    value: "gifts",
    label: "Gifts & Flowers",
    icon: "Gift",
    emoji: "🎁",
    gradient: "linear-gradient(135deg, hsl(340 65% 50%), hsl(350 60% 60%))",
    seoTitle: "Gifts & Flowers — Send Love | Easy-Locs",
    seoDescription: "Send flowers, gift cards, chocolates, and personalized gifts to loved ones.",
    subcategories: [
      { value: "flowers", label: "Flowers", icon: "🌹" },
      { value: "chocolates", label: "Chocolates", icon: "🍫" },
      { value: "gift_cards", label: "Gift Cards", icon: "🎁" },
      { value: "cakes", label: "Cakes", icon: "🎂" },
      { value: "personalized", label: "Personalized", icon: "✨" },
    ],
  },
  {
    value: "pets",
    label: "Pet Supplies",
    icon: "Dog",
    emoji: "🐾",
    gradient: "linear-gradient(135deg, hsl(30 70% 50%), hsl(40 65% 55%))",
    seoTitle: "Pet Supplies — Food & Accessories | Easy-Locs",
    seoDescription: "Shop pet food, accessories, grooming and vet services for your furry friends.",
    subcategories: [
      { value: "pet_food", label: "Pet Food", icon: "🦴" },
      { value: "pet_grooming", label: "Grooming", icon: "✂️" },
      { value: "pet_accessories", label: "Accessories", icon: "🎾" },
      { value: "vet", label: "Vet Services", icon: "🩺" },
    ],
  },
];

export const getVertical = (v: string) => VERTICALS.find((vt) => vt.value === v);
export const getSubcategoryLabel = (vertical: string, sub: string) => {
  const vt = getVertical(vertical);
  return vt?.subcategories.find((s) => s.value === sub)?.label || sub.replace(/_/g, " ");
};
