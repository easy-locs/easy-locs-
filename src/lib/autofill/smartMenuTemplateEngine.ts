/**
 * Smart Menu Template Engine — Provides canonical templates per subcategory.
 * CRITICAL: Templates must ONLY return items matching the subcategory.
 * No fallback to unrelated verticals. If unknown type → return empty + flag.
 */

export type MenuTemplateType =
  | "pizza" | "burger" | "shawarma" | "sushi"
  | "chinese" | "indian" | "mexican" | "seafood"
  | "bakery" | "coffee" | "ice_cream"
  | "fruits_vegetables" | "pharmacy"
  | "generic_food";

interface TemplateItem {
  name: string;
  description: string;
  price: number;
  category: string;
}

const TEMPLATES: Record<string, TemplateItem[]> = {
  pizza: [
    { name: "Margherita", description: "Tomato sauce, mozzarella, basil", price: 29, category: "pizza" },
    { name: "Pepperoni", description: "Pepperoni and mozzarella", price: 34, category: "pizza" },
    { name: "BBQ Chicken", description: "BBQ chicken pizza", price: 37, category: "pizza" },
    { name: "Garlic Bread", description: "Fresh baked bread", price: 14, category: "sides" },
    { name: "Coke", description: "Soft drink", price: 6, category: "drinks" },
  ],
  burger: [
    { name: "Classic Burger", description: "Beef patty, lettuce, tomato", price: 28, category: "burgers" },
    { name: "Cheese Burger", description: "Beef patty, cheddar cheese", price: 31, category: "burgers" },
    { name: "Chicken Burger", description: "Crispy chicken burger", price: 29, category: "burgers" },
    { name: "Fries", description: "Golden fries", price: 12, category: "sides" },
    { name: "Cola", description: "Soft drink", price: 6, category: "drinks" },
  ],
  shawarma: [
    { name: "Chicken Shawarma", description: "Arabic bread, garlic sauce", price: 18, category: "shawarma" },
    { name: "Meat Shawarma", description: "Beef strips, tahini sauce", price: 21, category: "shawarma" },
    { name: "Fries", description: "Crispy fries", price: 10, category: "sides" },
    { name: "Soft Drink", description: "Cold beverage", price: 5, category: "drinks" },
  ],
  sushi: [
    { name: "California Roll", description: "Crab stick, avocado, cucumber", price: 32, category: "sushi" },
    { name: "Salmon Roll", description: "Fresh salmon, rice, nori", price: 38, category: "sushi" },
    { name: "Tuna Nigiri", description: "Fresh tuna over seasoned rice", price: 28, category: "sushi" },
    { name: "Dragon Roll", description: "Shrimp tempura, avocado, eel sauce", price: 42, category: "sushi" },
    { name: "Edamame", description: "Steamed soybeans with sea salt", price: 16, category: "starters" },
    { name: "Miso Soup", description: "Traditional Japanese miso soup", price: 12, category: "starters" },
    { name: "Green Tea", description: "Japanese green tea", price: 8, category: "drinks" },
  ],
  chinese: [
    { name: "Kung Pao Chicken", description: "Spicy chicken with peanuts", price: 36, category: "mains" },
    { name: "Fried Rice", description: "Egg fried rice with vegetables", price: 22, category: "rice" },
    { name: "Spring Rolls", description: "Crispy vegetable spring rolls", price: 16, category: "starters" },
    { name: "Chow Mein", description: "Stir-fried noodles", price: 28, category: "noodles" },
    { name: "Jasmine Tea", description: "Traditional Chinese tea", price: 8, category: "drinks" },
  ],
  indian: [
    { name: "Chicken Tikka Masala", description: "Creamy tomato curry", price: 38, category: "curry" },
    { name: "Biryani", description: "Fragrant rice with spices", price: 35, category: "biryani" },
    { name: "Naan Bread", description: "Freshly baked naan", price: 8, category: "bread" },
    { name: "Samosa", description: "Crispy pastry with spiced filling", price: 14, category: "starters" },
    { name: "Mango Lassi", description: "Yogurt mango drink", price: 12, category: "drinks" },
  ],
  mexican: [
    { name: "Beef Tacos", description: "Seasoned beef, salsa, cilantro", price: 28, category: "tacos" },
    { name: "Chicken Burrito", description: "Grilled chicken, rice, beans", price: 32, category: "burritos" },
    { name: "Guacamole & Chips", description: "Fresh avocado dip", price: 18, category: "starters" },
    { name: "Quesadilla", description: "Cheese and chicken quesadilla", price: 26, category: "mains" },
    { name: "Horchata", description: "Traditional rice drink", price: 10, category: "drinks" },
  ],
  seafood: [
    { name: "Grilled Salmon", description: "Atlantic salmon fillet", price: 55, category: "fish" },
    { name: "Shrimp Cocktail", description: "Chilled shrimp with cocktail sauce", price: 38, category: "starters" },
    { name: "Fish & Chips", description: "Battered cod with fries", price: 42, category: "fish" },
    { name: "Calamari", description: "Crispy fried squid rings", price: 28, category: "starters" },
    { name: "Lemon Water", description: "Sparkling water with lemon", price: 8, category: "drinks" },
  ],
  bakery: [
    { name: "Baguette", description: "Traditional French baguette", price: 8, category: "bread" },
    { name: "Croissant", description: "Buttery flaky croissant", price: 10, category: "pastries" },
    { name: "Chocolate Cake", description: "Rich chocolate layer cake", price: 22, category: "cakes" },
    { name: "Pain au Chocolat", description: "Chocolate filled pastry", price: 12, category: "pastries" },
    { name: "Coffee", description: "Freshly brewed coffee", price: 12, category: "drinks" },
  ],
  coffee: [
    { name: "Espresso", description: "Double shot espresso", price: 14, category: "coffee" },
    { name: "Latte", description: "Espresso with steamed milk", price: 18, category: "coffee" },
    { name: "Cappuccino", description: "Espresso with foamed milk", price: 18, category: "coffee" },
    { name: "Cold Brew", description: "Slow-steeped cold coffee", price: 20, category: "coffee" },
    { name: "Croissant", description: "Buttery croissant", price: 10, category: "pastries" },
  ],
  ice_cream: [
    { name: "Vanilla Scoop", description: "Classic vanilla ice cream", price: 12, category: "ice_cream" },
    { name: "Chocolate Sundae", description: "Chocolate ice cream with toppings", price: 22, category: "sundaes" },
    { name: "Mango Sorbet", description: "Fresh mango fruit sorbet", price: 16, category: "ice_cream" },
    { name: "Waffle Cone", description: "Two scoops in waffle cone", price: 18, category: "ice_cream" },
  ],
  fruits_vegetables: [
    { name: "Apple", description: "Fresh red apples per kg", price: 12, category: "fruits" },
    { name: "Banana", description: "Ripe bananas per kg", price: 8, category: "fruits" },
    { name: "Tomato", description: "Fresh tomatoes per kg", price: 10, category: "vegetables" },
    { name: "Lettuce", description: "Fresh iceberg lettuce", price: 6, category: "vegetables" },
    { name: "Mixed Herbs", description: "Fresh herb bundle", price: 8, category: "herbs" },
  ],
  pharmacy: [
    { name: "Panadol", description: "Pain relief tablets", price: 12, category: "pain_relief" },
    { name: "Vitamin C", description: "500mg vitamin C supplements", price: 25, category: "vitamins" },
    { name: "Hand Sanitizer", description: "Antibacterial gel 250ml", price: 15, category: "hygiene" },
    { name: "Bandage", description: "Adhesive bandage strip pack", price: 10, category: "first_aid" },
  ],
  generic_food: [
    { name: "Grilled Chicken", description: "Seasoned grilled chicken", price: 35, category: "mains" },
    { name: "Garden Salad", description: "Fresh mixed salad", price: 18, category: "starters" },
    { name: "French Fries", description: "Crispy golden fries", price: 14, category: "sides" },
    { name: "Fresh Juice", description: "Seasonal fruit juice", price: 12, category: "drinks" },
  ],
};

/**
 * Get a menu template strictly matching the subcategory.
 * Returns null if no matching template exists — NEVER falls back to an unrelated vertical.
 */
export function getSmartMenuTemplate(type: string): TemplateItem[] | null {
  const normalized = type?.toLowerCase().replace(/[\s-]+/g, "_") ?? "";
  return TEMPLATES[normalized] ?? null;
}

/**
 * Get template with coherence validation.
 * Returns the template only if it matches the entity's vertical/subcategory.
 */
export function getSafeMenuTemplate(
  entitySubcategory: string,
  requestedTemplate?: string
): { items: TemplateItem[]; templateCode: string } | null {
  const target = requestedTemplate ?? entitySubcategory;
  const items = getSmartMenuTemplate(target);

  if (!items) return null;

  // Verify coherence: the template must match the entity's subcategory
  const normalizedEntity = entitySubcategory?.toLowerCase().replace(/[\s-]+/g, "_") ?? "";
  const normalizedTemplate = target?.toLowerCase().replace(/[\s-]+/g, "_") ?? "";

  // Direct match
  if (normalizedEntity === normalizedTemplate) {
    return { items, templateCode: normalizedTemplate };
  }

  // Check if the entity subcategory has a template — prefer that
  const entityTemplate = getSmartMenuTemplate(normalizedEntity);
  if (entityTemplate) {
    return { items: entityTemplate, templateCode: normalizedEntity };
  }

  // If no specific template for entity, use generic_food for food vertical
  const foodTypes = ["pizza", "burger", "shawarma", "sushi", "chinese", "indian", "mexican", "seafood", "coffee", "ice_cream", "generic_food"];
  if (foodTypes.includes(normalizedEntity) || !normalizedEntity) {
    return { items: TEMPLATES.generic_food, templateCode: "generic_food" };
  }

  // Non-food: only return if exact match exists
  return null;
}

/** List all available template types */
export function getAvailableTemplateTypes(): string[] {
  return Object.keys(TEMPLATES);
}
