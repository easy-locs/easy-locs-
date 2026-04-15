import { supabase } from "@/integrations/supabase/client";

export interface FirecrawlSearchResult {
  url: string;
  title: string;
  description: string;
  markdown?: string;
}

export interface FirecrawlScrapeResult {
  markdown: string;
  metadata: Record<string, unknown>;
  links: string[];
}

async function callFirecrawl(action: string, body: Record<string, unknown>): Promise<unknown> {
  const { data, error } = await supabase.functions.invoke("scrape-proxy", {
    body: { action, ...body },
  });
  if (error) throw new Error(`Edge function error: ${error.message}`);
  return data;
}

export async function firecrawlSearch(query: string, options?: {
  limit?: number;
  country?: string;
  lang?: string;
}): Promise<FirecrawlSearchResult[]> {
  try {
    const data = await callFirecrawl("search", {
      query,
      limit: options?.limit ?? 3,
      country: options?.country,
      lang: options?.lang ?? "en",
      scrapeOptions: { formats: ["markdown"] },
    }) as Record<string, unknown>;

    const results = (data?.data ?? []) as Array<Record<string, unknown>>;
    return results.map(r => ({
      url: String(r.url ?? ""),
      title: String(r.title ?? ""),
      description: String(r.description ?? ""),
      markdown: r.markdown ? String(r.markdown) : undefined,
    }));
  } catch (err) {
    console.warn("[firecrawl-client] search failed:", err);
    return [];
  }
}

export async function firecrawlScrape(url: string, options?: {
  onlyMainContent?: boolean;
  waitFor?: number;
}): Promise<FirecrawlScrapeResult | null> {
  try {
    const data = await callFirecrawl("scrape", {
      url,
      formats: ["markdown", "links"],
      onlyMainContent: options?.onlyMainContent ?? true,
      waitFor: options?.waitFor ?? 2000,
    }) as Record<string, unknown>;

    const inner = (data?.data ?? data) as Record<string, unknown>;
    return {
      markdown: String(inner?.markdown ?? ""),
      metadata: (inner?.metadata ?? {}) as Record<string, unknown>,
      links: ((inner?.links ?? []) as string[]),
    };
  } catch (err) {
    console.warn("[firecrawl-client] scrape failed:", err);
    return null;
  }
}
