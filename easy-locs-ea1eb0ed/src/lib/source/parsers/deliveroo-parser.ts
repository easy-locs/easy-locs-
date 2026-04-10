/**
 * Deliveroo Parser — Transforms Deliveroo raw data into canonical format.
 */
import type { CanonicalShopData, CanonicalMenuItem, CanonicalMenuSection } from "./canonical-format";

export function parseDeliverooData(raw: any): CanonicalShopData {
  const menu_sections: CanonicalMenuSection[] = [];
  const menu_items: CanonicalMenuItem[] = [];

  // Parse menu sections
  const rawMenu = raw.menu || raw.menu_sections || raw.categories || [];
  if (Array.isArray(rawMenu)) {
    for (const section of rawMenu) {
      const sectionName = section.name || section.title || section.category_name || "Other";
      const items: CanonicalMenuItem[] = [];
      
      const rawItems = section.items || section.products || section.menu_items || [];
      for (const item of rawItems) {
        const parsed: CanonicalMenuItem = {
          name: cleanProductName(item.name || item.title || ""),
          description: item.description || item.desc || undefined,
          price: parsePrice(item.price ?? item.unit_price ?? item.total),
          currency: item.currency || "AED",
          category: sectionName,
          image_url: item.image?.url || item.image_url || item.photo || undefined,
          tags: item.tags || [],
          is_available: item.available !== false,
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
    name: raw.name || raw.restaurant_name || raw.title || "",
    description: raw.description || raw.about || undefined,
    source_key: "deliveroo",
    source_external_id: raw.id?.toString() || raw.restaurant_id?.toString() || undefined,
    source_url: raw.url || raw.share_url || undefined,
    vertical: "food",
    category: raw.cuisine_type || raw.category || undefined,
    subcategory: raw.subcategory || undefined,
    cuisine_tags: parseCuisineTags(raw),
    address: raw.address || raw.location?.address || undefined,
    city: raw.city || raw.location?.city || undefined,
    area: raw.area || raw.neighborhood || undefined,
    country: raw.country || "AE",
    lat: raw.latitude || raw.location?.lat || raw.coordinates?.latitude || undefined,
    lng: raw.longitude || raw.location?.lng || raw.coordinates?.longitude || undefined,
    phone: raw.phone || raw.contact?.phone || undefined,
    website: raw.website || undefined,
    logo_url: raw.logo || raw.logo_url || undefined,
    cover_url: raw.cover_image || raw.hero_image || raw.header_image || undefined,
    images: extractImages(raw),
    menu_sections,
    menu_items,
    rating: raw.rating || raw.ratings?.overall || undefined,
    reviews_count: raw.reviews_count || raw.ratings?.count || undefined,
    price_level: raw.price_range || raw.price_level || undefined,
    hours: raw.opening_hours || raw.hours || undefined,
    delivery_available: raw.delivery !== false,
    dine_in: raw.dine_in || undefined,
    takeaway: raw.takeaway || raw.pickup || undefined,
    halal: raw.halal || raw.tags?.includes("halal") || undefined,
    raw_payload: raw,
  };
}

function cleanProductName(name: string): string {
  return name.replace(/\s+/g, " ").trim();
}

function parsePrice(val: any): number | undefined {
  if (val == null) return undefined;
  const n = typeof val === "string" ? parseFloat(val.replace(/[^0-9.]/g, "")) : Number(val);
  return isNaN(n) ? undefined : n;
}

function parseCuisineTags(raw: any): string[] {
  const tags: string[] = [];
  if (Array.isArray(raw.cuisines)) tags.push(...raw.cuisines.map((c: any) => typeof c === "string" ? c : c.name));
  if (Array.isArray(raw.tags)) tags.push(...raw.tags.filter((t: any) => typeof t === "string"));
  if (raw.cuisine_type) tags.push(raw.cuisine_type);
  return [...new Set(tags.map(t => t.toLowerCase().trim()).filter(Boolean))];
}

function extractImages(raw: any): string[] {
  const imgs: string[] = [];
  if (Array.isArray(raw.images)) imgs.push(...raw.images.map((i: any) => typeof i === "string" ? i : i.url).filter(Boolean));
  if (Array.isArray(raw.gallery)) imgs.push(...raw.gallery.filter((i: any) => typeof i === "string"));
  if (raw.cover_image) imgs.push(raw.cover_image);
  return [...new Set(imgs)];
}
