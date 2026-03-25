import { supabase } from "@/integrations/supabase/client";
import { governStorefrontQuery } from "@/lib/discovery/query-governance";

export async function getSmartRecommendations(params: {
  userId?: string | null;
  limit?: number;
}) {
  const limit = params.limit ?? 12;

  // Single source: storefront_pages — governed
  let sfQ = (supabase as any)
    .from("storefront_pages")
    .select("id, name, slug, vertical, category, subcategory, city, region, rating, reviews_count, banner_url, logo_url, display_priority, ranking_score")
    .limit(80);
  sfQ = governStorefrontQuery(sfQ, "discover");
  const { data: merchants, error: merchantErr } = await sfQ;

  if (merchantErr) throw merchantErr;

  const { data: recentEvents } = await (supabase as any)
    .from("activity_logs")
    .select("action, metadata, created_at")
    .in("action", ["merchant_view", "product_add_to_cart", "order_created", "search_used"])
    .eq("entity_id", params.userId ?? "anonymous")
    .order("created_at", { ascending: false })
    .limit(50);

  const preferredWords = new Map<string, number>();
  for (const row of recentEvents ?? []) {
    const md = (row as any)?.metadata ?? {};
    const text = [md.queryText, md.merchantName, md.subcategory, md.category]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    for (const token of text.split(/[\s·,/-]+/g)) {
      if (!token || token.length < 3) continue;
      preferredWords.set(token, (preferredWords.get(token) ?? 0) + 1);
    }
  }

  const ranked = (merchants ?? []).map((row: any) => {
    const hay = `${row.name ?? ""} ${row.subcategory ?? ""} ${row.category ?? ""} ${row.region ?? ""}`.toLowerCase();
    let boost = 0;
    for (const [word, score] of preferredWords.entries()) {
      if (hay.includes(word)) boost += score;
    }

    return {
      ...row,
      cover_image: row.banner_url || row.logo_url,
      _score:
        Number(row.display_priority ?? 0) * 0.6 +
        Number(row.rating ?? 0) * 8 +
        ((row.display_priority ?? 0) > 70 ? 20 : 0) +
        boost * 5,
    };
  });

  return ranked.sort((a: any, b: any) => b._score - a._score).slice(0, limit);
}
