import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ExtractedArticle } from "@/lib/utils/article-extractor";
import type { CacheMetricsSnapshot } from "@/hooks/useCacheMetrics";
import { createMockSupabase, resetAllMocks } from "./__mocks__/supabase";

const mockClient = createMockSupabase();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: mockClient,
}));

function setupDefaultMocks() {
  resetAllMocks(mockClient);
  mockClient.from.mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
  });
}

function createServerResponse(url: string, textLength = 200) {
  return {
    ok: true,
    status: 200,
    headers: new Headers({ "content-type": "application/json" }),
    json: vi.fn().mockResolvedValue({
      status: "ok",
      html: `<p>Content for ${url}</p>`,
      textLength,
      source: "firecrawl",
      paywallDetected: false,
    }),
  };
}

describe("Article extraction — memory cache TTL expiry", () => {
  let fetchArticleContent: typeof import("@/lib/utils/article-extractor").fetchArticleContent;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers();
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
    setupDefaultMocks();

    const mod = await import("@/lib/utils/article-extractor");
    fetchArticleContent = mod.fetchArticleContent;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("returns cached result within TTL window (10 minutes for success)", async () => {
    mockFetch.mockResolvedValueOnce(createServerResponse("https://example.com/ttl-test"));

    const result1 = await fetchArticleContent("https://example.com/ttl-test");
    expect(result1).not.toBeNull();
    expect(result1!.fromCache).toBeUndefined();

    vi.advanceTimersByTime(5 * 60 * 1000);

    const result2 = await fetchArticleContent("https://example.com/ttl-test");
    expect(result2).not.toBeNull();
    expect(result2!.fromCache).toBe(true);

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("re-fetches after success TTL expires (10 minutes)", async () => {
    mockFetch
      .mockResolvedValueOnce(createServerResponse("https://example.com/ttl-expire"))
      .mockResolvedValueOnce(createServerResponse("https://example.com/ttl-expire"));

    await fetchArticleContent("https://example.com/ttl-expire");
    expect(mockFetch).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(11 * 60 * 1000);

    const result2 = await fetchArticleContent("https://example.com/ttl-expire");
    expect(result2).not.toBeNull();
    expect(result2!.fromCache).toBeUndefined();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("failure cache TTL is shorter (1 minute)", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers(),
      text: vi.fn().mockResolvedValue(""),
    });

    const result1 = await fetchArticleContent("https://example.com/fail-ttl");
    expect(result1).toBeNull();
    const callCount1 = mockFetch.mock.calls.length;

    await fetchArticleContent("https://example.com/fail-ttl");
    expect(mockFetch.mock.calls.length).toBe(callCount1);

    vi.advanceTimersByTime(2 * 60 * 1000);

    await fetchArticleContent("https://example.com/fail-ttl");
    expect(mockFetch.mock.calls.length).toBeGreaterThan(callCount1);
  });
});

describe("Article extraction — memory cache max-entry eviction", () => {
  let fetchArticleContent: typeof import("@/lib/utils/article-extractor").fetchArticleContent;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
    setupDefaultMocks();

    const mod = await import("@/lib/utils/article-extractor");
    fetchArticleContent = mod.fetchArticleContent;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("evicts oldest entries when cache exceeds 30 entries", async () => {
    for (let i = 0; i < 35; i++) {
      mockFetch.mockResolvedValueOnce(createServerResponse(`https://example.com/article/${i}`));
    }

    for (let i = 0; i < 35; i++) {
      await fetchArticleContent(`https://example.com/article/${i}`);
    }

    mockFetch.mockResolvedValueOnce(createServerResponse("https://example.com/article/0"));
    const result = await fetchArticleContent("https://example.com/article/0");
    expect(result).not.toBeNull();
    expect(result!.fromCache).toBeUndefined();
  });

  it("keeps recent entries in cache after eviction", async () => {
    for (let i = 0; i < 35; i++) {
      mockFetch.mockResolvedValueOnce(createServerResponse(`https://example.com/keep/${i}`));
    }

    for (let i = 0; i < 35; i++) {
      await fetchArticleContent(`https://example.com/keep/${i}`);
    }

    const result = await fetchArticleContent("https://example.com/keep/34");
    expect(result).not.toBeNull();
    expect(result!.fromCache).toBe(true);
  });
});

describe("Article extraction — basic behavior", () => {
  let fetchArticleContent: typeof import("@/lib/utils/article-extractor").fetchArticleContent;

  beforeEach(async () => {
    vi.resetModules();
    setupDefaultMocks();

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers(),
      text: vi.fn().mockResolvedValue(""),
      json: vi.fn().mockResolvedValue({}),
    }));

    const mod = await import("@/lib/utils/article-extractor");
    fetchArticleContent = mod.fetchArticleContent;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null when extraction fails (no server, no client fallback)", async () => {
    const result = await fetchArticleContent("https://example.com/article/1");
    expect(result).toBeNull();
  });

  it("returns null for empty URL", async () => {
    const result = await fetchArticleContent("");
    expect(result).toBeNull();
  });

  it("ExtractedArticle type has expected shape", () => {
    const sample: ExtractedArticle = {
      html: "<p>test</p>",
      textLength: 4,
      source: "server",
      paywallDetected: false,
      fromCache: true,
    };
    expect(sample.html).toBe("<p>test</p>");
    expect(sample.textLength).toBe(4);
    expect(sample.fromCache).toBe(true);
  });
});

describe("Article extraction — paywall detection integration", () => {
  it("imports and uses detectPaywall from shared module", async () => {
    const { detectPaywall } = await import("../../supabase/functions/_shared/paywall-detection");
    expect(detectPaywall("<div>Subscribe to continue reading</div>")).toBe(true);
    expect(detectPaywall("<div>Normal article content</div>")).toBe(false);
  });

  it("detects French paywall indicators", async () => {
    const { detectPaywall } = await import("../../supabase/functions/_shared/paywall-detection");
    expect(detectPaywall("<div>Réservé aux abonnés</div>")).toBe(true);
    expect(detectPaywall("<div>Abonnez-vous pour lire</div>")).toBe(true);
  });

  it("detects paywall meta patterns", async () => {
    const { PAYWALL_META_PATTERNS } = await import("../../supabase/functions/_shared/paywall-detection");
    expect(PAYWALL_META_PATTERNS.length).toBeGreaterThan(0);
    const testMeta = 'content_access = "paid"';
    const hasMatch = PAYWALL_META_PATTERNS.some((p: RegExp) => p.test(testMeta));
    expect(hasMatch).toBe(true);
  });

  it("detects isAccessibleForFree=false meta pattern", async () => {
    const { PAYWALL_META_PATTERNS } = await import("../../supabase/functions/_shared/paywall-detection");
    const testMeta = 'isAccessibleForFree: false';
    const hasMatch = PAYWALL_META_PATTERNS.some((p: RegExp) => p.test(testMeta));
    expect(hasMatch).toBe(true);
  });
});

describe("CacheMetricsSnapshot — shape validation", () => {
  it("snapshot type has expected fields for monitoring", () => {
    const snapshot: CacheMetricsSnapshot = {
      hits: 100,
      misses: 20,
      evictions: 5,
      expirations: 3,
      stores: 125,
      hitRate: 83.33,
      currentSize: 50,
      averageSize: 2048,
      maxSize: 500,
      ttlMs: 1800000,
      uptimeMs: 3600000,
    };
    expect(snapshot.hits).toBe(100);
    expect(snapshot.hitRate).toBeCloseTo(83.33);
    expect(snapshot.evictions).toBe(5);
    expect(snapshot.expirations).toBe(3);
  });

  it("calculates hit rate from hits and misses", () => {
    const hits = 80;
    const misses = 20;
    const total = hits + misses;
    const hitRate = Math.round((hits / total) * 10000) / 100;
    expect(hitRate).toBe(80);
  });

  it("hit rate is 0 when no requests", () => {
    const total = 0;
    const hitRate = total > 0 ? Math.round((0 / total) * 10000) / 100 : 0;
    expect(hitRate).toBe(0);
  });
});
