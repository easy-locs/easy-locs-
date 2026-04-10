/**
 * Talabat Parser — Transforms Talabat raw data into canonical format.
 */
import type { CanonicalShopData, CanonicalMenuItem, CanonicalMenuSection } from "./canonical-format";

export function parseTalabatData(raw: any): CanonicalShopData {
  const menu_sections: CanonicalMenuSection[] = [];
  const menu_items: CanonicalMenuItem[] = [];

  const rawMenu = raw.menu || raw.menuCategories || raw.sections || [];
  if (Array.isArray(rawMenu)) {
    for (const section of rawMenu) {
      const sectionName = section.name || section.categoryName || section.title || "Other";
      const items: CanonicalMenuItem[] = [];
      
      const rawItems = section.items || section.menuItems || section.products || [];
      for (const item of rawItems) {
        const parsed: CanonicalMenuItem = {
          name: (item.name || item.itemName || item.title || "").replace(/\s+/g, " ").trim(),
          description: item.description || item.itemDescription || undefined,
          price: parseNum(item.price ?? item.unitPrice ?? item.basePrice),
          currency: item.currency || "AED",
          category: sectionName,
          image_url: item.heroImage || item.image || item.imageUrl || undefined,
          tags: item.tags || [],
          is_available: item.isAvailable !== false && item.outOfStock !== true,
        };
        items.push(parsed);
        menu_items.push(parsed);
      }
      
      if (items.length > 0) {
        menu_sections.push({ name: sectionName, items });
      }
    }
  }

  return {
    name: raw.name || raw.restaurantName || "",
    description: raw.description || raw.about || undefined,
    source_key: "talabat",
    source_external_id: raw.id?.toString() || raw.branchId?.toString() || undefined,
    source_url: raw.url || raw.shareUrl || undefined,
    vertical: "food",
    category: raw.cuisineType || raw.category || undefined,
    subcategory: raw.subcategory || undefined,
    cuisine_tags: extractTags(raw),
    address: raw.address || raw.deliveryArea || undefined,
    city: raw.city || raw.cityName || undefined,
    area: raw.area || raw.areaName || undefined,
    country: raw.country || "AE",
    lat: raw.latitude || raw.location?.lat || undefined,
    lng: raw.longitude || raw.location?.lng || undefined,
    phone: raw.phone || undefined,
    website: raw.website || undefined,
    logo_url: raw.logo || raw.logoUrl || undefined,
    cover_url: raw.heroImage || raw.coverImage || raw.headerImage || undefined,
    images: extractImgs(raw),
    menu_sections,
    menu_items,
    rating: raw.rating || raw.avgRating || undefined,
    reviews_count: raw.reviewCount || raw.totalReviews || undefined,
    price_level: raw.priceRange || undefined,
    hours: raw.openingHours || raw.workingHours || undefined,
    delivery_available: raw.isDeliveryAvailable !== false,
    halal: raw.isHalal || raw.halal || undefined,
    raw_payload: raw,
  };
}

function parseNum(val: any): number | undefined {
  if (val == null) return undefined;
  const n = typeof val === "string" ? parseFloat(val.replace(/[^0-9.]/g, "")) : Number(val);
  return isNaN(n) ? undefined : n;
}

function extractTags(raw: any): string[] {
  const t: string[] = [];
  if (Array.isArray(raw.cuisines)) t.push(...raw.cuisines.map((c: any) => typeof c === "string" ? c : c.name));
  if (Array.isArray(raw.tags)) t.push(...raw.tags.filter((x: any) => typeof x === "string"));
  return [...new Set(t.map(x => x.toLowerCase().trim()).filter(Boolean))];
}

function extractImgs(raw: any): string[] {
  const imgs: string[] = [];
  if (Array.isArray(raw.images)) imgs.push(...raw.images.filter((i: any) => typeof i === "string"));
  if (Array.isArray(raw.gallery)) imgs.push(...raw.gallery.filter((i: any) => typeof i === "string"));
  return [...new Set(imgs)];
}
