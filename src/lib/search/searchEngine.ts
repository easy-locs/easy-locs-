import { supabase } from "@/integrations/supabase/client";
import { governStorefrontQuery, governSeedQuery } from "@/lib/discovery/query-governance";

export async function runUnifiedSearch(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return { merchants: [], products: [] };

  // Storefront query — governed (no launch_status)
  let sfQ = (supabase as any)
    .from("storefront_pages")
    .select("id, name, slug, vertical, category, subcategory, city, address, region, rating, reviews_count, banner_url, logo_url, display_priority")
    .or(`name.ilike.%${q}%,subcategory.ilike.%${q}%,address.ilike.%${q}%`)
    .limit(20);
  sfQ = governStorefrontQuery(sfQ, "search");

  // Seed query — governed
  let seedQ = (supabase as any)
    .from("seed_merchants")
    .select("id, name, category, subcategory, city, area, rating, review_count, cover_image, is_open, visibility_score")
    .or(`name.ilike.%${q}%,subcategory.ilike.%${q}%,area.ilike.%${q}%`)
    .limit(20);
  seedQ = governSeedQuery(seedQ);

  const [sfRes, seedRes, { data: products }] = await Promise.all([
    sfQ,
    seedQ,
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
