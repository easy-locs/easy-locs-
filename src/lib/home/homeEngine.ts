import { supabase } from "@/integrations/supabase/client";
import { governStorefrontQuery } from "@/lib/discovery/query-governance";

export interface HomeEngineSnapshot {
  featuredMerchants: any[];
  recommendedMerchants: any[];
  trendingMerchants: any[];
  openNowMerchants: any[];
  promos: any[];
}

function scoreMerchant(row: any) {
  return (
    Number(row.display_priority ?? 0) * 0.45 +
    Number(row.rating ?? 0) * 12 +
    (row.display_priority > 80 ? 20 : 0) +
    Math.min(Number(row.reviews_count ?? 0), 200) * 0.08
  );
}

export async function getHomeEngineSnapshot(params?: {
  limit?: number;
  category?: "food" | "grocery" | "services" | null;
}) {
  const limit = params?.limit ?? 12;

  // Single source: storefront_pages — governed
  let merchantQuery = (supabase as any)
    .from("storefront_pages")
    .select("id, name, slug, vertical, category, subcategory, city, region, rating, reviews_count, banner_url, logo_url, display_priority, ranking_score")
    .limit(120);
  merchantQuery = governStorefrontQuery(merchantQuery, "home");

  if (params?.category) {
    merchantQuery = merchantQuery.eq("vertical", params.category);
  }

  const [{ data: merchants, error: merchantErr }, { data: promos, error: promoErr }] =
    await Promise.all([
      merchantQuery,
      (supabase as any)
        .from("seed_merchant_promos")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  if (merchantErr) throw merchantErr;
  if (promoErr) throw promoErr;

  const rows = (merchants ?? []).map((row: any) => ({
    ...row,
    name: row.name,
    cover_image: row.banner_url || row.logo_url,
    _score: scoreMerchant(row),
  }));

  const featuredMerchants = rows
    .filter((row: any) => (row.display_priority ?? 0) > 70)
    .sort((a: any, b: any) => b._score - a._score)
    .slice(0, limit);

  const recommendedMerchants = rows
    .sort((a: any, b: any) => b._score - a._score)
    .slice(0, limit);

  const trendingMerchants = rows
    .sort(
      (a: any, b: any) =>
        Number(b.reviews_count ?? 0) - Number(a.reviews_count ?? 0) ||
        Number(b.rating ?? 0) - Number(a.rating ?? 0)
    )
    .slice(0, limit);

  const openNowMerchants = rows
    .sort((a: any, b: any) => b._score - a._score)
    .slice(0, limit);

  return {
    featuredMerchants,
    recommendedMerchants,
    trendingMerchants,
    openNowMerchants,
    promos: promos ?? [],
  } as HomeEngineSnapshot;
}
