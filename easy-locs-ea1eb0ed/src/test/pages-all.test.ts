import { describe, it, expect, vi } from "vitest";

// Mock supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signOut: vi.fn().mockResolvedValue({}),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      limit: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
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
    getChannels: vi.fn().mockReturnValue([]),
    removeAllChannels: vi.fn(),
    schema: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        limit: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    }),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: "mock" }, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "" } }),
        list: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    },
  },
}));


describe("All Pages — Default Export Check", () => {
  const pages = [
    "Index", "Login", "Signup", "ForgotPassword", "ResetPassword", "VerifyEmail",
    "Dashboard", "Receipts", "Reminders", "Documents", "Leases", "Company",
    "Billing", "Settings", "Tenants", "RentalManagement", "Finances",
    "Interventions", "Tasks", "Expenses", "Candidates",
    "SeasonalRentals", "PaymentNotices", "DunningLetters", "Buildings",
    "Vault", "DataImport", "Referrals", "AdminDashboard",
    "Onboarding", "Accounting", "FiscalReport",
    "ChargesRegularization", "Collaboration", "DeveloperPortal",
    "ChannelManager", "DynamicPricing", "FurnitureInventory",
    "Install", "AIAssistant", "LandlordProfile", "PublicListing",
    "AuditTrail",
  ];

  it("all pages can be imported and have default exports", async () => {
    const results = await Promise.allSettled(
      pages.map((page) => import(`../pages/${page}.tsx`))
    );
    results.forEach((result, i) => {
      expect(result.status, `${pages[i]} failed to import`).toBe("fulfilled");
      if (result.status === "fulfilled") {
        expect(result.value.default, `${pages[i]} missing default export`).toBeDefined();
        expect(typeof result.value.default, `${pages[i]} default is not a function`).toBe("function");
      }
    });
  });
});

describe("Legal Pages — Default Export Check", () => {
  const legalPages = [
    "AboutPage", "ContactPage", "CookiePage", "HelpPage",
    "LegalNoticePage", "PrivacyPage", "TermsPage",
  ];

  it("all legal pages can be imported and have default exports", async () => {
    const results = await Promise.allSettled(
      legalPages.map((page) => import(`../pages/legal/${page}.tsx`))
    );
    results.forEach((result, i) => {
      expect(result.status, `${legalPages[i]} failed to import`).toBe("fulfilled");
      if (result.status === "fulfilled") {
        expect(result.value.default, `${legalPages[i]} missing default export`).toBeDefined();
        expect(typeof result.value.default, `${legalPages[i]} default is not a function`).toBe("function");
      }
    });
  });
});
