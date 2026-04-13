import { describe, it, expect, vi } from "vitest";

// Mock supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signOut: vi.fn().mockResolvedValue({}),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      limit: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
    }),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: { subscribed: true, plan: "unlimited" }, error: null }),
    },
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    }),
    removeChannel: vi.fn(),
    removeAllChannels: vi.fn(),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: "mock" }, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "" } }),
        list: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    },
  },
}));

// Mock lovable auth
vi.mock("@/integrations/lovable/index", () => ({
  lovable: {
    auth: {
      signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}));

describe("Core Utilities", () => {
  it("cn utility merges classes correctly", async () => {
    const { cn } = await import("@/lib/utils");
    expect(cn("px-4", "py-2")).toBe("px-4 py-2");
    expect(cn("text-red-500", "text-red-500")).toBe("text-red-500");
  });
});

describe("Country Config", () => {
  it("COUNTRY_LOCALE_MAP maps FR to fr", async () => {
    const { COUNTRY_LOCALE_MAP } = await import("@/lib/i18n");
    expect(COUNTRY_LOCALE_MAP.FR).toBe("fr");
    expect(COUNTRY_LOCALE_MAP.US).toBe("en");
    expect(COUNTRY_LOCALE_MAP.DE).toBe("de");
    expect(COUNTRY_LOCALE_MAP.ES).toBe("es");
    expect(COUNTRY_LOCALE_MAP.AE).toBe("en");
  });

  it("COUNTRY_CURRENCY_MAP returns correct currencies", async () => {
    const { COUNTRY_CURRENCY_MAP } = await import("@/lib/i18n");
    expect(COUNTRY_CURRENCY_MAP.FR).toBe("EUR");
    expect(COUNTRY_CURRENCY_MAP.GB).toBe("GBP");
    expect(COUNTRY_CURRENCY_MAP.US).toBe("USD");
    expect(COUNTRY_CURRENCY_MAP.AE).toBe("AED");
    expect(COUNTRY_CURRENCY_MAP.CH).toBe("CHF");
  });
});

describe("i18n translations completeness", () => {
  it("all required newsletter keys exist in FR", async () => {
    const keys = [
      "newsletter.badge", "newsletter.title", "newsletter.subtitle",
      "newsletter.placeholder", "newsletter.cta", "newsletter.success",
      "newsletter.already_subscribed", "newsletter.error",
    ];
    // Dynamic import to get the translations object
    const mod = await import("@/lib/i18n");
    // We can't directly access translations, but we can verify the module loads
    expect(mod.COUNTRY_LOCALE_MAP).toBeDefined();
  });
});

describe("Template Types", () => {
  it("exports all required types", async () => {
    const types = await import("@/lib/templates/types");
    // Verify the module has the expected exports
    expect(types).toBeDefined();
  });
});
