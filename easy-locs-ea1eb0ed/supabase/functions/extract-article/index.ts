import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { createEdgeLogger } from "../_shared/structured-logger.ts";
import { checkServerRateLimit, checkUserRateLimit, rateLimitResponse, rateLimitHeaders, getClientIp, resolveUserTier, getTierEndpointLimit } from "../_shared/server-rate-limiter.ts";
import type { UserTier } from "../_shared/server-rate-limiter.ts";
import { firecrawlScrape } from "../_shared/firecrawl.ts";
import { detectPaywall } from "../_shared/paywall-detection.ts";
import { validateUrlSsrf } from "../_shared/ssrf-validation.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

import { cFromEdge, cRpcEdge } from "../_shared/execution/content-mutation.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-metrics-key, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const DIRECT_FETCH_TIMEOUT_MS = 8_000;
const MAX_CONTENT_LENGTH = 500_000;

interface ExtractionResult {
  status: "ok" | "paywall" | "error";
  html: string | null;
  textLength: number;
  source: "firecrawl" | "direct_fetch" | "cache";
  paywallDetected: boolean;
  message?: string;
}

const CACHE_TTL_MS = 30 * 60 * 1_000;
const CACHE_MAX_ENTRIES = 500;
const METRICS_LOG_INTERVAL_MS = 5 * 60 * 1_000;

interface CacheEntry {
  result: ExtractionResult;
  expiresAt: number;
}

const TRACKING_PARAM_PREFIXES = ["utm_", "mc_"];
const TRACKING_PARAM_EXACT = new Set(["fbclid", "gclid", "msclkid", "ref", "source", "campaign"]);

function isTrackingParam(key: string): boolean {
  const lower = key.toLowerCase();
  if (TRACKING_PARAM_EXACT.has(lower)) return true;
  return TRACKING_PARAM_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

function normalizeUrl(raw: string): string {
  try {
    const parsed = new URL(raw);

    parsed.protocol = parsed.protocol.toLowerCase();
    parsed.hostname = parsed.hostname.toLowerCase();

    parsed.hash = "";

    const paramsToDelete: string[] = [];
    for (const key of parsed.searchParams.keys()) {
      if (isTrackingParam(key)) {
        paramsToDelete.push(key);
      }
    }
    for (const key of paramsToDelete) {
      parsed.searchParams.delete(key);
    }

    parsed.searchParams.sort();

    return parsed.toString();
  } catch {
    return raw;
  }
}

interface CacheMetrics {
  hits: number;
  misses: number;
  evictions: number;
  expirations: number;
  stores: number;
  startedAt: number;
  sizeSampleSum: number;
  sizeSampleCount: number;
}

const articleCache = new Map<string, CacheEntry>();

const cacheMetrics: CacheMetrics = {
  hits: 0,
  misses: 0,
  evictions: 0,
  expirations: 0,
  stores: 0,
  startedAt: Date.now(),
  sizeSampleSum: 0,
  sizeSampleCount: 0,
};

let lastMetricsLogAt = Date.now();
let lastMetricsPersistAt = 0;
const METRICS_PERSIST_INTERVAL_MS = 15 * 60 * 1_000;

function sampleCacheSize(): void {
  cacheMetrics.sizeSampleSum += articleCache.size;
  cacheMetrics.sizeSampleCount++;
}

function getCacheMetricsSnapshot() {
  const total = cacheMetrics.hits + cacheMetrics.misses;
  return {
    hits: cacheMetrics.hits,
    misses: cacheMetrics.misses,
    evictions: cacheMetrics.evictions,
    expirations: cacheMetrics.expirations,
    stores: cacheMetrics.stores,
    hitRate: total > 0 ? Math.round((cacheMetrics.hits / total) * 10000) / 100 : 0,
    currentSize: articleCache.size,
    averageSize: cacheMetrics.sizeSampleCount > 0
      ? Math.round((cacheMetrics.sizeSampleSum / cacheMetrics.sizeSampleCount) * 100) / 100
      : 0,
    maxSize: CACHE_MAX_ENTRIES,
    ttlMs: CACHE_TTL_MS,
    uptimeMs: Date.now() - cacheMetrics.startedAt,
  };
}

const CACHE_HIT_RATE_ALERT_THRESHOLD = parseFloat(Deno.env.get("CACHE_HIT_RATE_ALERT_THRESHOLD") || "20");
let lastAlertAt = 0;
const ALERT_COOLDOWN_MS = 30 * 60 * 1000;

function maybeLogMetricsSummary(logger: ReturnType<typeof createEdgeLogger>): void {
  const now = Date.now();
  if (now - lastMetricsLogAt >= METRICS_LOG_INTERVAL_MS) {
    lastMetricsLogAt = now;
    const snapshot = getCacheMetricsSnapshot();
    logger.info("cache_metrics_summary", snapshot);

    const total = cacheMetrics.hits + cacheMetrics.misses;
    if (total >= 20 && snapshot.hitRate < CACHE_HIT_RATE_ALERT_THRESHOLD && now - lastAlertAt > ALERT_COOLDOWN_MS) {
      lastAlertAt = now;
      logger.warn("cache_hit_rate_low", {
        hitRate: snapshot.hitRate,
        threshold: CACHE_HIT_RATE_ALERT_THRESHOLD,
        totalRequests: total,
        currentSize: snapshot.currentSize,
      });
    }

    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (supabaseUrl && serviceKey) {
        const sb = createClient(supabaseUrl, serviceKey);
        cFromEdge(sb, "cache_metrics_history").insert({
          endpoint: "extract-article",
          hits: snapshot.hits,
          misses: snapshot.misses,
          evictions: snapshot.evictions,
          expirations: snapshot.expirations,
          stores: snapshot.stores,
          hit_rate: snapshot.hitRate,
          current_size: snapshot.currentSize,
          average_size: snapshot.averageSize,
          uptime_ms: snapshot.uptimeMs,
        }).then(() => {}).catch(() => {});
      }
    } catch {}
  }
}

async function maybePersistMetrics(logger: ReturnType<typeof createEdgeLogger>): Promise<void> {
  const now = Date.now();
  if (now - lastMetricsPersistAt < METRICS_PERSIST_INTERVAL_MS) return;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return;

  const snapshot = getCacheMetricsSnapshot();
  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { error } = await cFromEdge(supabase, "cache_metrics_log").insert({
      function_name: "extract-article",
      hits: snapshot.hits,
      misses: snapshot.misses,
      evictions: snapshot.evictions,
      expirations: snapshot.expirations,
      stores: snapshot.stores,
      hit_rate: snapshot.hitRate,
      current_size: snapshot.currentSize,
      average_size: snapshot.averageSize,
      max_size: snapshot.maxSize,
      ttl_ms: snapshot.ttlMs,
      uptime_ms: snapshot.uptimeMs,
    });
    if (error) {
      logger.warn("cache_metrics_persist_failed", { error: error.message });
    } else {
      lastMetricsPersistAt = now;
      logger.info("cache_metrics_persisted", snapshot);
    }
  } catch (err) {
    logger.warn("cache_metrics_persist_error", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

function getCached(url: string): ExtractionResult | null {
  const key = normalizeUrl(url);
  const entry = articleCache.get(key);
  if (!entry) {
    cacheMetrics.misses++;
    return null;
  }
  if (Date.now() > entry.expiresAt) {
    articleCache.delete(key);
    cacheMetrics.expirations++;
    cacheMetrics.misses++;
    return null;
  }
  cacheMetrics.hits++;
  return { ...entry.result, source: "cache" };
}

function setCached(url: string, result: ExtractionResult): void {
  const key = normalizeUrl(url);
  if (articleCache.size >= CACHE_MAX_ENTRIES && !articleCache.has(key)) {
    const now = Date.now();
    for (const [k, entry] of articleCache) {
      if (now > entry.expiresAt) {
        articleCache.delete(k);
        cacheMetrics.expirations++;
      }
    }
    if (articleCache.size >= CACHE_MAX_ENTRIES) {
      const oldest = articleCache.keys().next().value;
      if (oldest !== undefined) {
        articleCache.delete(oldest);
        cacheMetrics.evictions++;
      }
    }
  }
  cacheMetrics.stores++;
  articleCache.set(key, { result, expiresAt: Date.now() + CACHE_TTL_MS });
}

const REMOVE_TAGS = [
  "nav", "header", "footer", "aside", "form", "script",
  "style", "iframe", "noscript", "svg", "button", "input",
];

const NOISE_CLASS_PATTERNS = [
  "comment", "social", "share", "related", "sidebar", "ad-",
  "ads-", "advertisement", "newsletter", "popup", "modal",
  "cookie", "consent", "menu", "nav", "footer", "header",
];

const BLOCK_TAGS = ["p", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "li", "figcaption"];

function extractTextLength(html: string): number {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().length;
}

function extractArticleNode(html: string): string | null {
  const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  if (articleMatch) {
    const content = articleMatch[1];
    if (extractTextLength(content) > 200) return content;
  }

  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  if (mainMatch) {
    const content = mainMatch[1];
    if (extractTextLength(content) > 200) return content;
  }

  const roleMatch = html.match(/<div[^>]*role\s*=\s*"article"[^>]*>([\s\S]*?)<\/div>/i);
  if (roleMatch) {
    const content = roleMatch[1];
    if (extractTextLength(content) > 200) return content;
  }

  return null;
}

function extractByDensity(html: string): string | null {
  const blockPattern = new RegExp(
    `<(${BLOCK_TAGS.join("|")})[^>]*>([\\s\\S]*?)<\\/\\1>`,
    "gi",
  );

  const blocks: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = blockPattern.exec(html)) !== null) {
    const tag = match[1].toLowerCase();
    const inner = match[0];
    const textLen = extractTextLength(inner);
    if (textLen > 40 || tag.startsWith("h")) {
      blocks.push(inner);
    }
  }

  if (blocks.length < 3) return null;

  const combined = blocks.join("\n");
  if (extractTextLength(combined) < 200) return null;

  return combined;
}

function cleanHtml(html: string): string {
  let cleaned = html;

  for (const tag of REMOVE_TAGS) {
    const re = new RegExp(`<${tag}[\\s>][\\s\\S]*?<\\/${tag}>`, "gi");
    cleaned = cleaned.replace(re, "");
  }

  const noisePattern = NOISE_CLASS_PATTERNS.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const noiseRe = new RegExp(
    `<div[^>]*class="[^"]*(?:${noisePattern})[^"]*"[^>]*>[\\s\\S]*?<\\/div>`,
    "gi",
  );
  cleaned = cleaned.replace(noiseRe, "");

  cleaned = cleaned
    .replace(/<img[^>]*>/gi, "")
    .replace(/<video[\s\S]*?<\/video>/gi, "")
    .replace(/<(div|section|span)([^>]*)>/gi, "<$1>")
    .replace(/\s{2,}/g, " ");

  return cleaned.trim();
}

function markdownToHtml(markdown: string): string {
  let html = markdown;

  html = html.replace(/^######\s+(.+)$/gm, "<h6>$1</h6>");
  html = html.replace(/^#####\s+(.+)$/gm, "<h5>$1</h5>");
  html = html.replace(/^####\s+(.+)$/gm, "<h4>$1</h4>");
  html = html.replace(/^###\s+(.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^##\s+(.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^#\s+(.+)$/gm, "<h1>$1</h1>");

  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  html = html.replace(/^>\s+(.+)$/gm, "<blockquote>$1</blockquote>");

  const lines = html.split("\n");
  const result: string[] = [];
  let inParagraph = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (inParagraph) {
        result.push("</p>");
        inParagraph = false;
      }
      continue;
    }

    if (/^<(?:h[1-6]|blockquote|ul|ol|li)/.test(trimmed)) {
      if (inParagraph) {
        result.push("</p>");
        inParagraph = false;
      }
      result.push(trimmed);
      continue;
    }

    if (!inParagraph) {
      result.push("<p>");
      inParagraph = true;
    }
    result.push(trimmed);
  }

  if (inParagraph) result.push("</p>");

  return result.join("\n");
}

async function directFetch(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DIRECT_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; EasyLocs/1.0; +https://easy-locs.com)",
        "Accept": "text/html,application/xhtml+xml",
      },
    });
    clearTimeout(timer);

    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") ?? "";
    if (
      contentType &&
      !contentType.includes("text/html") &&
      !contentType.includes("text/plain") &&
      !contentType.includes("application/xhtml")
    ) {
      return null;
    }

    const text = await response.text();
    if (text.length < 500 || !text.includes("<")) return null;
    if (text.length > MAX_CONTENT_LENGTH) return text.slice(0, MAX_CONTENT_LENGTH);

    return text;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

function getFirecrawlCostPerCall(): number {
  const envCost = Deno.env.get("FIRECRAWL_COST_PER_CALL");
  if (envCost) {
    const parsed = parseFloat(envCost);
    if (!isNaN(parsed) && parsed >= 0) return parsed;
  }
  return 0.001;
}

async function logFirecrawlUsage(
  logger: ReturnType<typeof createEdgeLogger>,
  supabaseUrl: string,
  serviceRoleKey: string,
  userId: string,
  targetUrl: string,
  success: boolean,
  textLength: number,
): Promise<void> {
  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { error } = await cFromEdge(supabase, "firecrawl_usage_log").insert({
      user_id: userId,
      target_url: targetUrl,
      success,
      text_length: textLength,
      estimated_cost: getFirecrawlCostPerCall(),
      created_at: new Date().toISOString(),
    });
    if (error) {
      logger.warn("firecrawl_usage_log_insert_failed", { error: error.message });
    }
  } catch (err) {
    logger.warn("firecrawl_usage_log_error", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  const logger = createEdgeLogger("extract-article");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  const reqUrl = new URL(req.url);

  if (req.method === "GET" && reqUrl.pathname.endsWith("/metrics")) {
    const metricsKey = Deno.env.get("CACHE_METRICS_KEY");
    const headerKey = req.headers.get("x-metrics-key");
    const keyAuth = metricsKey && headerKey === metricsKey;

    let jwtAuth = false;
    if (!keyAuth) {
      const authHeader = req.headers.get("Authorization");
      if (authHeader?.startsWith("Bearer ")) {
        try {
          const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
            global: { headers: { Authorization: authHeader } },
          });
          const { data: { user } } = await sb.auth.getUser();
          if (user) {
            const { data: roleData } = await createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
              .rpc("has_role", { _user_id: user.id, _role: "admin" });
            jwtAuth = !!roleData;
          }
        } catch {
          // JWT auth failed, fall through to rejection
        }
      }
    }

    if (!keyAuth && !jwtAuth) {
      return new Response(
        JSON.stringify({
          error: "Forbidden",
          message: !metricsKey && !jwtAuth
            ? "CACHE_METRICS_KEY is not configured and no admin session — metrics endpoint is disabled"
            : "Invalid metrics key or insufficient permissions",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    const snapshot = getCacheMetricsSnapshot();
    logger.info("cache_metrics_requested", { ...snapshot, authMethod: keyAuth ? "key:header" : "jwt" });
    return new Response(JSON.stringify(snapshot), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const startTime = Date.now();
  logger.info("request_started", {
    method: req.method,
    url: req.url,
    clientIp: getClientIp(req),
  });

  sampleCacheSize();
  maybeLogMetricsSummary(logger);
  maybePersistMetrics(logger).catch((err) => {
    logger.warn("cache_metrics_persist_unexpected", {
      error: err instanceof Error ? err.message : String(err),
    });
  });

  try {
    const ipRlResult = await checkServerRateLimit(req, "extract-article", {
      maxRequests: 120,
      windowSeconds: 60,
    });
    if (!ipRlResult.allowed) {
      logger.warn("ip_rate_limited", {
        clientIp: getClientIp(req),
        currentCount: ipRlResult.currentCount,
        retryAfter: ipRlResult.retryAfterSeconds,
      });
      return rateLimitResponse(ipRlResult);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      logger.warn("auth_failed", {
        error: authError?.message ?? "No user found",
        clientIp: getClientIp(req),
      });
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logger.info("auth_success", { userId: user.id });

    const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey);
    let userTier: UserTier = "free";
    try {
      const { data: profile, error: tierError } = await serviceSupabase
        .from("profiles")
        .select("subscription_tier")
        .eq("id", user.id)
        .single();
      if (tierError) {
        logger.warn("tier_lookup_failed", { userId: user.id, error: tierError.message });
      }
      userTier = resolveUserTier(profile?.subscription_tier);
    } catch (err) {
      logger.warn("tier_lookup_error", {
        userId: user.id,
        error: err instanceof Error ? err.message : String(err),
      });
      userTier = "free";
    }

    logger.info("user_tier_resolved", { userId: user.id, tier: userTier });

    const rlResult = await checkUserRateLimit(user.id, "extract-article", { tier: userTier });
    if (!rlResult.allowed) {
      logger.warn("user_rate_limited", {
        userId: user.id,
        tier: userTier,
        clientIp: getClientIp(req),
        currentCount: rlResult.currentCount,
        retryAfter: rlResult.retryAfterSeconds,
      });
      return rateLimitResponse(rlResult);
    }

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: { url?: string };
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const targetUrl = body.url;
    if (!targetUrl || typeof targetUrl !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing required field: url" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const ssrfCheck = validateUrlSsrf(targetUrl);
    if (ssrfCheck.blocked) {
      return new Response(
        JSON.stringify({ error: ssrfCheck.reason }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    logger.info("extract_start", { url: targetUrl, userId: user.id });

    const cached = getCached(targetUrl);
    if (cached) {
      const metrics = getCacheMetricsSnapshot();
      logger.info("cache_hit", {
        url: targetUrl,
        textLength: cached.textLength,
        cacheSize: articleCache.size,
        hitRate: metrics.hitRate,
      });
      return new Response(JSON.stringify(cached), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    logger.info("cache_miss", { url: targetUrl, cacheSize: articleCache.size, totalMisses: cacheMetrics.misses });

    let result: ExtractionResult = {
      status: "error",
      html: null,
      textLength: 0,
      source: "direct_fetch",
      paywallDetected: false,
    };

    const hasFirecrawlKey = !!Deno.env.get("FIRECRAWL_API_KEY");
    let firecrawlUsed = false;
    let firecrawlSuccess = false;

    if (hasFirecrawlKey) {
      try {
        firecrawlUsed = true;
        logger.info("firecrawl_attempt", { url: targetUrl, userId: user.id });
        const scrapeResult = await firecrawlScrape(targetUrl, {
          formats: ["html", "markdown"],
          onlyMainContent: true,
          waitFor: 3000,
        });

        const html = scrapeResult?.data?.html;
        const markdown = scrapeResult?.data?.markdown;

        if (html && extractTextLength(html) > 150) {
          const cleaned = cleanHtml(html);
          const paywalled = detectPaywall(cleaned);
          firecrawlSuccess = true;

          result = {
            status: paywalled ? "paywall" : "ok",
            html: cleaned,
            textLength: extractTextLength(cleaned),
            source: "firecrawl",
            paywallDetected: paywalled,
            message: paywalled
              ? "Contenu protégé par un paywall — résumé RSS affiché"
              : undefined,
          };
          logger.info("firecrawl_success", {
            textLength: result.textLength,
            paywalled,
            userId: user.id,
          });
        } else if (markdown && markdown.length > 100) {
          const paywalled = detectPaywall(markdown);
          const convertedHtml = markdownToHtml(markdown);
          firecrawlSuccess = true;

          result = {
            status: paywalled ? "paywall" : "ok",
            html: convertedHtml,
            textLength: extractTextLength(convertedHtml),
            source: "firecrawl",
            paywallDetected: paywalled,
            message: paywalled
              ? "Contenu protégé par un paywall — résumé RSS affiché"
              : undefined,
          };
          logger.info("firecrawl_markdown_success", {
            textLength: result.textLength,
            paywalled,
            userId: user.id,
          });
        } else {
          logger.warn("firecrawl_insufficient_content", {
            htmlLen: html?.length ?? 0,
            markdownLen: markdown?.length ?? 0,
          });
        }
      } catch (err) {
        logger.error("firecrawl_error", {
          error: err instanceof Error ? err : new Error(String(err)),
        });
      }
    }

    if (firecrawlUsed) {
      await logFirecrawlUsage(
        logger,
        supabaseUrl,
        supabaseServiceKey,
        user.id,
        targetUrl,
        firecrawlSuccess,
        result.textLength,
      );
    }

    if (result.status === "error") {
      logger.info("direct_fetch_attempt", { url: targetUrl });
      const rawHtml = await directFetch(targetUrl);

      if (rawHtml) {
        const paywalled = detectPaywall(rawHtml);

        const bodyMatch = rawHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        const bodyHtml = bodyMatch ? bodyMatch[1] : rawHtml;

        let extracted = extractArticleNode(bodyHtml);
        if (!extracted) {
          extracted = extractByDensity(bodyHtml);
        }

        if (extracted) {
          const cleaned = cleanHtml(extracted);
          const textLength = extractTextLength(cleaned);

          if (textLength >= 150) {
            result = {
              status: paywalled ? "paywall" : "ok",
              html: cleaned,
              textLength,
              source: "direct_fetch",
              paywallDetected: paywalled,
              message: paywalled
                ? "Contenu protégé par un paywall — résumé RSS affiché"
                : undefined,
            };
            logger.info("direct_fetch_success", { textLength, paywalled });
          } else {
            logger.warn("direct_fetch_insufficient", { textLength });
          }
        } else if (paywalled) {
          result = {
            status: "paywall",
            html: null,
            textLength: 0,
            source: "direct_fetch",
            paywallDetected: true,
            message: "Contenu protégé par un paywall — résumé RSS affiché",
          };
          logger.info("paywall_detected_no_content");
        } else {
          logger.warn("direct_fetch_no_extraction");
        }
      } else {
        logger.warn("direct_fetch_failed");
      }
    }

    if (result.status !== "error") {
      setCached(targetUrl, result);
      logger.info("cache_stored", {
        url: targetUrl,
        cacheSize: articleCache.size,
      });
    }

    logger.info("extract_complete", {
      status: result.status,
      source: result.source,
      textLength: result.textLength,
      paywallDetected: result.paywallDetected,
      userId: user.id,
      firecrawlUsed,
      durationMs: Date.now() - startTime,
    });

    const tierLimits = getTierEndpointLimit("extract-article", userTier);
    const rlHeaders = rateLimitHeaders(rlResult, tierLimits.maxRequests);
    const responseHeaders = { ...corsHeaders, "Content-Type": "application/json", ...rlHeaders };

    return new Response(JSON.stringify(result), {
      headers: responseHeaders,
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error("request_failed", {
      error: err,
      durationMs: Date.now() - startTime,
    });

    return new Response(
      JSON.stringify({ error: "Internal Server Error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
