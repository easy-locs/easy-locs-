import { describe, it, expect } from "vitest";
import { normalizeUrl } from "@/lib/onboarding/pipeline/input/input.url.normalize";

describe("normalizeUrl — onboarding pipeline URL normalization", () => {
  it("returns a NormalizedUrl object with expected shape", () => {
    const result = normalizeUrl("https://example.com/article");
    expect(result).toHaveProperty("original");
    expect(result).toHaveProperty("normalized");
    expect(result).toHaveProperty("protocol");
    expect(result).toHaveProperty("hostname");
    expect(result).toHaveProperty("pathname");
    expect(result).toHaveProperty("search");
  });

  it("preserves original input", () => {
    const result = normalizeUrl("https://example.com/article?id=1");
    expect(result.original).toBe("https://example.com/article?id=1");
  });

  it("normalizes protocol to https by default", () => {
    const result = normalizeUrl("example.com/article");
    expect(result.protocol).toBe("https");
    expect(result.normalized).toContain("https://");
  });

  it("preserves explicit http protocol", () => {
    const result = normalizeUrl("http://example.com/article");
    expect(result.protocol).toBe("http");
  });

  it("strips www. from hostname", () => {
    const result = normalizeUrl("https://www.example.com/article");
    expect(result.hostname).toBe("example.com");
  });

  it("preserves hostname without www.", () => {
    const result = normalizeUrl("https://example.com/article");
    expect(result.hostname).toBe("example.com");
  });

  it("extracts pathname correctly", () => {
    const result = normalizeUrl("https://example.com/path/to/article");
    expect(result.pathname).toBe("/path/to/article");
  });

  it("extracts search/query string", () => {
    const result = normalizeUrl("https://example.com/page?id=1&sort=desc");
    expect(result.search).toContain("id=1");
    expect(result.search).toContain("sort=desc");
  });

  it("strips trailing slash from normalized URL", () => {
    const result = normalizeUrl("https://example.com/");
    expect(result.normalized).not.toMatch(/\/$/);
  });

  it("handles URLs with no path", () => {
    const result = normalizeUrl("https://example.com");
    expect(result.hostname).toBe("example.com");
    expect(result.pathname).toBe("/");
  });

  it("handles URLs with port", () => {
    const result = normalizeUrl("https://example.com:8080/path");
    expect(result.normalized).toContain("8080");
  });

  it("handles malformed input gracefully", () => {
    const result = normalizeUrl("not a url at all");
    expect(result.original).toBe("not a url at all");
    expect(result.normalized).toBeDefined();
  });

  it("handles empty string", () => {
    const result = normalizeUrl("");
    expect(result.original).toBe("");
    expect(result.normalized).toBeDefined();
  });
});

describe("normalizeUrl — cache key deduplication", () => {
  it("produces same hostname for www and non-www variants", () => {
    const r1 = normalizeUrl("https://www.lemonde.fr/article/123");
    const r2 = normalizeUrl("https://lemonde.fr/article/123");
    expect(r1.hostname).toBe(r2.hostname);
  });

  it("different paths produce different normalized URLs", () => {
    const r1 = normalizeUrl("https://lemonde.fr/article/123");
    const r2 = normalizeUrl("https://lemonde.fr/article/456");
    expect(r1.normalized).not.toBe(r2.normalized);
  });

  it("different domains produce different hostnames", () => {
    const r1 = normalizeUrl("https://lemonde.fr/article/123");
    const r2 = normalizeUrl("https://lefigaro.fr/article/123");
    expect(r1.hostname).not.toBe(r2.hostname);
  });

  it("protocol-less URLs get normalized with https", () => {
    const result = normalizeUrl("lemonde.fr/article/123");
    expect(result.protocol).toBe("https");
    expect(result.hostname).toBe("lemonde.fr");
  });
});
