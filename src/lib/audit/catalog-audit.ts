/**
 * Catalog / Menu Audit Engine — Universal per-vertical offer audit.
 * Covers all 8 verticals with specific rules.
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

// Per-vertical catalog requirements
interface VerticalCatalogRule {
  minItems: number;
  requiresPrice: boolean;
  requiresImages: boolean;
  requiresDescription: boolean;
  catalogLabel: string;
  emptyMessage: string;
}

const VERTICAL_CATALOG_RULES: Record<string, VerticalCatalogRule> = {
  food:        { minItems: 3, requiresPrice: true,  requiresImages: false, requiresDescription: false, catalogLabel: "Menu",       emptyMessage: "Food shop needs at least 3 menu items" },
  grocery:     { minItems: 5, requiresPrice: true,  requiresImages: false, requiresDescription: false, catalogLabel: "Products",   emptyMessage: "Grocery needs at least 5 products" },
  shops:       { minItems: 1, requiresPrice: true,  requiresImages: true,  requiresDescription: false, catalogLabel: "Products",   emptyMessage: "Shop needs at least 1 product" },
  services:    { minItems: 1, requiresPrice: true,  requiresImages: false, requiresDescription: true,  catalogLabel: "Services",   emptyMessage: "Add at least 1 service offering" },
  property:    { minItems: 1, requiresPrice: true,  requiresImages: true,  requiresDescription: true,  catalogLabel: "Listings",   emptyMessage: "Add at least 1 property listing" },
  healthcare:  { minItems: 1, requiresPrice: false, requiresImages: false, requiresDescription: true,  catalogLabel: "Services",   emptyMessage: "Add at least 1 healthcare service" },
  mobility:    { minItems: 0, requiresPrice: false, requiresImages: false, requiresDescription: false, catalogLabel: "Options",    emptyMessage: "No catalog required" },
  experiences: { minItems: 1, requiresPrice: true,  requiresImages: true,  requiresDescription: true,  catalogLabel: "Experiences", emptyMessage: "Add at least 1 experience" },
};

function getRule(vertical?: string): VerticalCatalogRule {
  return VERTICAL_CATALOG_RULES[vertical || "services"] ?? VERTICAL_CATALOG_RULES.services;
}

export function auditMenu(products: any[], vertical?: string): MenuAuditResult {
  const issues: MenuAuditIssue[] = [];
  const blockers: string[] = [];
  const rule = getRule(vertical);

  if (!products.length) {
    if (rule.minItems > 0) {
      blockers.push(rule.emptyMessage);
      issues.push({ severity: "blocker", field: "products", message: rule.emptyMessage });
    }
    return {
      qualityScore: rule.minItems === 0 ? 100 : 0,
      totalProducts: 0,
      issues,
      blockers,
      isPublishable: rule.minItems === 0,
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

    if (nameSet.has(name)) {
      duplicateNames++;
      issues.push({ severity: "warning", field: "name", message: `Duplicate: "${p.name}"`, productId: p.id, productName: p.name });
    }
    nameSet.add(name);

    if (!p.name?.trim()) {
      issues.push({ severity: "blocker", field: "name", message: "Product without name", productId: p.id });
    }

    if (rule.requiresPrice && (p.price == null || p.price <= 0)) {
      emptyPrices++;
      issues.push({ severity: "blocker", field: "price", message: "Missing price", productId: p.id, productName: p.name });
    } else if (p.price != null && p.price > 0) {
      totalPrice += p.price;
      if (p.price < 1) issues.push({ severity: "warning", field: "price", message: `Very low price: ${p.price}`, productId: p.id, productName: p.name });
      if (p.price > 10000) issues.push({ severity: "warning", field: "price", message: `Very high price: ${p.price}`, productId: p.id, productName: p.name });
    }

    if (p.image_url || p.image) withImages++;
    if (p.description?.trim()) withDescriptions++;
    if (p.category?.trim()) withCategories++;
  }

  const n = products.length;
  let score = 0;

  // Quantity (30 pts)
  if (n >= rule.minItems * 2) score += 30;
  else if (n >= rule.minItems) score += 20;
  else { score += 5; blockers.push(`Too few ${rule.catalogLabel.toLowerCase()}: ${n} (min ${rule.minItems})`); }

  // Images (20 pts)
  const imgRatio = n > 0 ? withImages / n : 0;
  score += Math.round(imgRatio * 20);
  if (rule.requiresImages && imgRatio < 0.5) {
    issues.push({ severity: "warning", field: "images", message: `Only ${Math.round(imgRatio * 100)}% have images` });
  }

  // Descriptions (15 pts)
  const descRatio = n > 0 ? withDescriptions / n : 0;
  score += Math.round(descRatio * 15);
  if (rule.requiresDescription && descRatio < 0.5) {
    issues.push({ severity: "warning", field: "descriptions", message: `Only ${Math.round(descRatio * 100)}% have descriptions` });
  }

  // Categories (15 pts)
  const catRatio = n > 0 ? withCategories / n : 0;
  score += Math.round(catRatio * 15);

  // Pricing (10 pts)
  if (!rule.requiresPrice || emptyPrices === 0) score += 10;
  else blockers.push(`${emptyPrices} items without price`);

  // No duplicates (10 pts)
  if (duplicateNames === 0) score += 10;

  const isPublishable = blockers.length === 0 && score >= 40;

  return {
    qualityScore: Math.min(100, score),
    totalProducts: n,
    issues,
    blockers,
    isPublishable,
    breakdown: {
      hasProducts: n > 0,
      avgPrice: n > 0 && (n - emptyPrices) > 0 ? Math.round(totalPrice / (n - emptyPrices)) : 0,
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

export function getAutoFixProducts(vertical?: string): AutoFixProduct[] {
  switch (vertical) {
    case "food": return [
      { name: "Margherita Pizza", description: "Classic tomato, mozzarella and basil", price: 35, category: "Pizza" },
      { name: "Caesar Salad", description: "Romaine lettuce, croutons, parmesan", price: 28, category: "Salads" },
      { name: "Grilled Chicken", description: "Marinated grilled chicken breast", price: 42, category: "Mains" },
      { name: "French Fries", description: "Crispy golden fries", price: 15, category: "Sides" },
      { name: "Soft Drink", description: "330ml can", price: 8, category: "Beverages" },
      { name: "Water", description: "500ml bottle", price: 5, category: "Beverages" },
    ];
    case "grocery": return [
      { name: "Fresh Milk 1L", description: "Full cream milk", price: 8, category: "Dairy" },
      { name: "White Bread", description: "Sliced bread loaf", price: 5, category: "Bakery" },
      { name: "Eggs (12 pack)", description: "Free-range eggs", price: 15, category: "Essentials" },
      { name: "Bananas 1kg", description: "Fresh bananas", price: 7, category: "Fruits" },
      { name: "Rice 2kg", description: "Basmati rice", price: 18, category: "Grains" },
      { name: "Mineral Water 1.5L", description: "Still water", price: 3, category: "Beverages" },
    ];
    case "shops": return [
      { name: "Featured Product", description: "Our best seller", price: 99, category: "Best Sellers" },
      { name: "New Arrival", description: "Latest addition", price: 149, category: "New Arrivals" },
    ];
    case "services": return [
      { name: "Standard Service", description: "Our core service offering", price: 150, category: "Services" },
      { name: "Premium Service", description: "Enhanced service with priority", price: 300, category: "Premium" },
      { name: "Consultation", description: "Initial consultation session", price: 100, category: "Consultation" },
    ];
    case "property": return [
      { name: "Studio Apartment", description: "Furnished studio, city view", price: 3500, category: "Apartments" },
      { name: "1BR Apartment", description: "One bedroom, modern finish", price: 5500, category: "Apartments" },
    ];
    case "healthcare": return [
      { name: "General Consultation", description: "30-minute doctor consultation", price: 200, category: "Consultations" },
      { name: "Follow-up Visit", description: "15-minute follow-up", price: 100, category: "Consultations" },
    ];
    case "experiences": return [
      { name: "City Tour", description: "Guided 3-hour city tour", price: 250, category: "Tours" },
      { name: "Workshop", description: "Interactive 2-hour workshop", price: 180, category: "Activities" },
    ];
    default: return [
      { name: "Basic Service", description: "Standard offering", price: 50, category: "General" },
      { name: "Premium Service", description: "Enhanced offering", price: 100, category: "General" },
    ];
  }
}

export function getStandardCategories(vertical?: string): string[] {
  switch (vertical) {
    case "food": return ["Appetizers", "Mains", "Pizza", "Burgers", "Salads", "Sides", "Desserts", "Beverages"];
    case "grocery": return ["Fruits", "Vegetables", "Dairy", "Bakery", "Meat", "Beverages", "Snacks", "Essentials"];
    case "shops": return ["New Arrivals", "Best Sellers", "Sale", "Accessories"];
    case "services": return ["Services", "Premium", "Packages", "Consultation"];
    case "property": return ["Apartments", "Villas", "Offices", "Rooms"];
    case "healthcare": return ["Consultations", "Procedures", "Tests", "Packages"];
    case "mobility": return ["Rides", "Rentals", "Packages"];
    case "experiences": return ["Tours", "Activities", "Workshops", "Events"];
    default: return ["General", "Featured"];
  }
}
