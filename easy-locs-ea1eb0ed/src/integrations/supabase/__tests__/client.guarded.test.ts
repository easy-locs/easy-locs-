import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Step 1 — Guarded Supabase client architecture.
 *
 * When VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY are not configured:
 *   - The module MUST load successfully (no module-eval throw).
 *   - The exported `supabase` constant MUST NOT be a fake working client
 *     (no fetches, no websockets against a placeholder host).
 *   - Any property access on it MUST throw a typed
 *     `IntegrationsNotConfiguredError` so callers can surface a real
 *     configuration error instead of a generic network failure.
 */

// The global vitest setup mocks this module; unmock it so we exercise the
// real guarded-proxy implementation.
vi.unmock("@/integrations/supabase/client");

const fetchSpy = vi.fn();

beforeEach(() => {
  vi.resetModules();
  fetchSpy.mockReset();
  vi.stubGlobal("fetch", fetchSpy);
  vi.stubEnv("VITE_SUPABASE_URL", "");
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("supabase client — guarded proxy", () => {
  it("loads without throwing when env vars are missing", async () => {
    const mod = await import("@/integrations/supabase/client");
    expect(mod.supabase).toBeDefined();
    expect(mod.IntegrationsNotConfiguredError).toBeDefined();
  });

  it("does not issue any network calls during module evaluation", async () => {
    await import("@/integrations/supabase/client");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("throws IntegrationsNotConfiguredError on property access", async () => {
    const { supabase, IntegrationsNotConfiguredError } = await import(
      "@/integrations/supabase/client"
    );
    expect(() => (supabase as unknown as { auth: unknown }).auth).toThrow(
      IntegrationsNotConfiguredError,
    );
    expect(() => (supabase as unknown as { from: unknown }).from).toThrow(
      IntegrationsNotConfiguredError,
    );
    expect(() => (supabase as unknown as { channel: unknown }).channel).toThrow(
      IntegrationsNotConfiguredError,
    );
  });

  it("thrown error carries the documented error code", async () => {
    const { supabase, IntegrationsNotConfiguredError } = await import(
      "@/integrations/supabase/client"
    );
    try {
      void (supabase as unknown as { rpc: unknown }).rpc;
      expect.fail("expected IntegrationsNotConfiguredError to be thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(IntegrationsNotConfiguredError);
      expect((err as { code: string }).code).toBe("INTEGRATIONS_NOT_CONFIGURED");
    }
  });
});
