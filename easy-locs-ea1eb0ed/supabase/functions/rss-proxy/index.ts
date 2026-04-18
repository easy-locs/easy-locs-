import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { withEdgeLogging } from "../_shared/with-logging.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const CACHE_TTL_S = 600;
const MAX_ITEMS = 25;
const FETCH_TIMEOUT_MS = 10_000;

interface ParsedArticle {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  description: string;
  rawHtml?: string;
}

const cache = new Map<string, { data: ParsedArticle[]; expiresAt: number }>();

const COUNTRY_NEWS_CONFIG: Record<
  string,
  { hl: string; gl: string; ceid: string }
> = {
  AE: { hl: "en", gl: "AE", ceid: "AE:en" },
  FR: { hl: "fr", gl: "FR", ceid: "FR:fr" },
  US: { hl: "en", gl: "US", ceid: "US:en" },
  GB: { hl: "en", gl: "GB", ceid: "GB:en" },
  SA: { hl: "ar", gl: "SA", ceid: "SA:ar" },
  EG: { hl: "ar", gl: "EG", ceid: "EG:ar" },
  MA: { hl: "fr", gl: "MA", ceid: "MA:fr" },
  DE: { hl: "de", gl: "DE", ceid: "DE:de" },
  IN: { hl: "en", gl: "IN", ceid: "IN:en" },
  BR: { hl: "pt-BR", gl: "BR", ceid: "BR:pt-419" },
  NG: { hl: "en", gl: "NG", ceid: "NG:en" },
  JP: { hl: "ja", gl: "JP", ceid: "JP:ja" },
};

const DEFAULT_CONFIG = { hl: "en", gl: "US", ceid: "US:en" };

function buildRssUrl(country: string, city?: string): string {
  const config = COUNTRY_NEWS_CONFIG[country] ?? DEFAULT_CONFIG;
  if (city) {
    const encodedCity = encodeURIComponent(city);
    return `https://news.google.com/rss/search?q=${encodedCity}&hl=${config.hl}&gl=${config.gl}&ceid=${config.ceid}`;
  }
  return `https://news.google.com/rss?hl=${config.hl}&gl=${config.gl}&ceid=${config.ceid}`;
}

function extractText(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([^<]*)<\\/${tag}>`);
  const match = xml.match(regex);
  return (match?.[1] ?? match?.[2] ?? "").trim();
}

function extractSource(description: string): string {
  const match = description.match(/<font[^>]*>([^<]+)<\/font>/);
  return match?.[1]?.trim() ?? "";
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasHtmlContent(text: string): boolean {
  return /<(?:p|br|ul|ol|li|h[1-6]|strong|b|em|i|a|blockquote|div|span)\b/i.test(text);
}

function parseRssXml(xml: string): ParsedArticle[] {
  const articles: ParsedArticle[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null && articles.length < MAX_ITEMS) {
    const block = match[1];
    const title = extractText(block, "title");
    const link = extractText(block, "link");
    const pubDate = extractText(block, "pubDate");
    const description = extractText(block, "description");
    const source = extractSource(description) || extractText(block, "source") || "";

    if (title && link) {
      const cleanTitle = title.replace(/ - [^-]+$/, "").trim();
      const cleanDescription = stripHtml(description);
      const summaryText = cleanDescription && cleanDescription !== source
        ? cleanDescription
        : cleanTitle;
      articles.push({
        title: cleanTitle,
        link,
        pubDate,
        source,
        description: summaryText,
        rawHtml: hasHtmlContent(description) ? description : undefined,
      });
    }
  }

  return articles;
}

Deno.serve(
  withEdgeLogging("rss-proxy", async (req, logger) => {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
    if (req.method !== "GET") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const country = (url.searchParams.get("country") ?? "FR").toUpperCase();
    const city = url.searchParams.get("city") ?? undefined;
    const cacheKey = `${country}_${city ?? "national"}`;

    const cached = cache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      logger.info("cache_hit", { country, city, items: cached.data.length });
      return new Response(
        JSON.stringify({ status: "ok", items: cached.data, cached: true }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Cache-Control": `public, max-age=${CACHE_TTL_S}`,
          },
        },
      );
    }

    try {
      const rssUrl = buildRssUrl(country, city);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      const response = await fetch(rssUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; EasyLocs/1.0; +https://easy-locs.com)",
        },
      });
      clearTimeout(timeout);

      if (!response.ok) {
        logger.error("rss_fetch_failed", {
          status: response.status,
          country,
        });
        return new Response(
          JSON.stringify({
            status: "error",
            error: `RSS feed returned ${response.status}`,
            items: [],
          }),
          {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const xml = await response.text();
      const articles = parseRssXml(xml);

      cache.set(cacheKey, {
        data: articles,
        expiresAt: Date.now() + CACHE_TTL_S * 1000,
      });

      logger.info("rss_parsed", { country, city, items: articles.length });

      return new Response(
        JSON.stringify({ status: "ok", items: articles, cached: false }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Cache-Control": `public, max-age=${CACHE_TTL_S}`,
          },
        },
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown error";
      logger.error("rss_proxy_error", { error: message, country });

      const stale = cache.get(cacheKey);
      if (stale) {
        return new Response(
          JSON.stringify({
            status: "ok",
            items: stale.data,
            cached: true,
            stale: true,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      return new Response(
        JSON.stringify({ status: "error", error: message, items: [] }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  }),
);
