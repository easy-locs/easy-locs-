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

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    section: ({ children, ...props }: any) => <section {...props}>{children}</section>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <I18nProvider>
    <MemoryRouter>{children}</MemoryRouter>
  </I18nProvider>
);

describe("Landing Page - Navbar", () => {
  it("renders brand name and navigation links", async () => {
    const Navbar = (await import("@/components/landing/Navbar")).default;
    render(<Navbar />, { wrapper: Wrapper });
    expect(screen.getByText(/EASY-LOCS/)).toBeInTheDocument();
  });
});

describe("Landing Page - Hero", () => {
  it("renders hero section with CTA", async () => {
    const Hero = (await import("@/components/landing/Hero")).default;
    render(<Hero />, { wrapper: Wrapper });
    const links = screen.getAllByRole("link");
    expect(links.length).toBeGreaterThan(0);
  });
});

describe("Landing Page - Footer", () => {
  it("renders copyright and brand", async () => {
    const Footer = (await import("@/components/landing/Footer")).default;
    render(<Footer />, { wrapper: Wrapper });
    const brandElements = screen.getAllByText(/Easy-Locs/);
    expect(brandElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(new RegExp(new Date().getFullYear().toString()))).toBeInTheDocument();
  });
});

describe("Newsletter Component", () => {
  it("renders email input and submit button", async () => {
    const Newsletter = (await import("@/components/landing/Newsletter")).default;
    render(<Newsletter />, { wrapper: Wrapper });
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeInTheDocument();
  });
});
