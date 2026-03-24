/**
 * MENU PRESENTATION ENGINE — Auto-improves menu structure and quality.
 * Scores menu completeness, detects gaps, suggests ordering.
 */

export interface MenuIssue {
  type: "no_image" | "no_price" | "no_description" | "empty_category" | "no_bestseller" | "no_cover" | "no_logo" | "bad_order" | "missing_drinks" | "missing_desserts" | "too_few_items";
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  category?: string;
  autoFixable: boolean;
  fixed?: boolean;
}

export interface MenuQualityScore {
  structure: number;      // Category organization 0-100
  completeness: number;   // Images, prices, descriptions 0-100
  conversion: number;     // Bestsellers, combos, upsell 0-100
  visual: number;         // Cover, logo, gallery 0-100
  total: number;          // Weighted average
}

export interface MenuAuditResult {
  entityId: string;
  entityName: string;
  score: MenuQualityScore;
  issues: MenuIssue[];
  fixedCount: number;
  categoryCount: number;
  itemCount: number;
  hasImages: boolean;
  hasPrices: boolean;
  hasCover: boolean;
  hasLogo: boolean;
}

/** Preferred category ordering for food delivery-first */
const OPTIMAL_CATEGORY_ORDER = [
  "bestsellers", "popular", "recommended", "combos", "meals", "specials",
  "starters", "appetizers", "salads", "soups",
  "main", "mains", "burgers", "pizza", "pasta", "sandwiches", "wraps", "rice", "grills", "seafood",
  "sides",
  "drinks", "beverages", "juices", "smoothies",
  "desserts", "sweets", "ice cream",
  "extras", "add-ons", "sauces", "condiments",
  "breakfast", "brunch",
];

function getCategoryOrder(name: string): number {
  const lower = name.toLowerCase().trim();
  const idx = OPTIMAL_CATEGORY_ORDER.findIndex((c) => lower.includes(c));
  return idx >= 0 ? idx : 50; // Unknown categories go to middle
}

/** Audit a menu structure */
export function auditMenu(entity: {
  id: string;
  name: string;
  cover_image?: string | null;
  logo_url?: string | null;
  menu_categories?: Array<{ name: string; items: Array<{ name: string; price?: number; description?: string; image_url?: string }> }>;
}): MenuAuditResult {
  const issues: MenuIssue[] = [];
  const cats = entity.menu_categories || [];
  const allItems = cats.flatMap((c) => c.items || []);

  // ─── Visual checks ───
  if (!entity.cover_image) {
    issues.push({ type: "no_cover", severity: "high", description: "No cover image", autoFixable: false });
  }
  if (!entity.logo_url) {
    issues.push({ type: "no_logo", severity: "medium", description: "No logo", autoFixable: false });
  }

  // ─── Category checks ───
  const emptyCats = cats.filter((c) => !c.items?.length);
  emptyCats.forEach((c) => {
    issues.push({ type: "empty_category", severity: "high", description: `Empty category: "${c.name}"`, category: c.name, autoFixable: false });
  });

  if (allItems.length < 3) {
    issues.push({ type: "too_few_items", severity: "critical", description: `Only ${allItems.length} items — menu too sparse`, autoFixable: false });
  }

  // ─── Item checks ───
  const noImage = allItems.filter((i) => !i.image_url);
  if (noImage.length > allItems.length * 0.5 && allItems.length > 0) {
    issues.push({ type: "no_image", severity: "high", description: `${noImage.length}/${allItems.length} items have no image`, autoFixable: false });
  }

  const noPrice = allItems.filter((i) => !i.price && i.price !== 0);
  if (noPrice.length > 0) {
    issues.push({ type: "no_price", severity: "critical", description: `${noPrice.length} items have no price`, autoFixable: false });
  }

  const noDesc = allItems.filter((i) => !i.description);
  if (noDesc.length > allItems.length * 0.7 && allItems.length > 3) {
    issues.push({ type: "no_description", severity: "medium", description: `${noDesc.length}/${allItems.length} items have no description`, autoFixable: false });
  }

  // ─── Conversion checks ───
  const catNames = cats.map((c) => c.name.toLowerCase());
  const hasBestseller = catNames.some((n) => n.includes("best") || n.includes("popular") || n.includes("recommended"));
  if (!hasBestseller && allItems.length > 5) {
    issues.push({ type: "no_bestseller", severity: "medium", description: "No bestseller/popular category — hurts conversion", autoFixable: true });
  }

  const hasDrinks = catNames.some((n) => n.includes("drink") || n.includes("beverage") || n.includes("juice"));
  if (!hasDrinks && allItems.length > 5) {
    issues.push({ type: "missing_drinks", severity: "low", description: "No drinks category detected", autoFixable: false });
  }

  const hasDesserts = catNames.some((n) => n.includes("dessert") || n.includes("sweet") || n.includes("ice cream"));
  if (!hasDesserts && allItems.length > 8) {
    issues.push({ type: "missing_desserts", severity: "low", description: "No desserts category detected", autoFixable: false });
  }

  // ─── Category order check ───
  if (cats.length > 2) {
    const currentOrder = cats.map((c) => getCategoryOrder(c.name));
    const sorted = [...currentOrder].sort((a, b) => a - b);
    const isOrdered = currentOrder.every((v, i) => v === sorted[i]);
    if (!isOrdered) {
      issues.push({ type: "bad_order", severity: "low", description: "Category order is not optimal for delivery conversion", autoFixable: true });
    }
  }

  // ─── Scores ───
  const structure = Math.max(0, 100 - (emptyCats.length * 15) - (cats.length < 2 ? 20 : 0));
  const completeness = allItems.length === 0 ? 0 : Math.max(0, 100
    - (noImage.length / Math.max(1, allItems.length)) * 30
    - (noPrice.length / Math.max(1, allItems.length)) * 40
    - (noDesc.length / Math.max(1, allItems.length)) * 15
  );
  const conversion = Math.max(0, 100
    - (hasBestseller ? 0 : 20)
    - (hasDrinks ? 0 : 10)
    - (hasDesserts ? 0 : 10)
    - (allItems.length < 5 ? 30 : 0)
  );
  const visual = Math.max(0, 100 - (entity.cover_image ? 0 : 35) - (entity.logo_url ? 0 : 25) - (noImage.length > 0 ? 20 : 0));

  const total = Math.round(structure * 0.25 + completeness * 0.35 + conversion * 0.2 + visual * 0.2);

  return {
    entityId: entity.id,
    entityName: entity.name,
    score: { structure: Math.round(structure), completeness: Math.round(completeness), conversion: Math.round(conversion), visual: Math.round(visual), total },
    issues,
    fixedCount: 0,
    categoryCount: cats.length,
    itemCount: allItems.length,
    hasImages: noImage.length < allItems.length,
    hasPrices: noPrice.length === 0,
    hasCover: !!entity.cover_image,
    hasLogo: !!entity.logo_url,
  };
}

/** Reorder categories for optimal delivery conversion */
export function getOptimalCategoryOrder(categories: Array<{ name: string; items: any[] }>): Array<{ name: string; items: any[] }> {
  return [...categories].sort((a, b) => getCategoryOrder(a.name) - getCategoryOrder(b.name));
}
