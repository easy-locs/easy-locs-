/**
 * careem.adapter — Transforms raw Careem data into CanonicalShop.
 * Single responsibility: source mapping only.
 */
import type { CanonicalShop } from "../canonical-shop.schema";

export async function careemAdapter(raw: any): Promise<CanonicalShop> {
  return {
    id: raw.id || raw.restaurant_id || "",
    name: raw.name || raw.title || "",
    location: {
      address: raw.address || raw.location?.address || "",
      city: raw.city || raw.location?.city || "",
      country: raw.country || raw.location?.country || "AE",
      lat: raw.latitude || raw.location?.lat || 0,
      lng: raw.longitude || raw.location?.lng || 0,
    },
    categories: raw.cuisines || raw.categories || [],
    products: (raw.menu_items || raw.items || []).map((i: any) => ({
      name: i.name || i.title || "",
      price: i.price || i.unit_price || 0,
      category: i.category || i.section || undefined,
    })),
    media: {
      logo: raw.logo_url || raw.logo || undefined,
      cover: raw.hero_image || raw.cover_image || undefined,
      gallery: raw.images || raw.gallery || [],
    },
    hours: (raw.opening_hours || []).map((h: any) => ({
      day: h.day || h.day_of_week || "",
      open: h.open || h.opens_at || "",
      close: h.close || h.closes_at || "",
    })),
    delivery: {
      radius: raw.delivery_radius || undefined,
      fee: raw.delivery_fee || raw.delivery_charge || undefined,
    },
    source: {
      provider: "careem",
      url: raw.url || raw.source_url || undefined,
      confidence: 0.85,
    },
    quality: { score: 0, missingFields: [] },
  };
}
