import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { createEdgeLogger } from "../_shared/structured-logger.ts";
import { checkServerRateLimit, rateLimitResponse, rateLimitHeaders, getEndpointLimit, getClientIp } from "../_shared/server-rate-limiter.ts";
import { firecrawlScrape } from "../_shared/firecrawl.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DIRECT_FETCH_TIMEOUT_MS = 8_000;
const MAX_CONTENT_LENGTH = 500_000;

const PAYWALL_INDICATORS = [
  "subscribe to continue",
  "subscribe to read",
  "subscription required",
  "premium content",
  "members only",
  "paywall",
  "sign in to read",
  "log in to continue",
  "create a free account",
  "register to continue",
  "abonnez-vous",
  "réservé aux abonnés",
  "contenu réservé",
  "accès réservé",
  "article réservé",
  "pour lire la suite",
  "connectez-vous",
  "créez votre compte",
];

const PAYWALL_META_PATTERNS = [
  /isAccessibleForFree["']?\s*[:=]\s*["']?false/i,
  /content_access\s*[:=]\s*["']?paid/i,
  /paywall\s*[:=]\s*["']?true/i,
];

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

function detectPaywall(html: string): boolean {
  const lower = html.toLowerCase();
  const textOnly = lower.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

  for (const indicator of PAYWALL_INDICATORS) {
    if (textOnly.includes(indicator)) return true;
  }

  for (const pattern of PAYWALL_META_PATTERNS) {
    if (pattern.test(html)) return true;
  }

  return false;
}

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

interface ExtractionResult {
  status: "ok" | "paywall" | "error";
  html: string | null;
  textLength: number;
  source: "firecrawl" | "direct_fetch";
  paywallDetected: boolean;
  message?: string;
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
    const { error } = await supabase.from("firecrawl_usage_log").insert({
      user_id: userId,
      target_url: targetUrl,
      success,
      text_length: textLength,
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
  const logger = createEdgeLogger("extract-article");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  logger.info("request_started", {
    method: req.method,
    url: req.url,
    clientIp: getClientIp(req),
  });

  try {
    const rlResult = await checkServerRateLimit(req, "extract-article");
    if (!rlResult.allowed) {
      logger.warn("rate_limited", {
        clientIp: getClientIp(req),
        currentCount: rlResult.currentCount,
        retryAfter: rlResult.retryAfterSeconds,
      });
      return rateLimitResponse(rlResult);
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

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(targetUrl);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid URL format" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return new Response(
        JSON.stringify({ error: "Only http and https URLs are allowed" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const hostname = parsedUrl.hostname.toLowerCase();
    const BLOCKED_HOSTS = [
      "localhost", "127.0.0.1", "0.0.0.0", "[::1]", "::1",
      "metadata.google.internal", "169.254.169.254",
    ];
    const BLOCKED_SUFFIXES = [".local", ".internal", ".localhost"];

    if (
      BLOCKED_HOSTS.includes(hostname) ||
      BLOCKED_SUFFIXES.some((s) => hostname.endsWith(s)) ||
      /^10\./.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^169\.254\./.test(hostname) ||
      /^0\./.test(hostname) ||
      hostname.startsWith("[") ||
      /^fc[0-9a-f]{2}:/i.test(hostname) ||
      /^fd[0-9a-f]{2}:/i.test(hostname) ||
      /^fe80:/i.test(hostname)
    ) {
      return new Response(
        JSON.stringify({ error: "URL targets a restricted address" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    logger.info("extract_start", { url: targetUrl, userId: user.id });

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

    logger.info("extract_complete", {
      status: result.status,
      source: result.source,
      textLength: result.textLength,
      paywallDetected: result.paywallDetected,
      userId: user.id,
      firecrawlUsed,
      durationMs: Date.now() - startTime,
    });

    const limits = getEndpointLimit("extract-article");
    const rlHeaders = rateLimitHeaders(rlResult, limits.maxRequests);
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
