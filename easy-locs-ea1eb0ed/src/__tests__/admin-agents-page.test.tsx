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
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
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

vi.mock("@/lib/admin/agents-repo", () => ({
  agentsRepo: {
    listAgents: (...args: unknown[]) => listAgentsMock(...args),
    listAgentRuns: vi.fn(async () => []),
    listAgentEvents: vi.fn(async () => []),
    setAgentStatus: vi.fn(async () => ({ ok: true })),
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
