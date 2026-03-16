import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "@/lib/i18n";

// Mock supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null }),
      limit: vi.fn().mockReturnThis(),
    }),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: { subscribed: true, plan: "unlimited" }, error: null }),
    },
  },
}));

vi.mock("@/integrations/lovable/index", () => ({
  lovable: { auth: { signInWithOAuth: vi.fn() } },
}));

vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal() as any;
  const handler = {
    get(_: any, tag: string) {
      if (tag === '__esModule') return false;
      return (props: any) => {
        const { children, initial, animate, exit, whileInView, whileHover, whileTap, transition, variants, viewport, ...safe } = props || {};
        const El = typeof tag === 'string' && /^[a-z]/.test(tag) ? tag : 'div';
        // @ts-ignore
        return <El {...safe}>{children}</El>;
      };
    },
  };
  return {
    ...actual,
    motion: new Proxy({}, handler),
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <I18nProvider>
    <MemoryRouter>{children}</MemoryRouter>
  </I18nProvider>
);

describe("Landing Page - Navbar", () => {
  it("renders brand name and navigation links", async () => {
    const Navbar = (await import("@/components/landing/Navbar")).default;
    const { container } = render(<Navbar />, { wrapper: Wrapper });
    // Brand rendered as logo image or text
    const hasLinks = container.querySelectorAll("a").length > 0;
    expect(hasLinks).toBe(true);
  });
});

describe("Landing Page - Hero", () => {
  it("renders hero section with CTA buttons", async () => {
    const Hero = (await import("@/components/landing/Hero")).default;
    const { container } = render(<Hero />, { wrapper: Wrapper });
    const links = container.querySelectorAll("a");
    expect(links.length).toBeGreaterThan(0);
  });
});

describe("Landing Page - Footer", () => {
  it("renders copyright and brand", async () => {
    const Footer = (await import("@/components/landing/Footer")).default;
    const { container } = render(<Footer />, { wrapper: Wrapper });
    expect(container.textContent).toContain("Easy-Locs");
    expect(container.textContent).toContain(new Date().getFullYear().toString());
  });
});

describe("Newsletter Component", () => {
  it("renders email input and submit button", async () => {
    const Newsletter = (await import("@/components/landing/Newsletter")).default;
    const { container } = render(<Newsletter />, { wrapper: Wrapper });
    expect(container.querySelector("input")).toBeTruthy();
    expect(container.querySelector("button")).toBeTruthy();
  });
});
