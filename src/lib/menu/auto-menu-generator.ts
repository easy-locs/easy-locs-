/**
 * Auto Menu Generator
 * AI-style menu generation based on category and cuisine.
 */

export interface GeneratedMenuItem {
  title: string;
  description: string;
  price: number;
  category: string;
  currency: string;
}

const MENU_TEMPLATES: Record<string, GeneratedMenuItem[]> = {
  pizza: [
    { title: "Margherita Pizza", description: "Classic tomato sauce, mozzarella, fresh basil", price: 35, category: "Pizzas", currency: "AED" },
    { title: "Pepperoni Pizza", description: "Spicy pepperoni, mozzarella, tomato sauce", price: 42, category: "Pizzas", currency: "AED" },
    { title: "BBQ Chicken Pizza", description: "Grilled chicken, BBQ sauce, red onions", price: 45, category: "Pizzas", currency: "AED" },
    { title: "Garlic Bread", description: "Toasted bread with garlic butter and herbs", price: 15, category: "Sides", currency: "AED" },
    { title: "Caesar Salad", description: "Romaine, parmesan, croutons, Caesar dressing", price: 22, category: "Salads", currency: "AED" },
  ],
  burger: [
    { title: "Classic Burger", description: "Beef patty, lettuce, tomato, pickles, special sauce", price: 32, category: "Burgers", currency: "AED" },
    { title: "Cheese Burger", description: "Double beef, cheddar, caramelized onions", price: 38, category: "Burgers", currency: "AED" },
    { title: "Chicken Burger", description: "Crispy chicken, coleslaw, mayo", price: 30, category: "Burgers", currency: "AED" },
    { title: "French Fries", description: "Crispy golden fries with ketchup", price: 12, category: "Sides", currency: "AED" },
    { title: "Milkshake", description: "Creamy vanilla milkshake", price: 18, category: "Drinks", currency: "AED" },
  ],
  arabic: [
    { title: "Shawarma Plate", description: "Chicken shawarma with rice, garlic sauce, pickles", price: 28, category: "Main", currency: "AED" },
    { title: "Mixed Grill", description: "Lamb, chicken, kofta with Arabic bread", price: 55, category: "Main", currency: "AED" },
    { title: "Hummus", description: "Creamy chickpea dip with olive oil", price: 15, category: "Appetizers", currency: "AED" },
    { title: "Fattoush Salad", description: "Fresh vegetables with sumac dressing", price: 18, category: "Salads", currency: "AED" },
    { title: "Kunafa", description: "Traditional cheese pastry with syrup", price: 22, category: "Desserts", currency: "AED" },
  ],
  default: [
    { title: "House Special", description: "Chef's signature dish of the day", price: 35, category: "Mains", currency: "AED" },
    { title: "Grilled Chicken", description: "Herb-marinated chicken with vegetables", price: 32, category: "Mains", currency: "AED" },
    { title: "Fresh Juice", description: "Seasonal fresh-pressed juice", price: 15, category: "Drinks", currency: "AED" },
    { title: "Soup of the Day", description: "Freshly prepared daily soup", price: 18, category: "Starters", currency: "AED" },
  ],
};

export function generateMenuForCategory(cuisine?: string): GeneratedMenuItem[] {
  const key = cuisine?.toLowerCase() ?? "default";
  return MENU_TEMPLATES[key] ?? MENU_TEMPLATES.default;
}

export function scoreMenuQuality(items: GeneratedMenuItem[]): number {
  if (items.length === 0) return 0;
  let score = Math.min(items.length * 10, 40);
  const hasDescriptions = items.every((i) => i.description?.length > 10);
  if (hasDescriptions) score += 20;
  const hasPrices = items.every((i) => i.price > 0);
  if (hasPrices) score += 20;
  const categories = new Set(items.map((i) => i.category));
  if (categories.size >= 3) score += 20;
  return Math.min(score, 100);
}
