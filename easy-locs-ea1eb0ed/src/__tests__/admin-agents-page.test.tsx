/**
 * L4 — /admin/agents cockpit (#813) · React Testing Library coverage.
 *
 * Renders AdminAgentsPage in isolation against a mocked agents-repo and
 * exercises the user-visible behaviour the cockpit promises:
 *   • empty-state renders when the registry is empty;
 *   • search and filter inputs narrow the visible row set;
 *   • the actions menu mounts per row (no hidden CTA).
 *
 * The repo module is mocked at the import boundary — no Supabase client
 * is constructed, so the test runs with no env or network.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import userEvent, { PointerEventsCheckLevel } from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/hooks/useUiEngine", () => ({ useUiEngine: () => undefined }));
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: () => undefined }),
}));

const sampleAgents = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    slug: "ai.router",
    display_name: "AI Router",
    agent_kind: "ai.router",
    owner_team: "platform",
    status: "active",
    canary_pct: null,
    sla_target_ms: null,
    quotas: null,
    metadata: null,
    last_health_status: "healthy",
    last_health_at: null,
    current_version: "1.2.0",
    current_version_released_at: null,
    policy_profile_slug: null,
    approval_required: false,
    risk_floor: null,
    max_runs_per_min: null,
    max_runs_per_day: null,
    capabilities: [{ domain: "support", task_type: "classify_intent" }],
    last_run_task_id: null,
    last_run_at: new Date(Date.now() - 60_000).toISOString(),
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    health: {
      agent_id: "00000000-0000-0000-0000-000000000001",
      agent_slug: "ai.router",
      display_name: "AI Router",
      agent_kind: "ai.router",
      lifecycle_status: "active",
      health_status: "healthy",
      health_reason: null,
      last_seen_at: new Date().toISOString(),
      lag_ms: 200,
      in_flight: 0,
      queue_depth: 0,
      worker_count: 1,
    },
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    slug: "marketplace.onboarder",
    display_name: "Marketplace Onboarder",
    agent_kind: "business.adapter",
    owner_team: "growth",
    status: "disabled",
    canary_pct: null,
    sla_target_ms: null,
    quotas: null,
    metadata: null,
    last_health_status: null,
    last_health_at: null,
    current_version: "0.5.0",
    current_version_released_at: null,
    policy_profile_slug: null,
    approval_required: true,
    risk_floor: null,
    max_runs_per_min: null,
    max_runs_per_day: null,
    capabilities: null,
    last_run_task_id: null,
    last_run_at: null,
    created_at: "2026-01-02T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
    health: null,
  },
];

const listAgentsMock = vi.fn();
const setAgentStatusMock = vi.fn();

vi.mock("@/lib/admin/agents-repo", () => ({
  agentsRepo: {
    listAgents: (...args: unknown[]) => listAgentsMock(...args),
    listAgentRuns: vi.fn(async () => []),
    listAgentEvents: vi.fn(async () => []),
    setAgentStatus: (...args: unknown[]) => setAgentStatusMock(...args),
    getAgent: vi.fn(async () => null),
  },
}));

import AdminAgentsPage from "../pages/admin/AdminAgentsPage";

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AdminAgentsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  listAgentsMock.mockReset();
  setAgentStatusMock.mockReset();
  setAgentStatusMock.mockResolvedValue({ ok: true });
});

describe("AdminAgentsPage", () => {
  it("renders the empty state when no agents are registered", async () => {
    listAgentsMock.mockResolvedValue([]);
    renderPage();
    expect(
      await screen.findByText(/no agents registered yet/i),
    ).toBeInTheDocument();
  });

  it("renders one row per registered agent and an actions menu per row", async () => {
    listAgentsMock.mockResolvedValue(sampleAgents);
    renderPage();
    expect(
      await screen.findByTestId("agent-row-ai.router"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("agent-row-marketplace.onboarder"),
    ).toBeInTheDocument();
    // Actions menu mounts per row.
    expect(
      screen.getByTestId(`agent-actions-${sampleAgents[0].id}`),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`agent-actions-${sampleAgents[1].id}`),
    ).toBeInTheDocument();
  });

  it("filters by status — choosing 'disabled' hides active agents", async () => {
    listAgentsMock.mockResolvedValue(sampleAgents);
    renderPage();
    await screen.findByTestId("agent-row-ai.router");
    fireEvent.change(screen.getByTestId("agents-filter-status"), {
      target: { value: "disabled" },
    });
    await waitFor(() => {
      expect(screen.queryByTestId("agent-row-ai.router")).not.toBeInTheDocument();
    });
    expect(
      screen.getByTestId("agent-row-marketplace.onboarder"),
    ).toBeInTheDocument();
  });

  it("filters by health — 'down' with no matching agent shows the empty filter message", async () => {
    listAgentsMock.mockResolvedValue(sampleAgents);
    renderPage();
    await screen.findByTestId("agent-row-ai.router");
    fireEvent.change(screen.getByTestId("agents-filter-health"), {
      target: { value: "down" },
    });
    expect(
      await screen.findByText(/no agents match the current filters/i),
    ).toBeInTheDocument();
  });

  it("renders the new owner and in-flight columns per row", async () => {
    listAgentsMock.mockResolvedValue(sampleAgents);
    renderPage();
    await screen.findByTestId("agent-row-ai.router");
    expect(
      within(screen.getByTestId("agent-row-ai.router-owner")).getByText(
        "platform",
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId("agent-row-ai.router-inflight")).getByText("0"),
    ).toBeInTheDocument();
    // Marketplace Onboarder has no health row, so in-flight falls back to 0.
    expect(
      within(
        screen.getByTestId("agent-row-marketplace.onboarder-inflight"),
      ).getByText("0"),
    ).toBeInTheDocument();
  });

  it("destructive lifecycle actions require explicit confirmation before the RPC fires", async () => {
    // Radix dropdown applies `pointer-events: none` to backgrounded
    // siblings while the menu is open; that legitimately defends against
    // misclicks in production but trips userEvent's default safety check.
    const user = userEvent.setup({
      pointerEventsCheck: PointerEventsCheckLevel.Never,
    });
    listAgentsMock.mockResolvedValue(sampleAgents);
    renderPage();
    await screen.findByTestId("agent-row-ai.router");

    // Open the actions menu for the active AI Router agent.
    await user.click(
      screen.getByTestId(`agent-actions-${sampleAgents[0].id}`),
    );
    await user.click(await screen.findByTestId("agent-action-disable"));

    // Confirmation dialog must mount with the consequence sentence,
    // and the RPC must NOT have fired yet.
    const dialog = await screen.findByTestId("agent-action-confirm");
    expect(
      within(dialog).getByText(/disable agent/i),
    ).toBeInTheDocument();
    expect(setAgentStatusMock).not.toHaveBeenCalled();

    // Cancelling closes the dialog and still does not fire the RPC.
    await user.click(screen.getByTestId("agent-action-confirm-cancel"));
    await waitFor(() =>
      expect(
        screen.queryByTestId("agent-action-confirm"),
      ).not.toBeInTheDocument(),
    );
    expect(setAgentStatusMock).not.toHaveBeenCalled();

    // Re-open and confirm — now the RPC should fire with disabled.
    await user.click(
      screen.getByTestId(`agent-actions-${sampleAgents[0].id}`),
    );
    await user.click(await screen.findByTestId("agent-action-disable"));
    await user.click(await screen.findByTestId("agent-action-confirm-ok"));

    await waitFor(() => expect(setAgentStatusMock).toHaveBeenCalledTimes(1));
    expect(setAgentStatusMock).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "ai.router", status: "disabled" }),
    );
  });

  it("free-text search narrows by display name", async () => {
    listAgentsMock.mockResolvedValue(sampleAgents);
    renderPage();
    await screen.findByTestId("agent-row-ai.router");
    fireEvent.change(screen.getByTestId("agents-search"), {
      target: { value: "marketplace" },
    });
    await waitFor(() => {
      expect(screen.queryByTestId("agent-row-ai.router")).not.toBeInTheDocument();
    });
    expect(
      screen.getByTestId("agent-row-marketplace.onboarder"),
    ).toBeInTheDocument();
  });
});
