import { describe, it, expect, vi, beforeEach } from "vitest";
import { detectPaywall, PAYWALL_INDICATORS, PAYWALL_META_PATTERNS } from "../../supabase/functions/_shared/paywall-detection";
import { validateUrlSsrf } from "../../supabase/functions/_shared/ssrf-validation";

describe("Paywall Detection", () => {
  describe("English indicators", () => {
    it("detects 'subscribe to continue'", () => {
      const html = "<div>Please subscribe to continue reading this article.</div>";
      expect(detectPaywall(html)).toBe(true);
    });

    it("detects 'subscribe to read'", () => {
      const html = "<p>Subscribe to read the full article</p>";
      expect(detectPaywall(html)).toBe(true);
    });

    it("detects 'subscription required'", () => {
      const html = "<span>Subscription required for full access</span>";
      expect(detectPaywall(html)).toBe(true);
    });

    it("detects 'premium content'", () => {
      const html = "<div class='notice'>This is premium content</div>";
      expect(detectPaywall(html)).toBe(true);
    });

    it("detects 'members only'", () => {
      const html = "<div>This article is for members only</div>";
      expect(detectPaywall(html)).toBe(true);
    });

    it("detects 'paywall' keyword", () => {
      const html = "<div>Content behind paywall</div>";
      expect(detectPaywall(html)).toBe(true);
    });

    it("detects 'sign in to read'", () => {
      const html = "<p>Sign in to read this article</p>";
      expect(detectPaywall(html)).toBe(true);
    });

    it("detects 'log in to continue'", () => {
      const html = "<p>Log in to continue reading</p>";
      expect(detectPaywall(html)).toBe(true);
    });

    it("detects 'create a free account'", () => {
      const html = "<div>Create a free account to access</div>";
      expect(detectPaywall(html)).toBe(true);
    });

    it("detects 'register to continue'", () => {
      const html = "<p>Register to continue reading</p>";
      expect(detectPaywall(html)).toBe(true);
    });
  });

  describe("French indicators", () => {
    it("detects 'abonnez-vous'", () => {
      const html = "<div>Abonnez-vous pour lire cet article</div>";
      expect(detectPaywall(html)).toBe(true);
    });

    it("detects 'réservé aux abonnés'", () => {
      const html = "<p>Cet article est réservé aux abonnés</p>";
      expect(detectPaywall(html)).toBe(true);
    });

    it("detects 'contenu réservé'", () => {
      const html = "<div>Contenu réservé</div>";
      expect(detectPaywall(html)).toBe(true);
    });

    it("detects 'accès réservé'", () => {
      const html = "<span>Accès réservé aux membres</span>";
      expect(detectPaywall(html)).toBe(true);
    });

    it("detects 'article réservé'", () => {
      const html = "<p>Article réservé aux abonnés premium</p>";
      expect(detectPaywall(html)).toBe(true);
    });

    it("detects 'pour lire la suite'", () => {
      const html = "<div>Abonnez-vous pour lire la suite</div>";
      expect(detectPaywall(html)).toBe(true);
    });

    it("detects 'connectez-vous'", () => {
      const html = "<p>Connectez-vous pour accéder</p>";
      expect(detectPaywall(html)).toBe(true);
    });

    it("detects 'créez votre compte'", () => {
      const html = "<div>Créez votre compte pour continuer</div>";
      expect(detectPaywall(html)).toBe(true);
    });
  });

  describe("meta patterns", () => {
    it("detects isAccessibleForFree = false (JSON-LD)", () => {
      const html = '<script type="application/ld+json">{"isAccessibleForFree": false}</script>';
      expect(detectPaywall(html)).toBe(true);
    });

    it("detects isAccessibleForFree with single quotes", () => {
      const html = "<meta content='isAccessibleForFree': false />";
      expect(detectPaywall(html)).toBe(true);
    });

    it("detects content_access = paid", () => {
      const html = '<meta name="content_access" content_access = "paid" />';
      expect(detectPaywall(html)).toBe(true);
    });

    it("detects content_access:paid without quotes", () => {
      const html = '<div data-config="content_access:paid"></div>';
      expect(detectPaywall(html)).toBe(true);
    });

    it("detects paywall = true", () => {
      const html = '<meta name="paywall" paywall = "true" />';
      expect(detectPaywall(html)).toBe(true);
    });

    it("detects paywall:true", () => {
      const html = '<script>config = { paywall: true }</script>';
      expect(detectPaywall(html)).toBe(true);
    });

    it("is case-insensitive for meta patterns", () => {
      const html = '<script>{"ISACCESSIBLEFORFREE": false}</script>';
      expect(detectPaywall(html)).toBe(true);
    });
  });

  describe("non-paywall content", () => {
    it("returns false for normal article text", () => {
      const html = `
        <article>
          <h1>Breaking News</h1>
          <p>This is a normal free article about technology advances.</p>
          <p>No restrictions here, just great writing for everyone.</p>
        </article>
      `;
      expect(detectPaywall(html)).toBe(false);
    });

    it("returns false for empty content", () => {
      expect(detectPaywall("")).toBe(false);
    });

    it("returns false for content with similar but non-matching words", () => {
      const html = "<p>Subscribe to our newsletter for updates</p>";
      expect(detectPaywall(html)).toBe(false);
    });

    it("strips HTML tags before checking text indicators", () => {
      const html = '<div class="subscribe-to-continue">Normal text here</div>';
      expect(detectPaywall(html)).toBe(false);
    });
  });

  describe("indicator completeness", () => {
    it("has all expected English indicators", () => {
      const englishIndicators = PAYWALL_INDICATORS.filter((i) => !/[àéèêëîïôùûüÿçœæ]/.test(i));
      expect(englishIndicators.length).toBeGreaterThanOrEqual(10);
    });

    it("has all expected French indicators", () => {
      const frenchIndicators = PAYWALL_INDICATORS.filter((i) => /[àéèêëîïôùûüÿçœæ-]/.test(i) && /[a-z]/.test(i));
      expect(frenchIndicators.length).toBeGreaterThanOrEqual(5);
    });

    it("has meta patterns for schema.org, content_access, and paywall flag", () => {
      expect(PAYWALL_META_PATTERNS.length).toBe(3);
      expect(PAYWALL_META_PATTERNS[0].test('isAccessibleForFree: false')).toBe(true);
      expect(PAYWALL_META_PATTERNS[1].test('content_access: paid')).toBe(true);
      expect(PAYWALL_META_PATTERNS[2].test('paywall: true')).toBe(true);
    });
  });
});

describe("SSRF URL Validation", () => {
  describe("blocked hosts", () => {
    it("blocks localhost", () => {
      expect(validateUrlSsrf("http://localhost/api")).toEqual({
        blocked: true,
        reason: "URL targets a restricted address",
      });
    });

    it("blocks 127.0.0.1", () => {
      expect(validateUrlSsrf("http://127.0.0.1:8080/path")).toEqual({
        blocked: true,
        reason: "URL targets a restricted address",
      });
    });

    it("blocks 0.0.0.0", () => {
      expect(validateUrlSsrf("http://0.0.0.0")).toEqual({
        blocked: true,
        reason: "URL targets a restricted address",
      });
    });

    it("blocks [::1]", () => {
      expect(validateUrlSsrf("http://[::1]/admin")).toEqual({
        blocked: true,
        reason: "URL targets a restricted address",
      });
    });

    it("blocks metadata.google.internal", () => {
      expect(validateUrlSsrf("http://metadata.google.internal/computeMetadata/v1/")).toEqual({
        blocked: true,
        reason: "URL targets a restricted address",
      });
    });

    it("blocks AWS metadata IP 169.254.169.254", () => {
      expect(validateUrlSsrf("http://169.254.169.254/latest/meta-data/")).toEqual({
        blocked: true,
        reason: "URL targets a restricted address",
      });
    });
  });

  describe("blocked suffixes", () => {
    it("blocks .local domains", () => {
      expect(validateUrlSsrf("http://myapp.local/api")).toEqual({
        blocked: true,
        reason: "URL targets a restricted address",
      });
    });

    it("blocks .internal domains", () => {
      expect(validateUrlSsrf("http://service.internal/data")).toEqual({
        blocked: true,
        reason: "URL targets a restricted address",
      });
    });

    it("blocks .localhost domains", () => {
      expect(validateUrlSsrf("http://test.localhost/")).toEqual({
        blocked: true,
        reason: "URL targets a restricted address",
      });
    });
  });

  describe("private IP ranges", () => {
    it("blocks 10.x.x.x (class A private)", () => {
      expect(validateUrlSsrf("http://10.0.0.1/admin")).toEqual({
        blocked: true,
        reason: "URL targets a restricted address",
      });
    });

    it("blocks 172.16-31.x.x (class B private)", () => {
      expect(validateUrlSsrf("http://172.16.0.1")).toEqual({
        blocked: true,
        reason: "URL targets a restricted address",
      });
      expect(validateUrlSsrf("http://172.31.255.255")).toEqual({
        blocked: true,
        reason: "URL targets a restricted address",
      });
    });

    it("blocks 192.168.x.x (class C private)", () => {
      expect(validateUrlSsrf("http://192.168.1.1")).toEqual({
        blocked: true,
        reason: "URL targets a restricted address",
      });
    });

    it("blocks 169.254.x.x (link-local)", () => {
      expect(validateUrlSsrf("http://169.254.1.1")).toEqual({
        blocked: true,
        reason: "URL targets a restricted address",
      });
    });

    it("blocks 0.x.x.x addresses", () => {
      expect(validateUrlSsrf("http://0.0.0.1")).toEqual({
        blocked: true,
        reason: "URL targets a restricted address",
      });
    });
  });

  describe("IPv6 private ranges", () => {
    it("blocks fc00::/7 (ULA) addresses", () => {
      expect(validateUrlSsrf("http://[fc00::1]")).toEqual({
        blocked: true,
        reason: "URL targets a restricted address",
      });
    });

    it("blocks fd00::/8 addresses", () => {
      expect(validateUrlSsrf("http://[fd12::1]")).toEqual({
        blocked: true,
        reason: "URL targets a restricted address",
      });
    });

    it("blocks fe80:: (link-local) addresses", () => {
      expect(validateUrlSsrf("http://[fe80::1]")).toEqual({
        blocked: true,
        reason: "URL targets a restricted address",
      });
    });
  });

  describe("non-HTTP protocols", () => {
    it("blocks ftp protocol", () => {
      expect(validateUrlSsrf("ftp://example.com/file")).toEqual({
        blocked: true,
        reason: "Only http and https URLs are allowed",
      });
    });

    it("blocks file protocol", () => {
      expect(validateUrlSsrf("file:///etc/passwd")).toEqual({
        blocked: true,
        reason: "Only http and https URLs are allowed",
      });
    });

    it("blocks javascript protocol", () => {
      expect(validateUrlSsrf("javascript:alert(1)")).toEqual({
        blocked: true,
        reason: "Only http and https URLs are allowed",
      });
    });

    it("blocks data protocol", () => {
      expect(validateUrlSsrf("data:text/html,<script>alert(1)</script>")).toEqual({
        blocked: true,
        reason: "Only http and https URLs are allowed",
      });
    });
  });

  describe("invalid URLs", () => {
    it("blocks malformed URLs", () => {
      expect(validateUrlSsrf("not-a-url")).toEqual({
        blocked: true,
        reason: "Invalid URL format",
      });
    });

    it("blocks empty strings", () => {
      expect(validateUrlSsrf("")).toEqual({
        blocked: true,
        reason: "Invalid URL format",
      });
    });
  });

  describe("allowed URLs", () => {
    it("allows valid HTTP URLs", () => {
      expect(validateUrlSsrf("http://example.com/article")).toEqual({
        blocked: false,
      });
    });

    it("allows valid HTTPS URLs", () => {
      expect(validateUrlSsrf("https://www.lemonde.fr/article/123")).toEqual({
        blocked: false,
      });
    });

    it("allows public IPs", () => {
      expect(validateUrlSsrf("http://93.184.216.34/page")).toEqual({
        blocked: false,
      });
    });

    it("allows 172.x outside private range", () => {
      expect(validateUrlSsrf("http://172.15.0.1")).toEqual({
        blocked: false,
      });
      expect(validateUrlSsrf("http://172.32.0.1")).toEqual({
        blocked: false,
      });
    });
  });
});

describe("Fallback Ordering (server-first, then client)", () => {
  let mockFetchResponses: Array<{ ok: boolean; status: number; body: unknown; headers?: Record<string, string> }>;
  let fetchCallUrls: string[];

  beforeEach(() => {
    mockFetchResponses = [];
    fetchCallUrls = [];

    vi.stubGlobal("fetch", vi.fn(async (url: string | URL | Request) => {
      const urlStr = typeof url === "string" ? url : url instanceof URL ? url.toString() : url.url;
      fetchCallUrls.push(urlStr);
      const resp = mockFetchResponses.shift();
      if (!resp) {
        throw new Error("No mock response available");
      }
      return {
        ok: resp.ok,
        status: resp.status,
        headers: new Headers(resp.headers ?? { "content-type": "application/json" }),
        json: async () => resp.body,
        text: async () => typeof resp.body === "string" ? resp.body : JSON.stringify(resp.body),
      };
    }));
  });

  it("tries server extraction first before client fallback", async () => {
    const { fetchArticleContent } = await import("@/lib/utils/article-extractor");

    mockFetchResponses = [
      {
        ok: true,
        status: 200,
        body: {
          status: "ok",
          html: "<p>" + "A".repeat(200) + "</p>",
          textLength: 200,
          source: "firecrawl",
          paywallDetected: false,
        },
      },
    ];

    const result = await fetchArticleContent("https://example.com/test-server-first-" + Date.now());

    expect(fetchCallUrls.length).toBeGreaterThanOrEqual(1);
    const serverCall = fetchCallUrls.find((u) => u.includes("extract-article"));
    expect(serverCall).toBeDefined();
  });

  it("falls back to client CORS proxy when server returns error status", async () => {
    const { fetchArticleContent } = await import("@/lib/utils/article-extractor");

    const longContent = "<article><p>" + "B".repeat(300) + "</p></article>";
    const fullHtml = `<html><body>${longContent}</body></html>`;

    mockFetchResponses = [
      { ok: false, status: 500, body: { error: "Internal error" } },
      {
        ok: true,
        status: 200,
        body: fullHtml,
        headers: { "content-type": "text/html" },
      },
      {
        ok: true,
        status: 200,
        body: fullHtml,
        headers: { "content-type": "text/html" },
      },
    ];

    const result = await fetchArticleContent("https://example.com/test-fallback-" + Date.now());

    const serverCall = fetchCallUrls.find((u) => u.includes("extract-article"));
    expect(serverCall).toBeDefined();

    const proxyCall = fetchCallUrls.find(
      (u) => u.includes("allorigins") || u.includes("corsproxy")
    );
    expect(proxyCall).toBeDefined();
  });

  it("falls back to client when server returns insufficient content", async () => {
    const { fetchArticleContent } = await import("@/lib/utils/article-extractor");

    const longContent = "<article><p>" + "C".repeat(300) + "</p></article>";
    const fullHtml = `<html><body>${longContent}</body></html>`;

    mockFetchResponses = [
      {
        ok: true,
        status: 200,
        body: {
          status: "error",
          html: null,
          textLength: 0,
          source: "direct_fetch",
          paywallDetected: false,
        },
      },
      {
        ok: true,
        status: 200,
        body: fullHtml,
        headers: { "content-type": "text/html" },
      },
      {
        ok: true,
        status: 200,
        body: fullHtml,
        headers: { "content-type": "text/html" },
      },
    ];

    const result = await fetchArticleContent("https://example.com/test-insufficient-" + Date.now());

    const proxyCall = fetchCallUrls.find(
      (u) => u.includes("allorigins") || u.includes("corsproxy")
    );
    expect(proxyCall).toBeDefined();
  });

  it("returns paywall result from server without falling back to client", async () => {
    const { fetchArticleContent } = await import("@/lib/utils/article-extractor");

    mockFetchResponses = [
      {
        ok: true,
        status: 200,
        body: {
          status: "paywall",
          html: "<p>" + "D".repeat(200) + "</p>",
          textLength: 200,
          source: "firecrawl",
          paywallDetected: true,
          message: "Contenu protégé par un paywall — résumé RSS affiché",
        },
      },
    ];

    const result = await fetchArticleContent("https://example.com/test-paywall-server-" + Date.now());

    expect(result).not.toBeNull();
    expect(result!.paywallDetected).toBe(true);
    expect(result!.source).toBe("server");

    const proxyCall = fetchCallUrls.find(
      (u) => u.includes("allorigins") || u.includes("corsproxy")
    );
    expect(proxyCall).toBeUndefined();
  });

  it("does not call client proxy when server returns valid ok payload", async () => {
    const { fetchArticleContent } = await import("@/lib/utils/article-extractor");

    mockFetchResponses = [
      {
        ok: true,
        status: 200,
        body: {
          status: "ok",
          html: "<p>" + "E".repeat(300) + "</p>",
          textLength: 300,
          source: "direct_fetch",
          paywallDetected: false,
        },
      },
    ];

    const result = await fetchArticleContent("https://example.com/test-no-fallback-" + Date.now());

    expect(result).not.toBeNull();
    expect(result!.source).toBe("server");
    expect(result!.textLength).toBe(300);

    const proxyCall = fetchCallUrls.find(
      (u) => u.includes("allorigins") || u.includes("corsproxy")
    );
    expect(proxyCall).toBeUndefined();
  });
});
