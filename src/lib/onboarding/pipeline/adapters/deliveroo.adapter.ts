/**
 * deliveroo.adapter — Transforms raw Deliveroo data into CanonicalShop.
 */
import type { CanonicalShop } from "../canonical-shop.schema";

export async function deliverooAdapter(raw: any): Promise<CanonicalShop> {
  return {
    id: raw.id,
    name: raw.name,
    location: {
      address: raw.address ?? "",
      city: raw.city ?? "",
      country: raw.country ?? "",
      lat: raw.lat ?? 0,
      lng: raw.lng ?? 0,
    },
    categories: raw.categories || [],
    products: raw.menu?.items?.map((i: any) => ({
      name: i.name,
      price: i.price,
    })) || [],
    media: {
      logo: raw.logo,
      cover: raw.cover,
      gallery: raw.images || [],
    },
    hours: raw.hours || [],
    delivery: {
      radius: raw.delivery_radius,
      fee: raw.delivery_fee,
    },
    source: {
      provider: "deliveroo",
      url: raw.url,
      confidence: 0.95,
    },
    quality: { score: 0, missingFields: [] },
  };
}
