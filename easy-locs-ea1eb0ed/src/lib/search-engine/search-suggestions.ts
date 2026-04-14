/**
 * Smart Suggestions — Context-aware, time-based, location-based, popular.
 */
import { db } from "@/services/db";
import type { SearchSuggestion } from "./search-types";

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
      const q = String((row as any)?.metadata?.queryText ?? "").trim();
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

async function getPopularSearches(): Promise<SearchSuggestion[]> {
  try {
    const { data } = await db
      .from("search_analytics")
      .select("query_text, search_count")
      .order("search_count", { ascending: false })
      .limit(8);

    return (data ?? []).map((r: any) => ({
      text: r.query_text,
      type: "popular" as const,
      icon: "🔥",
      count: r.search_count,
    }));
  } catch {
    return getTrendingFallback();
  }
}

function getTrendingFallback(): SearchSuggestion[] {
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
  const [recent, contextual, popular] = await Promise.all([
    getRecentSearches(userId),
    Promise.resolve(getTimeSuggestions()),
    getPopularSearches(),
  ]);

  const seen = new Set<string>();
  const merged: SearchSuggestion[] = [];

  for (const s of [...recent, ...contextual, ...popular]) {
    const key = s.text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(s);
  }

  return merged.slice(0, 10);
}

export async function saveToHistory(query: string, userId?: string | null) {
  const q = query.trim();
  if (!q) return;

  try {
    await db("activity_logs").insert({
      id: crypto.randomUUID(),
      action: "search_history_saved",
      entity_id: userId ?? "anonymous",
      entity_type: "search",
      metadata: { userId: userId ?? null, queryText: q },
    });
  } catch {
    // Silent fail
  }
}
