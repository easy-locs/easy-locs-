import { supabase } from "@/integrations/supabase/client";

export async function saveSearchHistory(params: {
  userId?: string | null;
  queryText: string;
  city?: string | null;
}) {
  const q = params.queryText.trim();
  if (!q) return null;

  const { data, error } = await supabase
    .from("dino_learning_events")
    .insert({
      event_type: "search_history_saved",
      entity_id: params.userId ?? "anonymous",
      entity_type: "search",
      metric: "query",
      metadata_json: {
        userId: params.userId ?? null,
        queryText: q,
        city: params.city ?? "Dubai",
      } as any,
      new_value: 1,
      previous_value: 0,
    } as any)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function listRecentSearches(userId?: string | null, limit = 8) {
  const { data, error } = await supabase
    .from("dino_learning_events")
    .select("id, created_at, metadata_json")
    .eq("event_type", "search_history_saved")
    .eq("entity_id", userId ?? "anonymous")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;

  const seen = new Set<string>();
  const rows: Array<{ queryText: string; createdAt: string }> = [];

  for (const row of data ?? []) {
    const q = String((row as any)?.metadata_json?.queryText ?? "").trim();
    if (!q || seen.has(q.toLowerCase())) continue;
    seen.add(q.toLowerCase());
    rows.push({ queryText: q, createdAt: row.created_at });
    if (rows.length >= limit) break;
  }

  return rows;
}
