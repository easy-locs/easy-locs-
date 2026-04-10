/**
 * score-shop — Quality scoring engine for canonical shops.
 * Pure function, no side effects.
 */
import type { CanonicalShop } from "../canonical-shop.schema";

export function scoreShop(shop: CanonicalShop): CanonicalShop {
  let score = 0;
  const missing: string[] = [];

  if (shop.name) score += 10; else missing.push("name");
  if (shop.location?.lat && shop.location?.lng) score += 10; else missing.push("location");
  if (shop.location?.city) score += 5; else missing.push("city");
  if (shop.location?.country) score += 5; else missing.push("country");
  if (shop.products.length > 5) score += 20;
  else if (shop.products.length > 0) score += 10;
  else missing.push("products");
  if (shop.media.cover) score += 10; else missing.push("cover");
  if (shop.media.logo) score += 5; else missing.push("logo");
  if (shop.media.gallery.length > 0) score += 5; else missing.push("gallery");
  if (shop.categories.length > 0) score += 10; else missing.push("categories");
  if (shop.hours.length > 0) score += 5; else missing.push("hours");
  if (shop.delivery.radius || shop.delivery.fee) score += 5; else missing.push("delivery");
  if (shop.source.confidence > 0.8) score += 10;

  return {
    ...shop,
    quality: { score, missingFields: missing },
  };
}
