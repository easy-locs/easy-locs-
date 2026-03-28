/**
 * search.fetch.products — Fetches seed_products results.
 */
import { supabase } from "@/integrations/supabase/client";
import type { SearchResult } from "../search-types";

const db = supabase as any;

export async function fetchProducts(query: string): Promise<SearchResult[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const { data, error } = await db
    .from("seed_products")
    .select("id, name, description, price, category, image_url, merchant_id")
    .or(`name.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%`)
    .limit(20);

  if (error) throw error;

  return (data ?? []).map((p: any) => ({
    id: p.id,
    type: "product" as const,
    title: p.name,
    subtitle: p.category || "Product",
    imageUrl: p.image_url,
    price: p.price,
    currency: p.currency || undefined,
    shopId: p.merchant_id,
  }));
}
