import { describe, it, expect } from "vitest";
import {
  resolveUserTier,
  getEndpointLimit,
  getTierEndpointLimit,
  rateLimitHeaders,
} from "@/lib/shared/rate-limit-tiers";

describe("resolveUserTier", () => {
  it("returns 'free' for null", () => {
    expect(resolveUserTier(null)).toBe("free");
  });

  it("returns 'free' for undefined", () => {
    expect(resolveUserTier(undefined)).toBe("free");
  });

  it("returns 'free' for unrecognized tier", () => {
    expect(resolveUserTier("basic")).toBe("free");
    expect(resolveUserTier("starter")).toBe("free");
    expect(resolveUserTier("pro")).toBe("free");
  });

  it("returns 'premium' for premium", () => {
    expect(resolveUserTier("premium")).toBe("premium");
  });

  it("returns 'enterprise' for enterprise", () => {
    expect(resolveUserTier("enterprise")).toBe("enterprise");
  });

  it("returns 'free' for empty string", () => {
    expect(resolveUserTier("")).toBe("free");
  });
});

describe("getEndpointLimit", () => {
  it("returns auth limit for login endpoint", () => {
    expect(getEndpointLimit("login")).toEqual({ maxRequests: 5, windowSeconds: 60 });
  });

  it("returns payment limit for extract-article", () => {
    expect(getEndpointLimit("extract-article")).toEqual({ maxRequests: 10, windowSeconds: 60 });
  });

  it("returns message limit for send-message", () => {
    expect(getEndpointLimit("send-message")).toEqual({ maxRequests: 30, windowSeconds: 60 });
  });

  it("returns default limit for unknown endpoint", () => {
    expect(getEndpointLimit("unknown-endpoint")).toEqual({ maxRequests: 60, windowSeconds: 60 });
  });

  it("returns standard limit for booking-create", () => {
    expect(getEndpointLimit("booking-create")).toEqual({ maxRequests: 60, windowSeconds: 60 });
  });

  it("returns auth limit for send-otp", () => {
    expect(getEndpointLimit("send-otp")).toEqual({ maxRequests: 5, windowSeconds: 60 });
  });
});

describe("getTierEndpointLimit", () => {
  describe("free tier", () => {
    it("uses base limits (no multiplier)", () => {
      expect(getTierEndpointLimit("extract-article", "free")).toEqual({
        maxRequests: 10,
        windowSeconds: 60,
      });
    });

    it("uses base limits for ai-assistant", () => {
      expect(getTierEndpointLimit("ai-assistant", "free")).toEqual({
        maxRequests: 60,
        windowSeconds: 60,
      });
    });
  });

  describe("premium tier", () => {
    it("uses endpoint-specific override for extract-article", () => {
      const result = getTierEndpointLimit("extract-article", "premium");
      expect(result.maxRequests).toBe(30);
      expect(result.windowSeconds).toBe(60);
    });

    it("uses endpoint-specific override for ai-assistant", () => {
      const result = getTierEndpointLimit("ai-assistant", "premium");
      expect(result.maxRequests).toBe(120);
    });

    it("applies global 2x multiplier for endpoints without override", () => {
      const result = getTierEndpointLimit("login", "premium");
      expect(result.maxRequests).toBe(Math.floor(5 * 2));
    });

    it("applies global 2x multiplier for unknown endpoints", () => {
      const result = getTierEndpointLimit("unknown-ep", "premium");
      expect(result.maxRequests).toBe(Math.floor(60 * 2));
    });
  });

  describe("enterprise tier", () => {
    it("uses endpoint-specific override for extract-article", () => {
      const result = getTierEndpointLimit("extract-article", "enterprise");
      expect(result.maxRequests).toBe(100);
    });

    it("uses endpoint-specific override for booking-create", () => {
      const result = getTierEndpointLimit("booking-create", "enterprise");
      expect(result.maxRequests).toBe(120);
    });

    it("applies global 5x multiplier for endpoints without override", () => {
      const result = getTierEndpointLimit("login", "enterprise");
      expect(result.maxRequests).toBe(Math.floor(5 * 5));
    });

    it("preserves windowSeconds from base config", () => {
      const result = getTierEndpointLimit("extract-article", "enterprise");
      expect(result.windowSeconds).toBe(60);
    });
  });

  it("defaults to free tier when tier not provided", () => {
    const result = getTierEndpointLimit("extract-article");
    expect(result.maxRequests).toBe(10);
  });
});

describe("rateLimitHeaders", () => {
  it("includes X-RateLimit-Limit and X-RateLimit-Remaining for allowed requests", () => {
    const headers = rateLimitHeaders(
      { allowed: true, remaining: 5, retryAfterSeconds: 0 },
      10
    );
    expect(headers["X-RateLimit-Limit"]).toBe("10");
    expect(headers["X-RateLimit-Remaining"]).toBe("5");
    expect(headers["Retry-After"]).toBeUndefined();
  });

  it("includes Retry-After for denied requests", () => {
    const headers = rateLimitHeaders(
      { allowed: false, remaining: 0, retryAfterSeconds: 30 },
      10
    );
    expect(headers["X-RateLimit-Limit"]).toBe("10");
    expect(headers["X-RateLimit-Remaining"]).toBe("0");
    expect(headers["Retry-After"]).toBe("30");
  });
});
