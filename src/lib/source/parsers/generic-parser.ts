/**
 * Generic Parser — Best-effort parsing for unknown/weak sources.
 * Used as fallback when no dedicated parser exists.
 */
import type { CanonicalShopData, CanonicalMenuItem } from "./canonical-format";

export function parseGenericData(raw: any, sourceKey: string): CanonicalShopData {
  const menu_items: CanonicalMenuItem[] = [];

  const rawItems = raw.menu || raw.items || raw.products || raw.menu_items || [];
  if (Array.isArray(rawItems)) {
    for (const item of rawItems) {
      menu_items.push({
        name: (item.name || item.title || "").replace(/\s+/g, " ").trim(),
        description: item.description || undefined,
        price: typeof item.price === "number" ? item.price : undefined,
        category: item.category || undefined,
        image_url: item.image || item.image_url || undefined,
      });
    }
  }

  return {
    name: raw.name || raw.title || raw.business_name || "",
    description: raw.description || raw.about || undefined,
    source_key: sourceKey,
    source_external_id: raw.id?.toString() || raw.external_id || undefined,
    vertical: raw.vertical || raw.category || undefined,
    category: raw.category || undefined,
    subcategory: raw.subcategory || undefined,
    cuisine_tags: Array.isArray(raw.tags) ? raw.tags : [],
    address: raw.address || undefined,
    city: raw.city || undefined,
    area: raw.area || undefined,
    country: raw.country || undefined,
    lat: raw.lat || raw.latitude || undefined,
    lng: raw.lng || raw.longitude || undefined,
    phone: raw.phone || undefined,
    website: raw.website || undefined,
    logo_url: raw.logo || raw.logo_url || undefined,
    cover_url: raw.cover || raw.cover_url || raw.image || undefined,
    images: Array.isArray(raw.images) ? raw.images.filter((i: any) => typeof i === "string") : [],
    menu_items,
    rating: raw.rating || undefined,
    reviews_count: raw.reviews_count || undefined,
    raw_payload: raw,
  };
}
