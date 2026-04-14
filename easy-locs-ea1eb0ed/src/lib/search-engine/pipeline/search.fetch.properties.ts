import { db } from "@/services/db";
import type { SearchResult } from "../search-types";

export async function fetchProperties(query: string): Promise<SearchResult[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const { data, error } = await db
    .from("properties")
    .select("id, name, address, city, property_type, latitude, longitude")
    .or(`name.ilike.%${q}%,address.ilike.%${q}%,city.ilike.%${q}%`)
    .limit(15);

  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    id: r.id,
    type: "property" as const,
    title: r.name || r.address || "Property",
    subtitle: [r.property_type, r.city].filter(Boolean).join(" · "),
    lat: r.latitude,
    lng: r.longitude,
    city: r.city,
    propertyType: r.property_type,
  }));
}
