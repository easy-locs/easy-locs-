import { supabase } from "@/integrations/supabase/client";

export interface HomeEngineSnapshot {
  featuredMerchants: any[];
  recommendedMerchants: any[];
  trendingMerchants: any[];
  openNowMerchants: any[];
  promos: any[];
}

function scoreMerchant(row: any) {
  return (
    Number(row.visibility_score ?? 0) * 0.45 +
    Number(row.rating ?? 0) * 12 +
    (row.is_featured ? 20 : 0) +
    (row.is_open ? 10 : 0) +
    Math.min(Number(row.review_count ?? 0), 200) * 0.08
  );
}

export async function getHomeEngineSnapshot(params?: {
  limit?: number;
  category?: "food" | "grocery" | "services" | null;
}) {
  const limit = params?.limit ?? 12;

  let merchantQuery = (supabase as any)
    .from("seed_merchants")
    .select("*")
    .eq("is_active", true)
    .order("visibility_score", { ascending: false })
    .limit(120);

  if (params?.category) {
    merchantQuery = merchantQuery.eq("category", params.category);
  }

  const [{ data: merchants, error: merchantErr }, { data: promos, error: promoErr }] =
    await Promise.all([
      merchantQuery,
      (supabase as any)
        .from("seed_merchant_promos")
        .select("*, seed_merchants(*)")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  if (merchantErr) throw merchantErr;
  if (promoErr) throw promoErr;

  const rows = (merchants ?? []).map((row: any) => ({
    ...row,
    _score: scoreMerchant(row),
  }));

  const featuredMerchants = rows
    .filter((row: any) => !!row.is_featured)
    .sort((a: any, b: any) => b._score - a._score)
    .slice(0, limit);

  const recommendedMerchants = rows
    .sort((a: any, b: any) => b._score - a._score)
    .slice(0, limit);

  const trendingMerchants = rows
    .sort(
      (a: any, b: any) =>
        Number(b.review_count ?? 0) - Number(a.review_count ?? 0) ||
        Number(b.rating ?? 0) - Number(a.rating ?? 0)
    )
    .slice(0, limit);

  const openNowMerchants = rows
    .filter((row: any) => !!row.is_open)
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

export async function refreshMerchantVisibilityScores(limit = 200) {
  const { data: merchants, error } = await (supabase as any)
    .from("seed_merchants")
    .select("*")
    .limit(limit);

  if (error) throw error;

  const results: Array<{ merchantId: string; ok: boolean; score?: number; error?: string }> = [];

  for (const merchant of merchants ?? []) {
    try {
      const nextScore =
        Number(merchant.rating ?? 0) * 14 +
        Math.min(Number(merchant.review_count ?? 0), 250) * 0.1 +
        (merchant.is_featured ? 18 : 0) +
        (merchant.is_open ? 10 : 0) +
        (merchant.promo_active ? 8 : 0);

      const { error: updateErr } = await (supabase as any)
        .from("seed_merchants")
        .update({
          visibility_score: Number(nextScore.toFixed(2)),
          updated_at: new Date().toISOString(),
        })
        .eq("id", merchant.id);

      if (updateErr) throw updateErr;
      results.push({ merchantId: merchant.id, ok: true, score: Number(nextScore.toFixed(2)) });
    } catch (err: any) {
      results.push({ merchantId: merchant.id, ok: false, error: err.message || "Visibility refresh failed" });
    }
  }

  return results;
}
