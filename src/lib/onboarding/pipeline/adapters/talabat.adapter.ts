/**
 * talabat.adapter — Transforms raw Talabat data into CanonicalShop.
 */
import type { CanonicalShop } from "../canonical-shop.schema";

export async function talabatAdapter(raw: any): Promise<CanonicalShop> {
  return {
    id: raw.id || raw.restaurant_id || "",
    name: raw.name || raw.restaurant_name || "",
    location: {
      address: raw.address ?? "",
      city: raw.city ?? raw.area ?? "",
      country: raw.country ?? "AE",
      lat: raw.latitude ?? raw.lat ?? 0,
      lng: raw.longitude ?? raw.lng ?? 0,
    },
    categories: raw.cuisines || raw.categories || [],
    products: raw.menu_items?.map((i: any) => ({
      name: i.name,
      price: i.price,
      category: i.category,
    })) || [],
    media: {
      logo: raw.logo_url || raw.logo,
      cover: raw.cover_url || raw.hero_image,
      gallery: raw.gallery || [],
    },
    hours: raw.opening_hours || [],
    delivery: {
      radius: raw.delivery_radius,
      fee: raw.delivery_fee ?? raw.delivery_charge,
    },
    source: {
      provider: "talabat",
      url: raw.url,
      confidence: 0.90,
    },
    quality: { score: 0, missingFields: [] },
  };
}
