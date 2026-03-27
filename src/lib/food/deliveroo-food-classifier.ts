/**
 * Deliveroo Food Pipeline — Category & Menu Classification
 */

const FOOD_CATEGORY_KEYWORDS: Record<string, string[]> = {
  pizza: ["pizza", "pizzeria", "calzone", "margherita"],
  burger: ["burger", "smash", "patty", "wagyu burger"],
  sushi: ["sushi", "maki", "sashimi", "nigiri", "temaki"],
  indian: ["biryani", "tandoori", "curry", "masala", "naan", "tikka", "paneer"],
  chinese: ["noodle", "wok", "dim sum", "dumpling", "fried rice", "chow mein"],
  lebanese: ["shawarma", "fattoush", "hummus", "manakish", "tabbouleh"],
  mexican: ["taco", "burrito", "quesadilla", "enchilada", "nachos"],
  thai: ["pad thai", "tom yum", "green curry", "thai"],
  healthy: ["salad", "bowl", "açaí", "smoothie", "poke"],
  dessert: ["cake", "donut", "waffle", "crepe", "ice cream", "gelato"],
  cafe: ["coffee", "latte", "cappuccino", "espresso", "café"],
  chicken: ["fried chicken", "wings", "broast", "grilled chicken"],
};

const MENU_FAMILY_KEYWORDS: Record<string, string[]> = {
  Pizzas: ["pizza", "calzone"],
  Burgers: ["burger", "smash"],
  Starters: ["starter", "appetizer", "soup", "meze"],
  Sides: ["side", "fries", "coleslaw", "onion rings"],
  Drinks: ["drink", "beverage", "juice", "soda", "water", "cola"],
  Desserts: ["dessert", "cake", "brownie", "ice cream", "sweet"],
  Salads: ["salad"],
  Pasta: ["pasta", "spaghetti", "penne", "linguine"],
  Sauces: ["sauce", "dip"],
  Meals: ["meal", "combo", "platter"],
  Wraps: ["wrap", "roll"],
  Sandwiches: ["sandwich", "sub", "panini"],
};

export function inferFoodCategory(
  name: string,
  menuCategories: string[],
  menuItems: string[]
): string {
  const corpus = [name, ...menuCategories, ...menuItems]
    .join(" ")
    .toLowerCase();

  let bestCategory = "restaurant";
  let bestScore = 0;

  for (const [cat, keywords] of Object.entries(FOOD_CATEGORY_KEYWORDS)) {
    const score = keywords.reduce(
      (acc, kw) => acc + (corpus.includes(kw) ? 1 : 0),
      0
    );
    if (score > bestScore) {
      bestScore = score;
      bestCategory = cat;
    }
  }

  return bestCategory;
}

export function inferFoodSubcategory(
  name: string,
  menuItems: string[]
): string {
  const corpus = [name, ...menuItems].join(" ").toLowerCase();

  if (corpus.includes("halal")) return "halal";
  if (corpus.includes("vegan")) return "vegan";
  if (corpus.includes("vegetarian")) return "vegetarian";
  if (corpus.includes("organic")) return "organic";
  if (corpus.includes("seafood") || corpus.includes("fish")) return "seafood";
  if (corpus.includes("grill") || corpus.includes("bbq")) return "grill";
  if (corpus.includes("fast food") || corpus.includes("quick")) return "fast_food";
  if (corpus.includes("fine dining")) return "fine_dining";

  return "casual_dining";
}

export function inferMenuFamily(
  itemName: string,
  itemDescription?: string
): string {
  const text = `${itemName} ${itemDescription || ""}`.toLowerCase();

  for (const [family, keywords] of Object.entries(MENU_FAMILY_KEYWORDS)) {
    if (keywords.some((kw) => text.includes(kw))) {
      return family;
    }
  }

  return "Main Menu";
}

export function normalizeMenuCategoryName(name: string): string {
  if (!name) return "Main Menu";
  return name
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[^a-zA-Z]+/, "")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
