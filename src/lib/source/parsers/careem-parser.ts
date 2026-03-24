/**
 * Careem Parser — Transforms Careem Now raw data into canonical format.
 */
import type { CanonicalShopData, CanonicalMenuItem, CanonicalMenuSection } from "./canonical-format";

export function parseCareemData(raw: any): CanonicalShopData {
  const menu_sections: CanonicalMenuSection[] = [];
  const menu_items: CanonicalMenuItem[] = [];

  const rawMenu = raw.menu || raw.menuGroups || raw.categories || [];
  if (Array.isArray(rawMenu)) {
    for (const section of rawMenu) {
      const sectionName = section.name || section.groupName || section.title || "Other";
      const items: CanonicalMenuItem[] = [];
      
      const rawItems = section.items || section.products || [];
      for (const item of rawItems) {
        const parsed: CanonicalMenuItem = {
          name: (item.name || item.title || "").replace(/\s+/g, " ").trim(),
          description: item.description || undefined,
          price: parseNum(item.price ?? item.basePrice),
          currency: item.currency || "AED",
          category: sectionName,
          image_url: item.imageUrl || item.image || undefined,
          tags: [],
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
    name: raw.name || raw.vendorName || "",
    description: raw.description || undefined,
    source_key: "careem",
    source_external_id: raw.id?.toString() || raw.vendorId?.toString() || undefined,
    vertical: "food",
    category: raw.cuisine || raw.category || undefined,
    cuisine_tags: extractTags(raw),
    address: raw.address || undefined,
    city: raw.city || undefined,
    area: raw.area || undefined,
    country: raw.country || "AE",
    lat: raw.latitude || raw.location?.lat || undefined,
    lng: raw.longitude || raw.location?.lng || undefined,
    logo_url: raw.logo || raw.logoUrl || undefined,
    cover_url: raw.coverImage || raw.heroImage || undefined,
    images: [],
    menu_sections,
    menu_items,
    rating: raw.rating || undefined,
    reviews_count: raw.reviewsCount || undefined,
    delivery_available: true,
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
  if (raw.cuisine) t.push(raw.cuisine);
  return [...new Set(t.map(x => x.toLowerCase().trim()).filter(Boolean))];
}
