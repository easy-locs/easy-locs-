import { supabase } from "@/integrations/supabase/client";

export async function runUnifiedSearch(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return { merchants: [], products: [] };

  const [sfRes, seedRes, { data: products }] = await Promise.all([
    (supabase as any)
      .from("storefront_pages")
      .select("id, name, slug, vertical, category, subcategory, city, address, region, rating, reviews_count, banner_url, logo_url, launch_status")
      .in("launch_status", ["launched", "ready", "active"])
      .not("visibility_mode", "eq", "hidden")
      .not("route_status", "eq", "broken")
      .or(`name.ilike.%${q}%,subcategory.ilike.%${q}%,address.ilike.%${q}%`)
      .limit(20),
    (supabase as any)
      .from("seed_merchants")
      .select("id, name, category, subcategory, city, area, rating, review_count, cover_image, is_open, visibility_score")
      .eq("is_active", true)
      .not("is_flagged", "eq", true)
      .or(`name.ilike.%${q}%,subcategory.ilike.%${q}%,area.ilike.%${q}%`)
      .order("visibility_score", { ascending: false })
      .limit(20),
    (supabase as any)
      .from("seed_products")
      .select("*")
      .or(`name.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%`)
      .limit(50),
  ]);

  // Merge storefronts + seeds, dedup by id
  const seenIds = new Set<string>();
  const merchants: any[] = [];
  for (const row of sfRes.data ?? []) {
    seenIds.add(row.id);
    merchants.push({ ...row, cover_image: row.banner_url || row.logo_url });
  }
  for (const row of seedRes.data ?? []) {
    if (!seenIds.has(row.id)) merchants.push(row);
  }

  return {
    merchants,
    products: products ?? [],
  };
}
