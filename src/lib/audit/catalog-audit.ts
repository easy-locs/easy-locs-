/**
 * Catalog / Menu Audit Engine
 * Detects incomplete menus, missing prices, bad products.
 * Provides auto-fix templates and quality scoring.
 */

export type MenuAuditSeverity = "blocker" | "warning" | "info";

export interface MenuAuditIssue {
  severity: MenuAuditSeverity;
  field: string;
  message: string;
  productId?: string;
  productName?: string;
}

export interface MenuAuditResult {
  qualityScore: number;
  totalProducts: number;
  issues: MenuAuditIssue[];
  blockers: string[];
  isPublishable: boolean;
  breakdown: {
    hasProducts: boolean;
    avgPrice: number;
    withImages: number;
    withDescriptions: number;
    withCategories: number;
    emptyPrices: number;
    duplicateNames: number;
  };
}

export function auditMenu(products: any[], vertical?: string): MenuAuditResult {
  const issues: MenuAuditIssue[] = [];
  const blockers: string[] = [];

  if (!products.length) {
    blockers.push("No products in catalog");
    return {
      qualityScore: 0,
      totalProducts: 0,
      issues: [{ severity: "blocker", field: "products", message: "Empty catalog" }],
      blockers,
      isPublishable: false,
      breakdown: { hasProducts: false, avgPrice: 0, withImages: 0, withDescriptions: 0, withCategories: 0, emptyPrices: 0, duplicateNames: 0 },
    };
  }

  let totalPrice = 0;
  let withImages = 0;
  let withDescriptions = 0;
  let withCategories = 0;
  let emptyPrices = 0;
  const nameSet = new Set<string>();
  let duplicateNames = 0;

  for (const p of products) {
    const name = (p.name || "").trim().toLowerCase();

    // Duplicate name
    if (nameSet.has(name)) {
      duplicateNames++;
      issues.push({ severity: "warning", field: "name", message: `Duplicate product name: "${p.name}"`, productId: p.id, productName: p.name });
    }
    nameSet.add(name);

    // Missing name
    if (!p.name?.trim()) {
      issues.push({ severity: "blocker", field: "name", message: "Product without name", productId: p.id });
    }

    // Price
    if (p.price == null || p.price <= 0) {
      emptyPrices++;
      issues.push({ severity: "blocker", field: "price", message: `Missing or invalid price`, productId: p.id, productName: p.name });
    } else {
      totalPrice += p.price;
      // Suspiciously low/high
      if (p.price < 1) issues.push({ severity: "warning", field: "price", message: `Very low price: ${p.price}`, productId: p.id, productName: p.name });
      if (p.price > 5000) issues.push({ severity: "warning", field: "price", message: `Very high price: ${p.price}`, productId: p.id, productName: p.name });
    }

    // Image
    if (p.image_url || p.image) withImages++;

    // Description
    if (p.description?.trim()) withDescriptions++;

    // Category
    if (p.category?.trim()) withCategories++;
  }

  // Scoring (0–100)
  const n = products.length;
  let score = 0;

  // Has enough products (30 pts)
  const minRequired = vertical === "food" ? 3 : vertical === "grocery" ? 5 : 1;
  if (n >= minRequired * 2) score += 30;
  else if (n >= minRequired) score += 20;
  else { score += 5; blockers.push(`Too few products: ${n} (min ${minRequired})`); }

  // Images (20 pts)
  const imgRatio = n > 0 ? withImages / n : 0;
  score += Math.round(imgRatio * 20);
  if (imgRatio < 0.3) issues.push({ severity: "warning", field: "images", message: `Only ${Math.round(imgRatio * 100)}% of products have images` });

  // Descriptions (15 pts)
  const descRatio = n > 0 ? withDescriptions / n : 0;
  score += Math.round(descRatio * 15);

  // Categories (15 pts)
  const catRatio = n > 0 ? withCategories / n : 0;
  score += Math.round(catRatio * 15);

  // No empty prices (10 pts)
  if (emptyPrices === 0) score += 10;
  else blockers.push(`${emptyPrices} products without valid price`);

  // No duplicates (10 pts)
  if (duplicateNames === 0) score += 10;
  else issues.push({ severity: "warning", field: "duplicates", message: `${duplicateNames} duplicate product names` });

  const isPublishable = blockers.length === 0 && score >= 40;

  return {
    qualityScore: Math.min(100, score),
    totalProducts: n,
    issues,
    blockers,
    isPublishable,
    breakdown: {
      hasProducts: n > 0,
      avgPrice: n > 0 ? Math.round(totalPrice / (n - emptyPrices) || 0) : 0,
      withImages,
      withDescriptions,
      withCategories,
      emptyPrices,
      duplicateNames,
    },
  };
}

// ── Auto-fix templates per vertical ──
export interface AutoFixProduct {
  name: string;
  description: string;
  price: number;
  category: string;
}

const FOOD_TEMPLATES: AutoFixProduct[] = [
  { name: "Margherita Pizza", description: "Classic tomato, mozzarella and basil", price: 35, category: "Pizza" },
  { name: "Caesar Salad", description: "Romaine lettuce, croutons, parmesan", price: 28, category: "Salads" },
  { name: "Grilled Chicken", description: "Marinated grilled chicken breast", price: 42, category: "Mains" },
  { name: "French Fries", description: "Crispy golden fries", price: 15, category: "Sides" },
  { name: "Soft Drink", description: "330ml can", price: 8, category: "Beverages" },
  { name: "Water", description: "500ml bottle", price: 5, category: "Beverages" },
];

const GROCERY_TEMPLATES: AutoFixProduct[] = [
  { name: "Fresh Milk 1L", description: "Full cream milk", price: 8, category: "Dairy" },
  { name: "White Bread", description: "Sliced bread loaf", price: 5, category: "Bakery" },
  { name: "Eggs (12 pack)", description: "Free-range eggs", price: 15, category: "Essentials" },
  { name: "Bananas 1kg", description: "Fresh bananas", price: 7, category: "Fruits" },
  { name: "Rice 2kg", description: "Basmati rice", price: 18, category: "Grains" },
  { name: "Mineral Water 1.5L", description: "Still water", price: 3, category: "Beverages" },
];

const GENERIC_TEMPLATES: AutoFixProduct[] = [
  { name: "Basic Service", description: "Standard offering", price: 50, category: "General" },
  { name: "Premium Service", description: "Enhanced offering", price: 100, category: "General" },
];

export function getAutoFixProducts(vertical?: string): AutoFixProduct[] {
  switch (vertical) {
    case "food": return FOOD_TEMPLATES;
    case "grocery": return GROCERY_TEMPLATES;
    default: return GENERIC_TEMPLATES;
  }
}

// ── Standard categories per vertical ──
export function getStandardCategories(vertical?: string): string[] {
  switch (vertical) {
    case "food": return ["Appetizers", "Mains", "Pizza", "Burgers", "Salads", "Sides", "Desserts", "Beverages"];
    case "grocery": return ["Fruits", "Vegetables", "Dairy", "Bakery", "Meat", "Beverages", "Snacks", "Essentials"];
    case "shops": return ["New Arrivals", "Best Sellers", "Sale", "Accessories"];
    case "services": return ["Basic", "Premium", "Packages"];
    default: return ["General", "Featured"];
  }
}
