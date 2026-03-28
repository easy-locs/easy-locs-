/**
 * normalize-shop — Cleans and deduplicates canonical shop data.
 */
import type { CanonicalShop } from "../canonical-shop.schema";

export function normalizeShop(shop: CanonicalShop): CanonicalShop {
  return {
    ...shop,
    name: shop.name.trim(),
    categories: [...new Set(shop.categories.map(c => c.trim()).filter(Boolean))],
    products: shop.products.filter(p => p.name && p.price >= 0),
    location: {
      ...shop.location,
      address: shop.location.address.trim(),
      city: shop.location.city.trim(),
      country: shop.location.country.trim().toUpperCase(),
    },
  };
}
