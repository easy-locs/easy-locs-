/**
 * Procedural generator for 300+ realistic Dubai restaurants.
 * Produces merchant profiles, menu items, and storefront pages.
 */

// ─── Dubai areas with approximate coordinates ───
export const DUBAI_AREAS = [
  { name: "Downtown Dubai", lat: 25.1972, lng: 55.2744 },
  { name: "Dubai Marina", lat: 25.0805, lng: 55.1403 },
  { name: "JLT", lat: 25.0753, lng: 55.1453 },
  { name: "JBR", lat: 25.0785, lng: 55.1325 },
  { name: "Business Bay", lat: 25.1865, lng: 55.2622 },
  { name: "Deira", lat: 25.2697, lng: 55.3095 },
  { name: "Bur Dubai", lat: 25.2532, lng: 55.2924 },
  { name: "Al Barsha", lat: 25.1134, lng: 55.2000 },
  { name: "Jumeirah", lat: 25.2100, lng: 55.2550 },
  { name: "DIFC", lat: 25.2100, lng: 55.2790 },
  { name: "City Walk", lat: 25.2075, lng: 55.2625 },
  { name: "Motor City", lat: 25.0480, lng: 55.2350 },
  { name: "Silicon Oasis", lat: 25.1175, lng: 55.3836 },
  { name: "International City", lat: 25.1653, lng: 55.4080 },
  { name: "Karama", lat: 25.2460, lng: 55.3050 },
  { name: "Satwa", lat: 25.2310, lng: 55.2680 },
  { name: "Al Quoz", lat: 25.1450, lng: 55.2280 },
  { name: "Mirdif", lat: 25.2260, lng: 55.4200 },
  { name: "Discovery Gardens", lat: 25.0410, lng: 55.1340 },
  { name: "Al Nahda", lat: 25.2920, lng: 55.3670 },
] as const;

// ─── Category definitions with menu templates ───
export interface CategoryDef {
  key: string;
  label: string;
  tags: string[];
  themeColor: string;
  menuTemplate: { name: string; priceMin: number; priceMax: number; category: string }[];
}

export const CATEGORIES: CategoryDef[] = [
  {
    key: "shawarma", label: "Shawarma", tags: ["shawarma", "arabic", "wraps"],
    themeColor: "#D4A056",
    menuTemplate: [
      { name: "Shawarma Chicken", priceMin: 8, priceMax: 15, category: "Wraps" },
      { name: "Shawarma Meat", priceMin: 10, priceMax: 18, category: "Wraps" },
      { name: "Shawarma Plate", priceMin: 20, priceMax: 32, category: "Plates" },
      { name: "Falafel Wrap", priceMin: 8, priceMax: 14, category: "Wraps" },
      { name: "Hummus", priceMin: 8, priceMax: 14, category: "Mezzeh" },
      { name: "Fattoush Salad", priceMin: 10, priceMax: 18, category: "Salads" },
      { name: "Garlic Sauce Extra", priceMin: 2, priceMax: 5, category: "Extras" },
      { name: "French Fries", priceMin: 8, priceMax: 14, category: "Sides" },
      { name: "Grilled Chicken", priceMin: 25, priceMax: 40, category: "Plates" },
      { name: "Laban Ayran", priceMin: 5, priceMax: 10, category: "Drinks" },
    ],
  },
  {
    key: "burger", label: "Burgers", tags: ["burger", "american", "fast-food"],
    themeColor: "#C0392B",
    menuTemplate: [
      { name: "Classic Burger", priceMin: 22, priceMax: 35, category: "Burgers" },
      { name: "Cheese Burger", priceMin: 25, priceMax: 38, category: "Burgers" },
      { name: "Double Smash", priceMin: 30, priceMax: 45, category: "Burgers" },
      { name: "Chicken Burger", priceMin: 22, priceMax: 35, category: "Burgers" },
      { name: "Truffle Fries", priceMin: 15, priceMax: 28, category: "Sides" },
      { name: "Onion Rings", priceMin: 12, priceMax: 20, category: "Sides" },
      { name: "Milkshake Vanilla", priceMin: 18, priceMax: 28, category: "Drinks" },
      { name: "Coleslaw", priceMin: 8, priceMax: 14, category: "Sides" },
      { name: "Loaded Nachos", priceMin: 20, priceMax: 32, category: "Starters" },
      { name: "Brownie Sundae", priceMin: 18, priceMax: 30, category: "Desserts" },
    ],
  },
  {
    key: "pizza", label: "Pizza", tags: ["pizza", "italian"],
    themeColor: "#E67E22",
    menuTemplate: [
      { name: "Margherita", priceMin: 28, priceMax: 45, category: "Pizza" },
      { name: "Pepperoni", priceMin: 32, priceMax: 50, category: "Pizza" },
      { name: "BBQ Chicken", priceMin: 35, priceMax: 55, category: "Pizza" },
      { name: "Quattro Formaggi", priceMin: 38, priceMax: 58, category: "Pizza" },
      { name: "Garlic Bread", priceMin: 12, priceMax: 20, category: "Starters" },
      { name: "Caesar Salad", priceMin: 18, priceMax: 28, category: "Salads" },
      { name: "Pasta Arrabiata", priceMin: 28, priceMax: 42, category: "Pasta" },
      { name: "Tiramisu", priceMin: 22, priceMax: 35, category: "Desserts" },
      { name: "Bruschetta", priceMin: 15, priceMax: 25, category: "Starters" },
      { name: "Soft Drink", priceMin: 8, priceMax: 14, category: "Drinks" },
    ],
  },
  {
    key: "indian", label: "Indian", tags: ["indian", "curry", "biryani"],
    themeColor: "#F39C12",
    menuTemplate: [
      { name: "Butter Chicken", priceMin: 28, priceMax: 45, category: "Curries" },
      { name: "Chicken Biryani", priceMin: 25, priceMax: 40, category: "Rice" },
      { name: "Paneer Tikka", priceMin: 22, priceMax: 35, category: "Starters" },
      { name: "Lamb Rogan Josh", priceMin: 35, priceMax: 55, category: "Curries" },
      { name: "Garlic Naan", priceMin: 5, priceMax: 10, category: "Bread" },
      { name: "Dal Makhani", priceMin: 18, priceMax: 28, category: "Curries" },
      { name: "Tandoori Chicken", priceMin: 30, priceMax: 48, category: "Tandoor" },
      { name: "Raita", priceMin: 5, priceMax: 10, category: "Sides" },
      { name: "Gulab Jamun", priceMin: 12, priceMax: 20, category: "Desserts" },
      { name: "Mango Lassi", priceMin: 12, priceMax: 20, category: "Drinks" },
    ],
  },
  {
    key: "healthy", label: "Healthy", tags: ["healthy", "salad", "bowls", "vegan"],
    themeColor: "#27AE60",
    menuTemplate: [
      { name: "Açaí Bowl", priceMin: 30, priceMax: 48, category: "Bowls" },
      { name: "Poke Bowl Salmon", priceMin: 38, priceMax: 55, category: "Bowls" },
      { name: "Quinoa Salad", priceMin: 28, priceMax: 42, category: "Salads" },
      { name: "Avocado Toast", priceMin: 25, priceMax: 38, category: "Toast" },
      { name: "Green Smoothie", priceMin: 18, priceMax: 30, category: "Drinks" },
      { name: "Grilled Chicken Bowl", priceMin: 32, priceMax: 48, category: "Bowls" },
      { name: "Protein Pancakes", priceMin: 28, priceMax: 40, category: "Breakfast" },
      { name: "Detox Juice", priceMin: 15, priceMax: 25, category: "Drinks" },
      { name: "Hummus Plate", priceMin: 20, priceMax: 32, category: "Plates" },
      { name: "Energy Balls (3pc)", priceMin: 12, priceMax: 20, category: "Snacks" },
    ],
  },
  {
    key: "desserts", label: "Desserts & Café", tags: ["desserts", "cafe", "sweets"],
    themeColor: "#8E44AD",
    menuTemplate: [
      { name: "Kunafa", priceMin: 18, priceMax: 35, category: "Arabic Sweets" },
      { name: "Cheesecake", priceMin: 25, priceMax: 40, category: "Cakes" },
      { name: "Chocolate Fondant", priceMin: 28, priceMax: 42, category: "Desserts" },
      { name: "Lotus Biscoff Shake", priceMin: 22, priceMax: 35, category: "Drinks" },
      { name: "Crème Brûlée", priceMin: 22, priceMax: 35, category: "Desserts" },
      { name: "Pistachio Baklava", priceMin: 15, priceMax: 28, category: "Arabic Sweets" },
      { name: "Ice Cream (2 scoops)", priceMin: 18, priceMax: 28, category: "Ice Cream" },
      { name: "Spanish Latte", priceMin: 18, priceMax: 28, category: "Coffee" },
      { name: "Matcha Latte", priceMin: 20, priceMax: 30, category: "Coffee" },
      { name: "Waffles", priceMin: 22, priceMax: 38, category: "Desserts" },
    ],
  },
];

// ─── Name generators ───
const ARABIC_PREFIXES = ["Al", "Abu", "Beit", "Dar", "Maison", "Khan"];
const ARABIC_ROOTS = [
  "Nour", "Salam", "Baraka", "Hayat", "Jamal", "Rashid", "Sultan", "Khalil",
  "Zahran", "Farid", "Samir", "Tariq", "Hadi", "Youssef", "Layla", "Maryam",
  "Amal", "Zain", "Kareem", "Rami", "Firas", "Nassim", "Wael", "Bassam",
];
const ENGLISH_NAMES = [
  "The Kitchen", "Urban Bites", "Street Eats", "Daily Fresh", "Flame Grill",
  "The Spot", "Quick Bite", "Fuel Station", "Crave", "Munch Box",
  "The Den", "Bite Club", "Nom Nom", "Sizzle", "Crispy Corner",
  "Golden Fork", "The Yard", "Craft Kitchen", "Feast", "Glow Bowl",
  "Wholesome", "Clean Eats", "Power Plate", "Fresh Lab", "Green Theory",
];
const CATEGORY_SUFFIXES: Record<string, string[]> = {
  shawarma: ["Shawarma", "Grill", "Kitchen", "Express", "House"],
  burger: ["Burger", "Smash", "Grill", "Stack", "Joint"],
  pizza: ["Pizza", "Pizzeria", "Oven", "Slice", "Dough"],
  indian: ["Kitchen", "Spice", "Tandoor", "Masala", "Palace"],
  healthy: ["Bowl", "Green", "Kitchen", "Lab", "Fuel"],
  desserts: ["Sweets", "Café", "Bakery", "Lounge", "Treats"],
};

const SOURCES = ["google_maps", "deliveroo", "careem"] as const;
const CONTACT_NAMES = [
  "Ahmed", "Fatima", "Mohammed", "Sara", "Ali", "Noura", "Omar", "Reem",
  "Khalid", "Maryam", "Hassan", "Layla", "Youssef", "Huda", "Ibrahim", "Aisha",
];

// ─── Deterministic seeded random ───
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function pick<T>(arr: readonly T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}

function randBetween(min: number, max: number, rand: () => number): number {
  return Math.round(min + rand() * (max - min));
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface GeneratedRestaurant {
  merchant_name: string;
  contact_name: string;
  phone: string;
  email: string;
  city: string;
  area: string;
  cuisine_type: string;
  category_key: string;
  source: string;
  source_external_id: string;
  tags: string[];
  theme_color: string;
  lat: number;
  lng: number;
  rating: number;
  delivery_minutes: number;
  slug: string;
  menu_items: { name: string; price: number; category: string; description: string }[];
}

export function generateDubaiRestaurants(count: number = 300): GeneratedRestaurant[] {
  const rand = seededRandom(42);
  const restaurants: GeneratedRestaurant[] = [];
  const usedSlugs = new Set<string>();
  const usedNames = new Set<string>();

  for (let i = 0; i < count; i++) {
    const cat = CATEGORIES[i % CATEGORIES.length];
    const area = pick(DUBAI_AREAS, rand);
    const source = pick(SOURCES, rand);

    // Generate unique name
    let name: string;
    let attempts = 0;
    do {
      if (rand() < 0.5) {
        // Arabic style
        const prefix = pick(ARABIC_PREFIXES, rand);
        const root = pick(ARABIC_ROOTS, rand);
        const suffix = pick(CATEGORY_SUFFIXES[cat.key], rand);
        name = `${prefix} ${root} ${suffix}`;
      } else {
        // English style
        const base = pick(ENGLISH_NAMES, rand);
        const suffix = pick(CATEGORY_SUFFIXES[cat.key], rand);
        name = rand() < 0.4 ? `${base} ${suffix}` : `${base}`;
      }
      attempts++;
      if (attempts > 20) name = `${name} ${area.name}`;
    } while (usedNames.has(name) && attempts < 30);
    usedNames.add(name);

    // Unique slug
    let slug = slugify(name);
    let slugAttempt = 0;
    while (usedSlugs.has(slug)) {
      slugAttempt++;
      slug = `${slugify(name)}-${slugAttempt}`;
    }
    usedSlugs.add(slug);

    // Generate menu (5-10 items from template)
    const itemCount = randBetween(5, 10, rand);
    const shuffled = [...cat.menuTemplate].sort(() => rand() - 0.5);
    const menuItems = shuffled.slice(0, itemCount).map((tmpl, idx) => ({
      name: tmpl.name,
      price: randBetween(tmpl.priceMin, tmpl.priceMax, rand),
      category: tmpl.category,
      description: `${tmpl.name} — prepared fresh daily`,
    }));

    // Add lat/lng jitter
    const lat = area.lat + (rand() - 0.5) * 0.015;
    const lng = area.lng + (rand() - 0.5) * 0.015;

    const contactName = pick(CONTACT_NAMES, rand);

    restaurants.push({
      merchant_name: name,
      contact_name: contactName,
      phone: `+9714${String(randBetween(1000000, 9999999, rand))}`,
      email: `${slugify(name)}@restaurant.ae`,
      city: "Dubai",
      area: area.name,
      cuisine_type: cat.label,
      category_key: cat.key,
      source,
      source_external_id: `${source}_${slug}`,
      tags: cat.tags,
      theme_color: cat.themeColor,
      lat,
      lng,
      rating: Math.round((3.5 + rand() * 1.5) * 10) / 10,
      delivery_minutes: randBetween(20, 50, rand),
      slug,
      menu_items: menuItems,
    });
  }

  return restaurants;
}
