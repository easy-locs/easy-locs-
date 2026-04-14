import { db } from "@/services/db";
import type { SearchResult } from "../search-types";

export async function fetchServices(query: string): Promise<SearchResult[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const { data, error } = await db
    .from("listings")
    .select("id, title, description, price, currency, category, city, latitude, longitude, rating, image_url")
    .or(`title.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%`)
    .limit(15);

  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    id: r.id,
    type: "service" as const,
    title: r.title,
    subtitle: [r.category, r.city].filter(Boolean).join(" · "),
    imageUrl: r.image_url,
    rating: r.rating,
    price: r.price,
    currency: r.currency ?? "USD",
    city: r.city,
    lat: r.latitude,
    lng: r.longitude,
  }));
}
