import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createMockSupabase, resetAllMocks } from "./__mocks__/supabase";

const mockClient = createMockSupabase();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: mockClient,
}));

const LONG_ARTICLE_HTML = `
<html><body>
<article>
  <h1>Integration Test Article</h1>
  <p>${"This is a long paragraph of article content that exceeds the minimum threshold for extraction. ".repeat(10)}</p>
  <p>${"Another substantial paragraph with enough text to be considered valid article content. ".repeat(10)}</p>
  <p>${"Final paragraph ensuring we have well over 200 characters of meaningful text in this article. ".repeat(5)}</p>
</article>
</body></html>`;

describe("Extract-article integration — server extraction pipeline", () => {
  let fetchArticleContent: typeof import("@/lib/utils/article-extractor").fetchArticleContent;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
    resetAllMocks(mockClient);
    mockClient.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    const mod = await import("@/lib/utils/article-extractor");
    fetchArticleContent = mod.fetchArticleContent;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns server extraction result when edge function returns ok", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: vi.fn().mockResolvedValue({
        status: "ok",
        html: "<p>Extracted article content with enough text</p>",
        textLength: 200,
        source: "firecrawl",
        paywallDetected: false,
      }),
    });

    const result = await fetchArticleContent("https://example.com/article/server-test");
    expect(result).not.toBeNull();
    expect(result!.source).toBe("server");
    expect(result!.paywallDetected).toBe(false);
  });

  it("falls back to client extraction when server returns error", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: new Headers(),
        text: vi.fn().mockResolvedValue(""),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "text/html" }),
        text: vi.fn().mockResolvedValue(LONG_ARTICLE_HTML),
      });

    const result = await fetchArticleContent("https://example.com/article/fallback-test");
    expect(result).not.toBeNull();
    expect(result!.source).toBe("client");
  });

  it("returns paywall result from server with partial content", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: vi.fn().mockResolvedValue({
        status: "paywall",
        html: "<p>Teaser content visible before paywall</p>",
        textLength: 40,
        source: "firecrawl",
        paywallDetected: true,
        message: "Contenu protégé par un paywall",
      }),
    });

    const result = await fetchArticleContent("https://example.com/article/paywall-test");
    expect(result).not.toBeNull();
    expect(result!.paywallDetected).toBe(true);
    expect(result!.source).toBe("server");
  });

  it("returns null when both server and client extraction fail", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers(),
      text: vi.fn().mockResolvedValue(""),
    });

    const result = await fetchArticleContent("https://example.com/article/total-failure");
    expect(result).toBeNull();
  });

  it("caches results in memory and returns fromCache on subsequent calls", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: vi.fn().mockResolvedValue({
        status: "ok",
        html: "<p>Cached article content</p>",
        textLength: 200,
        source: "direct_fetch",
        paywallDetected: false,
      }),
    });

    const result1 = await fetchArticleContent("https://example.com/article/cache-test");
    expect(result1).not.toBeNull();

    const result2 = await fetchArticleContent("https://example.com/article/cache-test");
    expect(result2).not.toBeNull();
    expect(result2!.fromCache).toBe(true);
  });
});

describe("Extract-article integration — client-side extraction logic", () => {
  let fetchArticleContent: typeof import("@/lib/utils/article-extractor").fetchArticleContent;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
    resetAllMocks(mockClient);
    mockClient.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    const mod = await import("@/lib/utils/article-extractor");
    fetchArticleContent = mod.fetchArticleContent;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("extracts article node from client-fetched HTML", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 500, headers: new Headers() })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "text/html" }),
        text: vi.fn().mockResolvedValue(LONG_ARTICLE_HTML),
      });

    const result = await fetchArticleContent("https://example.com/article/client-extract");
    expect(result).not.toBeNull();
    expect(result!.source).toBe("client");
    expect(result!.textLength).toBeGreaterThan(200);
  });

  it("strips noise elements during client extraction", async () => {
    const noisyHtml = `<html><body>
      <nav><a href="/">Home</a></nav>
      <header><h1>Site Header</h1></header>
      <article>
        <h1>Clean Article</h1>
        <p>${"Real article content that should survive cleaning and noise removal. ".repeat(10)}</p>
        <p>${"More substantive content that forms the core of the article. ".repeat(10)}</p>
      </article>
      <footer>Copyright 2025</footer>
      <div class="advertisement">Buy now!</div>
    </body></html>`;

    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 500, headers: new Headers() })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "text/html" }),
        text: vi.fn().mockResolvedValue(noisyHtml),
      });

    const result = await fetchArticleContent("https://example.com/article/noisy");
    expect(result).not.toBeNull();
    expect(result!.html).not.toContain("<nav");
    expect(result!.html).not.toContain("<footer");
    expect(result!.html).not.toContain("advertisement");
  });

  it("rejects non-HTML content types from client", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 500, headers: new Headers() })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        text: vi.fn().mockResolvedValue('{"not": "html"}'),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        text: vi.fn().mockResolvedValue('{"not": "html"}'),
      });

    const result = await fetchArticleContent("https://example.com/article/json-response");
    expect(result).toBeNull();
  });

  it("uses density-based extraction when no article/main tag exists", async () => {
    const densityHtml = `<html><body>
      <div>
        <h1>Article Without Semantic Tags</h1>
        <p>${"First paragraph with substantial content that exceeds the density threshold. ".repeat(5)}</p>
        <p>${"Second paragraph continuing the article with more meaningful text. ".repeat(5)}</p>
        <p>${"Third paragraph to ensure we have enough blocks for density extraction. ".repeat(5)}</p>
        <p>${"Fourth paragraph adding more depth to the content of this article. ".repeat(5)}</p>
      </div>
    </body></html>`;

    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 500, headers: new Headers() })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "text/html" }),
        text: vi.fn().mockResolvedValue(densityHtml),
      });

    const result = await fetchArticleContent("https://example.com/article/density");
    expect(result).not.toBeNull();
    expect(result!.textLength).toBeGreaterThan(200);
  });
});

describe("Extract-article integration — database cache layer", () => {
  let fetchArticleContent: typeof import("@/lib/utils/article-extractor").fetchArticleContent;

  beforeEach(async () => {
    vi.resetModules();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers(),
      text: vi.fn().mockResolvedValue(""),
    }));

    resetAllMocks(mockClient);
    mockClient.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { html: "<p>DB cached content</p>", text_length: 18 },
        error: null,
      }),
      upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    const mod = await import("@/lib/utils/article-extractor");
    fetchArticleContent = mod.fetchArticleContent;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns cached result from DB when available", async () => {
    const result = await fetchArticleContent("https://example.com/article/db-cached");
    expect(result).not.toBeNull();
    expect(result!.fromCache).toBe(true);
    expect(result!.html).toBe("<p>DB cached content</p>");
  });
});
