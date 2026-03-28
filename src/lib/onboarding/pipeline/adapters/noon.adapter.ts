/**
 * noon.adapter — Transforms raw Noon/retail data into CanonicalShop.
 * Single responsibility: source mapping only.
 */
import type { CanonicalShop } from "../canonical-shop.schema";

export async function noonAdapter(raw: any): Promise<CanonicalShop> {
  return {
    id: raw.id || raw.seller_id || "",
    name: raw.name || raw.store_name || "",
    location: {
      address: raw.address || raw.warehouse_address || "",
      city: raw.city || "",
      country: raw.country || "AE",
      lat: raw.lat || raw.latitude || 0,
      lng: raw.lng || raw.longitude || 0,
    },
    categories: raw.categories || (raw.category ? [raw.category] : []),
    products: (raw.products || raw.catalog || []).map((p: any) => ({
      name: p.name || p.title || "",
      price: p.price || p.sale_price || 0,
      category: p.category || undefined,
    })),
    media: {
      logo: raw.logo || raw.brand_logo || undefined,
      cover: raw.cover || raw.banner || undefined,
      gallery: raw.images || [],
    },
    hours: [],
    delivery: {
      radius: undefined,
      fee: raw.shipping_fee || raw.delivery_fee || undefined,
    },
    source: {
      provider: "noon",
      url: raw.url || raw.source_url || undefined,
      confidence: 0.80,
    },
    quality: { score: 0, missingFields: [] },
  };
}
