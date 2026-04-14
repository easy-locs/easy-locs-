import { db } from "@/services/db";
import { localStore } from "@/services/local-store";
import type { SearchSuggestion } from "./search-types";

const STORE_PILLAR = "radar" as const;
const RECENT_NAME = "recent_searches";
const MAX_RECENT = 10;

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

function getRecentSearches(): SearchSuggestion[] {
  try {
    const raw = localStore.getJson<string[]>(STORE_PILLAR, RECENT_NAME);
    if (!Array.isArray(raw)) return [];
    return raw.slice(0, 5).map((text) => ({ text, type: "recent" as const, icon: "🕐" }));
  } catch {
    return [];
  }
}

interface SearchAnalyticsRow {
  query_text: string;
  search_count: number;
}

async function getPopularSearches(): Promise<SearchSuggestion[]> {
  try {
    const { data } = await db
      .from("search_analytics")
      .select("query_text, search_count")
      .order("search_count", { ascending: false })
      .limit(8);

    return (data ?? []).map((r: SearchAnalyticsRow) => ({
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
  _userId?: string | null,
  _lat?: number,
  _lng?: number
): Promise<SearchSuggestion[]> {
  const [recent, contextual, popular] = await Promise.all([
    Promise.resolve(getRecentSearches()),
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

  return merged.slice(0, 12);
}

export function saveToHistory(query: string, _userId?: string | null) {
  const q = query.trim();
  if (!q) return;

  try {
    const existing = localStore.getJson<string[]>(STORE_PILLAR, RECENT_NAME) ?? [];
    const filtered = existing.filter((e) => e.toLowerCase() !== q.toLowerCase());
    const updated = [q, ...filtered].slice(0, MAX_RECENT);
    localStore.setJson(STORE_PILLAR, RECENT_NAME, updated);
  } catch {
    // Silent fail
  }
}
