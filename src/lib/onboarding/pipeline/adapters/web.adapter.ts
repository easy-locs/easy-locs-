/**
 * web.adapter — Transforms raw web-scraped data into CanonicalShop.
 */
import type { CanonicalShop } from "../canonical-shop.schema";

export async function webAdapter(raw: any): Promise<CanonicalShop> {
  return {
    id: raw.id || raw.url || "",
    name: raw.name || raw.title || "",
    location: {
      address: raw.address ?? "",
      city: raw.city ?? "",
      country: raw.country ?? "",
      lat: raw.lat ?? 0,
      lng: raw.lng ?? 0,
    },
    categories: raw.categories || [],
    products: raw.products?.map((p: any) => ({
      name: p.name,
      price: p.price ?? 0,
    })) || [],
    media: {
      logo: raw.logo,
      cover: raw.cover || raw.og_image,
      gallery: raw.images || [],
    },
    hours: raw.hours || [],
    delivery: {
      radius: raw.delivery_radius,
      fee: raw.delivery_fee,
    },
    source: {
      provider: "web",
      url: raw.url,
      confidence: 0.70,
    },
    quality: { score: 0, missingFields: [] },
  };
}
