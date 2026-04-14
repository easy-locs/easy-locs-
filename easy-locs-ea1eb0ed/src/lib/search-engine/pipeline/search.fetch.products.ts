import { db } from "@/services/db";
import type { SearchResult } from "../search-types";

interface ProductRow {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  category: string | null;
  image_url: string | null;
  merchant_id: string | null;
  currency?: string | null;
}

export async function fetchProducts(query: string): Promise<SearchResult[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const { data, error } = await db
    .from("seed_products")
    .select("id, name, description, price, category, image_url, merchant_id")
    .or(`name.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%`)
    .limit(20);

  if (error) throw error;

  return (data ?? []).map((p: ProductRow) => ({
    id: p.id,
    type: "product" as const,
    title: p.name,
    subtitle: p.category || "Product",
    imageUrl: p.image_url ?? undefined,
    price: p.price ?? undefined,
    currency: p.currency ?? undefined,
    shopId: p.merchant_id ?? undefined,
  }));
}
