/**
 * Booking.com Parser — Transforms Booking raw data into canonical format.
 */
import type { CanonicalShopData } from "./canonical-format";

export function parseBookingData(raw: any): CanonicalShopData {
  return {
    name: raw.hotel_name || raw.name || raw.title || "",
    description: raw.description || raw.hotel_description || undefined,
    source_key: "booking",
    source_external_id: raw.hotel_id?.toString() || raw.id?.toString() || undefined,
    source_url: raw.url || raw.hotel_url || undefined,
    vertical: "property",
    category: raw.accommodation_type_name || raw.property_type || "hotel",
    cuisine_tags: [],
    address: raw.address || raw.address_line || undefined,
    city: raw.city || raw.city_name || undefined,
    area: raw.district || raw.area || undefined,
    country: raw.country_code || raw.country || undefined,
    lat: raw.latitude || raw.location?.lat || undefined,
    lng: raw.longitude || raw.location?.lng || undefined,
    phone: raw.phone || undefined,
    website: raw.website || undefined,
    logo_url: undefined,
    cover_url: raw.main_photo_url || raw.photos?.[0]?.url || undefined,
    images: (raw.photos || []).slice(0, 20).map((p: any) => typeof p === "string" ? p : p.url).filter(Boolean),
    menu_sections: [],
    menu_items: [],
    rating: raw.review_score ? raw.review_score / 2 : raw.rating || undefined, // Booking uses 0-10
    reviews_count: raw.review_nr || raw.number_of_reviews || undefined,
    price_level: raw.price_level || undefined,
    raw_payload: raw,
  };
}
