/**
 * E2E-style integration tests
 * Tests critical user flows at the component/module integration level.
 * These simulate real user paths without a browser.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Auth Flow Integration ────────────────────────────────────────────

describe("E2E: Authentication Flow", () => {
  it("login page component renders without crash", async () => {
    const { render, screen } = await import("@testing-library/react");
    const { BrowserRouter } = await import("react-router-dom");
    const { I18nProvider } = await import("@/lib/i18n");
    const React = await import("react");

    // Login page should render in isolation
    const LoginModule = await import("@/pages/Login");
    const Login = LoginModule.default;

    const { container } = render(
      React.createElement(BrowserRouter, null,
        React.createElement(I18nProvider, null,
          React.createElement(Login)
        )
      )
    );
    expect(container.innerHTML.length).toBeGreaterThan(0);
  });

  it("register page component renders without crash", async () => {
    const { render } = await import("@testing-library/react");
    const { BrowserRouter } = await import("react-router-dom");
    const { I18nProvider } = await import("@/lib/i18n");
    const React = await import("react");

    const RegisterModule = await import("@/pages/Register");
    const Register = RegisterModule.default;

    const { container } = render(
      React.createElement(BrowserRouter, null,
        React.createElement(I18nProvider, null,
          React.createElement(Register)
        )
      )
    );
    expect(container.innerHTML.length).toBeGreaterThan(0);
  });
});

// ── i18n Flow Integration ────────────────────────────────────────────

describe("E2E: i18n Locale Switching", () => {
  it("formatters adapt to locale changes", async () => {
    const { formatCurrency, formatNumber } = await import("@/lib/i18n-utils");

    // French formatting
    const frPrice = formatCurrency(1234.5, "fr-FR", "EUR");
    expect(frPrice).toContain("234");

    // US formatting
    const usPrice = formatCurrency(1234.5, "en-US", "USD");
    expect(usPrice).toContain("$");
    expect(usPrice).toContain("234");
  });

  it("pluralization works across different counts", async () => {
    const { resolvePlural, interpolate } = await import("@/lib/i18n-utils");

    const dict: Record<string, string> = {
      "properties_zero": "Aucun bien",
      "properties_one": "{{count}} bien",
      "properties_other": "{{count}} biens",
    };

    const lookup = (k: string) => dict[k];

    expect(interpolate(resolvePlural("properties", 0, lookup)!, { count: 0 })).toBe("Aucun bien");
    expect(interpolate(resolvePlural("properties", 1, lookup)!, { count: 1 })).toBe("1 bien");
    expect(interpolate(resolvePlural("properties", 5, lookup)!, { count: 5 })).toBe("5 biens");
  });
});

// ── Monitoring Integration ───────────────────────────────────────────

describe("E2E: Monitoring Pipeline", () => {
  beforeEach(async () => {
    const { clearEvents } = await import("@/lib/monitoring");
    clearEvents();
  });

  it("error → event store → summary pipeline", async () => {
    const { pushEvent, getEventSummary, getMonitoringEvents } = await import("@/lib/monitoring");

    pushEvent({ type: "error", source: "e2e-test", message: "Test error" });
    pushEvent({ type: "warning", source: "e2e-test", message: "Test warning" });
    pushEvent({ type: "performance", source: "e2e-test", message: "Slow query" });

    const events = getMonitoringEvents();
    expect(events.length).toBe(3);

    const summary = getEventSummary();
    expect(summary.errors).toBe(1);
    expect(summary.warnings).toBe(1);
    expect(summary.performance).toBe(1);
    expect(summary.unresolved).toBe(3);
  });

  it("event resolution flow", async () => {
    const { pushEvent, resolveEvent, getEventSummary } = await import("@/lib/monitoring");

    const evt = pushEvent({ type: "error", source: "e2e-test", message: "Resolvable error" });
    expect(getEventSummary().unresolved).toBe(1);

    resolveEvent(evt.id);
    expect(getEventSummary().unresolved).toBe(0);
  });
});

// ── Data Layer Integration ───────────────────────────────────────────

describe("E2E: Data Layer", () => {
  it("supabase client can construct queries", async () => {
    const { supabase } = await import("@/integrations/supabase/client");

    // Verify query builder works (doesn't actually execute)
    const query = supabase.from("properties").select("id, title").limit(1);
    expect(query).toBeDefined();
    expect(typeof query.then).toBe("function"); // It's a thenable
  });
});

// ── Store Integration ────────────────────────────────────────────────

describe("E2E: Store State Management", () => {
  it("store module is importable and functional", async () => {
    const store = await import("@/lib/store");
    expect(store).toBeDefined();
  });
});
