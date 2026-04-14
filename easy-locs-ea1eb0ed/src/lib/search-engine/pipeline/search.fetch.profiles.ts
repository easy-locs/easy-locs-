import { db } from "@/services/db";
import type { SearchResult } from "../search-types";

export async function fetchProfiles(query: string): Promise<SearchResult[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const { data, error } = await db
    .from("profiles")
    .select("id, full_name, avatar_url, city, role")
    .ilike("full_name", `%${q}%`)
    .limit(10);

  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    id: r.id,
    type: "profile" as const,
    title: r.full_name || "User",
    subtitle: [r.role, r.city].filter(Boolean).join(" · "),
    imageUrl: r.avatar_url,
    city: r.city,
  }));
}
