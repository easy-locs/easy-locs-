const CORS_PROXIES = [
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
];

const FETCH_TIMEOUT_MS = 10_000;

const REMOVE_SELECTORS_RE = new RegExp(
  [
    "<nav[\\s>][\\s\\S]*?<\\/nav>",
    "<header[\\s>][\\s\\S]*?<\\/header>",
    "<footer[\\s>][\\s\\S]*?<\\/footer>",
    "<aside[\\s>][\\s\\S]*?<\\/aside>",
    "<form[\\s>][\\s\\S]*?<\\/form>",
    "<script[\\s>][\\s\\S]*?<\\/script>",
    "<style[\\s>][\\s\\S]*?<\\/style>",
    "<iframe[\\s>][\\s\\S]*?<\\/iframe>",
    '<div[^>]*class="[^"]*(?:comment|social|share|related|sidebar|ad-|ads-|advertisement|newsletter|popup|modal|cookie|consent|menu|nav|footer|header)[^"]*"[^>]*>[\\s\\S]*?<\\/div>',
  ].join("|"),
  "gi"
);

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
    "gi"
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

function cleanExtractedHtml(html: string): string {
  let cleaned = html.replace(REMOVE_SELECTORS_RE, "");

  cleaned = cleaned
    .replace(/<img[^>]*>/gi, "")
    .replace(/<video[\s\S]*?<\/video>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(/<button[\s\S]*?<\/button>/gi, "")
    .replace(/<input[^>]*>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "");

  cleaned = cleaned
    .replace(/<(div|section|span)([^>]*)>/gi, "<$1>")
    .replace(/\s{2,}/g, " ");

  return cleaned.trim();
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchHtml(sourceUrl: string): Promise<string | null> {
  for (const proxyFn of CORS_PROXIES) {
    const proxyUrl = proxyFn(sourceUrl);
    try {
      const response = await fetchWithTimeout(proxyUrl, FETCH_TIMEOUT_MS);
      if (!response.ok) continue;

      const contentType = response.headers.get("content-type") ?? "";
      if (contentType && !contentType.includes("text/html") && !contentType.includes("text/plain") && !contentType.includes("application/xhtml")) {
        continue;
      }

      const text = await response.text();
      if (text.length < 500 || !text.includes("<")) continue;

      return text;
    } catch {
      continue;
    }
  }
  return null;
}

export interface ExtractedArticle {
  html: string;
  textLength: number;
}

const articleCache = new Map<string, { result: ExtractedArticle | null; timestamp: number }>();
const ARTICLE_CACHE_TTL_MS = 600_000;
const ARTICLE_CACHE_FAILURE_TTL_MS = 60_000;
const MAX_CACHE_ENTRIES = 30;

function pruneCache(): void {
  if (articleCache.size <= MAX_CACHE_ENTRIES) return;
  const entries = [...articleCache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp);
  const toRemove = entries.slice(0, entries.length - MAX_CACHE_ENTRIES);
  for (const [key] of toRemove) {
    articleCache.delete(key);
  }
}

export async function fetchArticleContent(sourceUrl: string): Promise<ExtractedArticle | null> {
  if (!sourceUrl) return null;

  const cached = articleCache.get(sourceUrl);
  if (cached) {
    const ttl = cached.result ? ARTICLE_CACHE_TTL_MS : ARTICLE_CACHE_FAILURE_TTL_MS;
    if (Date.now() - cached.timestamp < ttl) {
      return cached.result;
    }
  }

  try {
    const rawHtml = await fetchHtml(sourceUrl);
    if (!rawHtml) {
      articleCache.set(sourceUrl, { result: null, timestamp: Date.now() });
      return null;
    }

    const bodyMatch = rawHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const bodyHtml = bodyMatch ? bodyMatch[1] : rawHtml;

    let extracted = extractArticleNode(bodyHtml);
    if (!extracted) {
      extracted = extractByDensity(bodyHtml);
    }

    if (!extracted) {
      articleCache.set(sourceUrl, { result: null, timestamp: Date.now() });
      return null;
    }

    const cleaned = cleanExtractedHtml(extracted);
    const textLength = extractTextLength(cleaned);

    if (textLength < 150) {
      articleCache.set(sourceUrl, { result: null, timestamp: Date.now() });
      return null;
    }

    const result: ExtractedArticle = { html: cleaned, textLength };
    articleCache.set(sourceUrl, { result, timestamp: Date.now() });
    pruneCache();

    return result;
  } catch {
    articleCache.set(sourceUrl, { result: null, timestamp: Date.now() });
    return null;
  }
}
