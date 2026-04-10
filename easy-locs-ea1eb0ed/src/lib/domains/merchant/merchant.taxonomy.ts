/**
 * merchant.taxonomy — Category and vertical classification.
 */

export interface MerchantTaxonomy {
  vertical: "food" | "hotel" | "shop" | "service" | "grocery";
  category?: string;
  subcategory?: string;
  tags: string[];
  cuisineType?: string; // food-specific
  confidence: number;   // 0-100
}

export function isTaxonomyComplete(t: MerchantTaxonomy): boolean {
  return !!t.vertical && !!t.category && t.confidence >= 50;
}

export function buildTaxonomyScore(t: MerchantTaxonomy): number {
  let score = 0;
  if (t.vertical) score += 30;
  if (t.category) score += 25;
  if (t.subcategory) score += 15;
  if (t.tags.length > 0) score += 15;
  if (t.cuisineType) score += 15;
  return Math.min(100, score);
}
