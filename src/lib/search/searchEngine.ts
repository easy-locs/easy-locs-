import { supabase } from "@/integrations/supabase/client";
import { governStorefrontQuery } from "@/lib/discovery/query-governance";

export async function runUnifiedSearch(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return { merchants: [], products: [] };

  // Single source: storefront_pages — governed
  let sfQ = (supabase as any)
    .from("storefront_pages")
    .select("id, name, slug, vertical, category, subcategory, city, address, region, rating, reviews_count, banner_url, logo_url, display_priority")
    .or(`name.ilike.%${q}%,subcategory.ilike.%${q}%,address.ilike.%${q}%`)
    .limit(20);
  sfQ = governStorefrontQuery(sfQ, "search");

  const [sfRes, { data: products }] = await Promise.all([
    sfQ,
    (supabase as any)
      .from("menu_items")
      .select("*")
      .or(`name.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%`)
      .limit(50),
  ]);

  const merchants: any[] = [];
  for (const row of sfRes.data ?? []) {
    merchants.push({ ...row, cover_image: row.banner_url || row.logo_url });
  }

  return {
    merchants,
    products: products ?? [],
  };
}
