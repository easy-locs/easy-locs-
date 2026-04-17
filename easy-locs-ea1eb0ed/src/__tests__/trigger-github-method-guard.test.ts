/**
 * Task #849 — Lock the trigger-github Edge Function to POST-only requests.
 *
 * Pins the contract of `supabase/functions/trigger-github/method-guard.ts`,
 * which the edge function uses to short-circuit any non-POST/OPTIONS request
 * with `405 Method Not Allowed` before it touches auth, the dispatch RPC, or
 * the GitHub runner. This prevents stray probes (health checks, accidental
 * browser navigations, link prefetchers, …) from triggering a real CI run.
 */

import { describe, expect, it } from "vitest";

import {
  TRIGGER_GITHUB_ALLOWED_METHODS,
  buildMethodNotAllowedResponse,
  isAllowedTriggerGithubMethod,
} from "../../supabase/functions/trigger-github/method-guard.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

describe("trigger-github method guard", () => {
  it("allows POST (the dispatch path)", () => {
    expect(isAllowedTriggerGithubMethod("POST")).toBe(true);
  });

  it("allows OPTIONS (CORS preflight)", () => {
    expect(isAllowedTriggerGithubMethod("OPTIONS")).toBe(true);
  });

  it.each(["GET", "HEAD", "PUT", "PATCH", "DELETE", "TRACE", "CONNECT"])(
    "rejects %s",
    (method) => {
      expect(isAllowedTriggerGithubMethod(method)).toBe(false);
    },
  );

  it("is case-sensitive — a lowercase 'post' is not the canonical POST", () => {
    // Standards-compliant HTTP methods are uppercase; runtimes (Deno included)
    // surface them that way on Request.method. Anything else is suspicious and
    // should be rejected so we don't silently accept malformed clients.
    expect(isAllowedTriggerGithubMethod("post")).toBe(false);
  });

  describe("buildMethodNotAllowedResponse", () => {
    it("returns a 405 JSON response", async () => {
      const response = buildMethodNotAllowedResponse(CORS_HEADERS);

      expect(response.status).toBe(405);
      expect(response.headers.get("Content-Type")).toBe("application/json");
      await expect(response.json()).resolves.toEqual({
        error: "Method Not Allowed",
      });
    });

    it("advertises the allowed methods in the Allow header", () => {
      const response = buildMethodNotAllowedResponse(CORS_HEADERS);

      expect(response.headers.get("Allow")).toBe(
        TRIGGER_GITHUB_ALLOWED_METHODS,
      );
      expect(TRIGGER_GITHUB_ALLOWED_METHODS).toBe("POST, OPTIONS");
    });

    it("preserves the caller-supplied CORS headers", () => {
      const response = buildMethodNotAllowedResponse(CORS_HEADERS);

      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
      expect(response.headers.get("Access-Control-Allow-Headers")).toBe(
        CORS_HEADERS["Access-Control-Allow-Headers"],
      );
    });
  });
});
