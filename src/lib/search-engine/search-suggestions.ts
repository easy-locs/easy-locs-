/**
 * Smart Suggestions — Context-aware, time-based, location-based.
 */
import { supabase } from "@/integrations/supabase/client";
import type { SearchSuggestion } from "./search-types";

const db = supabase as any;

// ── Time-based contextual suggestions ──
function getTimeSuggestions(): SearchSuggestion[] {
  const hour = new Date().getHours();

  if (hour >= 6 && hour < 10) {
    return [
      { text: "Breakfast", type: "contextual", icon: "🥐" },
      { text: "Coffee", type: "contextual", icon: "☕" },
      { text: "Bakery", type: "contextual", icon: "🍞" },
    ];
  }
  if (hour >= 11 && hour < 14) {
    return [
      { text: "Lunch", type: "contextual", icon: "🍽️" },
      { text: "Burger", type: "contextual", icon: "🍔" },
      { text: "Salad", type: "contextual", icon: "🥗" },
    ];
  }
  if (hour >= 14 && hour < 17) {
    return [
      { text: "Coffee", type: "contextual", icon: "☕" },
      { text: "Dessert", type: "contextual", icon: "🍰" },
      { text: "Juice", type: "contextual", icon: "🧃" },
    ];
  }
  if (hour >= 17 && hour < 21) {
    return [
      { text: "Dinner", type: "contextual", icon: "🍕" },
      { text: "Sushi", type: "contextual", icon: "🍣" },
      { text: "Pizza", type: "contextual", icon: "🍕" },
    ];
  }
  return [
    { text: "Late Night", type: "contextual", icon: "🌙" },
    { text: "Shawarma", type: "contextual", icon: "🌯" },
    { text: "Burger", type: "contextual", icon: "🍔" },
  ];
}

// ── Recent searches ──
async function getRecentSearches(userId?: string | null): Promise<SearchSuggestion[]> {
  if (!userId) return [];

  try {
    const { data } = await db
      .from("activity_logs")
      .select("metadata")
      .eq("action", "search_history_saved")
      .eq("entity_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    const seen = new Set<string>();
    const results: SearchSuggestion[] = [];
    for (const row of data ?? []) {
      const q = String(row?.metadata_json?.queryText ?? "").trim();
      if (!q || seen.has(q.toLowerCase())) continue;
      seen.add(q.toLowerCase());
      results.push({ text: q, type: "recent", icon: "🕐" });
      if (results.length >= 5) break;
    }
    return results;
  } catch {
    return [];
  }
}

// ── Trending (top searched) ──
function getTrendingSuggestions(): SearchSuggestion[] {
  return [
    { text: "Pizza", type: "trending", icon: "🔥" },
    { text: "Burger", type: "trending", icon: "🔥" },
    { text: "Sushi", type: "trending", icon: "🔥" },
    { text: "Cleaning", type: "trending", icon: "🔥" },
    { text: "Pharmacy", type: "trending", icon: "🔥" },
  ];
}

export async function getSuggestions(
  userId?: string | null,
  _lat?: number,
  _lng?: number
): Promise<SearchSuggestion[]> {
  const [recent, contextual, trending] = await Promise.all([
    getRecentSearches(userId),
    Promise.resolve(getTimeSuggestions()),
    Promise.resolve(getTrendingSuggestions()),
  ]);

  // Priority: recent → contextual → trending, deduplicated
  const seen = new Set<string>();
  const merged: SearchSuggestion[] = [];

  for (const s of [...recent, ...contextual, ...trending]) {
    const key = s.text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(s);
  }

  return merged.slice(0, 10);
}

// ── Save search to history ──
export async function saveToHistory(query: string, userId?: string | null) {
  const q = query.trim();
  if (!q) return;

  try {
    await db.from("dino_learning_events").insert({
      event_type: "search_history_saved",
      entity_id: userId ?? "anonymous",
      entity_type: "search",
      metric: "query",
      metadata_json: { userId: userId ?? null, queryText: q },
      new_value: 1,
      previous_value: 0,
    });
  } catch {
    // Silent fail
  }
}
