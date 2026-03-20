import { supabase } from "@/integrations/supabase/client";

export async function runUnifiedSearch(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return { merchants: [], products: [] };

  const [{ data: merchants }, { data: products }] = await Promise.all([
    (supabase as any)
      .from("marketplace_listings")
      .select("*")
      .or(`name.ilike.%${q}%,subcategory.ilike.%${q}%,area.ilike.%${q}%`)
      .limit(30),
    (supabase as any)
      .from("seed_products")
      .select("*")
      .or(`name.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%`)
      .limit(50),
  ]);

  return {
    merchants: merchants ?? [],
    products: products ?? [],
  };
}
