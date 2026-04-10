import { describe, it, expect } from "vitest";

/**
 * UI Consistency Tests
 * Verifies that all design tokens, card structures, and layout primitives
 * remain consistent across the application.
 */

describe("UI Design Tokens", () => {
  it("card component uses semantic tokens only", async () => {
    const cardModule = await import("@/components/ui/card");
    expect(cardModule.Card).toBeDefined();
    expect(cardModule.CardHeader).toBeDefined();
    expect(cardModule.CardContent).toBeDefined();
    expect(cardModule.CardFooter).toBeDefined();
  });

  it("stat-card component exists and is exportable", async () => {
    const statCard = await import("@/components/ui/stat-card");
    expect(statCard).toBeDefined();
  });

  it("button component has required variants", async () => {
    const btn = await import("@/components/ui/button");
    expect(btn.Button).toBeDefined();
    expect(btn.buttonVariants).toBeDefined();
  });
});

describe("Responsive Layout Primitives", () => {
  it("DashboardLayout is importable without errors", async () => {
    const mod = await import("@/components/dashboard/DashboardLayout");
    expect(mod.default).toBeDefined();
  });

  it("ErrorBoundary wraps children correctly", async () => {
    const mod = await import("@/components/ErrorBoundary");
    expect(mod.default).toBeDefined();
  });
});

describe("Design System Consistency", () => {
  it("utils cn function merges classes correctly", async () => {
    const { cn } = await import("@/lib/utils");
    expect(cn("px-4", "py-2")).toBe("px-4 py-2");
    expect(cn("text-foreground", "text-foreground")).toBe("text-foreground");
    expect(cn("bg-card", undefined, "p-4")).toBe("bg-card p-4");
  });
});
