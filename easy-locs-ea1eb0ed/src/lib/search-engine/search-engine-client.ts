import { db } from "@/services/db";

export interface SearchEngineResult {
  id: string;
  type: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  rating: number | null;
  price: number | null;
  currency: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  slug: string | null;
  is_open: boolean | null;
  rank: number;
}

export interface SearchEngineOptions {
  query: string;
  types?: string[];
  page?: number;
  limit?: number;
  filters?: {
    city?: string;
    vertical?: string;
    category?: string;
    min_rating?: number;
    price_min?: number;
    price_max?: number;
    open_now?: boolean;
  };
  sort?: string;
}

export interface SearchEngineResponse {
  results: SearchEngineResult[];
  total: number;
  page: number;
  limit: number;
  engine: "meilisearch" | "postgres_fts" | "fallback";
  processingTimeMs?: number;
}

export async function searchViaEngine(
  options: SearchEngineOptions,
): Promise<SearchEngineResponse> {
  const { query, types, page = 1, limit = 20, filters = {}, sort } = options;

  if (!query || query.trim().length < 2) {
    return { results: [], total: 0, page, limit, engine: "fallback" };
  }

  try {
    const { data, error } = await db.functions.invoke("marketplace-router", {
      body: {
        action: "search",
        query,
        types,
        filters: {
          city: filters.city,
          vertical: filters.vertical,
          category: filters.category,
          min_rating: filters.min_rating,
          price_min: filters.price_min,
          price_max: filters.price_max,
        },
        page,
        limit,
      },
    });

    if (!error && data?.engine === "meilisearch") {
      return data as SearchEngineResponse;
    }
  } catch {
  }

  try {
    const { data, error } = await db.functions.invoke("search-global", {
      body: {
        query,
        types,
        page,
        limit,
        min_rating: filters.min_rating,
        price_min: filters.price_min,
        price_max: filters.price_max,
        city: filters.city,
        vertical: filters.vertical === "all" ? undefined : filters.vertical,
        category: filters.category,
        open_now: filters.open_now,
        sort,
      },
    });

    if (error) throw error;

    return {
      results: data.results ?? [],
      total: data.total ?? 0,
      page: data.page ?? page,
      limit: data.limit ?? limit,
      engine: "postgres_fts",
    };
  } catch {
    return { results: [], total: 0, page, limit, engine: "fallback" };
  }
}

export async function triggerSearchIndexSync(): Promise<Record<string, number>> {
  const { data, error } = await db.functions.invoke("system-router", {
    body: { action: "sync-search-index" },
  });

  if (error) throw error;
  return data?.synced ?? {};
}

export async function getSearchAnalytics(): Promise<
  Array<{ query_text: string; search_count: number; last_searched_at: string }>
> {
  const { data, error } = await db.functions.invoke("system-router", {
    body: { action: "search-analytics" },
  });

  if (error) throw error;
  return data?.analytics ?? [];
}
