import { db } from "@/services/db";
import type { SearchResult } from "../search-types";

interface ServiceRow {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  currency: string | null;
  category: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  rating: number | null;
  image_url: string | null;
}

export async function fetchServices(query: string): Promise<SearchResult[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const { data, error } = await db
    .from("listings")
    .select("id, title, description, price, currency, category, city, latitude, longitude, rating, image_url")
    .or(`title.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%`)
    .limit(15);

  if (error) throw error;

  return (data ?? []).map((r: ServiceRow) => ({
    id: r.id,
    type: "service" as const,
    title: r.title,
    subtitle: [r.category, r.city].filter(Boolean).join(" · "),
    imageUrl: r.image_url ?? undefined,
    rating: r.rating ?? undefined,
    price: r.price ?? undefined,
    currency: r.currency ?? "USD",
    city: r.city ?? undefined,
    lat: r.latitude ?? undefined,
    lng: r.longitude ?? undefined,
  }));
}
