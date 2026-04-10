/**
 * Firecrawl shared module — canonical helper for all edge functions.
 * Wraps Firecrawl API with timeouts, retries, rate limiting, and logging.
 */

const FIRECRAWL_BASE = "https://api.firecrawl.dev/v1";
const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;

function getApiKey(): string {
  const key = Deno.env.get("FIRECRAWL_API_KEY");
  if (!key) throw new Error("[firecrawl] FIRECRAWL_API_KEY not configured");
  return key;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function firecrawlRequest(path: string, body: Record<string, any>, retries = MAX_RETRIES): Promise<any> {
  const apiKey = getApiKey();
  const url = `${FIRECRAWL_BASE}${path}`;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetchWithTimeout(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        const errMsg = data?.error || `Firecrawl ${res.status}`;
        if (res.status === 429 && attempt < retries) {
          // Rate limited — wait and retry
          await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
          continue;
        }
        throw new Error(errMsg);
      }

      return data;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error("[firecrawl] Request failed after retries");
}

/**
 * Scrape a single URL — extract markdown, HTML, structured data.
 */
export async function firecrawlScrape(url: string, options?: {
  formats?: string[];
  onlyMainContent?: boolean;
  waitFor?: number;
}): Promise<any> {
  console.log("[firecrawl] scrape:", url);
  return firecrawlRequest("/scrape", {
    url,
    formats: options?.formats || ["markdown"],
    onlyMainContent: options?.onlyMainContent ?? true,
    waitFor: options?.waitFor,
  });
}

/**
 * Map a website — discover all URLs (fast sitemap).
 */
export async function firecrawlMap(url: string, options?: {
  search?: string;
  limit?: number;
  includeSubdomains?: boolean;
}): Promise<any> {
  console.log("[firecrawl] map:", url);
  return firecrawlRequest("/map", {
    url,
    search: options?.search,
    limit: options?.limit || 5000,
    includeSubdomains: options?.includeSubdomains ?? false,
  });
}

/**
 * Crawl a website — recursive scrape of multiple pages.
 */
export async function firecrawlCrawl(url: string, options?: {
  limit?: number;
  maxDepth?: number;
  includePaths?: string[];
  excludePaths?: string[];
}): Promise<any> {
  console.log("[firecrawl] crawl:", url);
  return firecrawlRequest("/crawl", {
    url,
    limit: options?.limit || 100,
    maxDepth: options?.maxDepth,
    includePaths: options?.includePaths,
    excludePaths: options?.excludePaths,
    scrapeOptions: { formats: ["markdown", "html"] },
  });
}
