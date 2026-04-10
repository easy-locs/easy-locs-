/**
 * enrich-shop — Optional enrichment pass for canonical shops.
 * Can add geocoding, category mapping, etc.
 */
import type { CanonicalShop } from "../canonical-shop.schema";

export async function enrichShop(shop: CanonicalShop): Promise<CanonicalShop> {
  // Placeholder for future enrichment: geocoding, AI categorization, etc.
  return shop;
}
