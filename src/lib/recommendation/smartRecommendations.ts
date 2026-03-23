import { supabase } from "@/integrations/supabase/client";

export async function getSmartRecommendations(params: {
  userId?: string | null;
  limit?: number;
}) {
  const limit = params.limit ?? 12;

  // Use seed_merchants directly instead of marketplace_listings view
  const { data: merchants, error: merchantErr } = await (supabase as any)
    .from("seed_merchants")
    .select("*")
    .eq("is_active", true)
    .order("visibility_score", { ascending: false })
    .limit(80);

  if (merchantErr) throw merchantErr;

  const { data: recentEvents } = await supabase
    .from("dino_learning_events")
    .select("event_type, metadata_json, created_at")
    .in("event_type", ["merchant_view", "product_add_to_cart", "order_created", "search_used"])
    .eq("entity_id", params.userId ?? "anonymous")
    .order("created_at", { ascending: false })
    .limit(50);

  const preferredWords = new Map<string, number>();
  for (const row of recentEvents ?? []) {
    const md = (row as any)?.metadata_json ?? {};
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
    const hay = `${row.name ?? ""} ${row.subcategory ?? ""} ${row.category ?? ""} ${row.area ?? ""}`.toLowerCase();
    let boost = 0;
    for (const [word, score] of preferredWords.entries()) {
      if (hay.includes(word)) boost += score;
    }

    return {
      ...row,
      _score:
        Number(row.visibility_score ?? 0) * 0.6 +
        Number(row.rating ?? 0) * 8 +
        (row.is_featured ? 20 : 0) +
        boost * 5,
    };
  });

  return ranked.sort((a: any, b: any) => b._score - a._score).slice(0, limit);
}
