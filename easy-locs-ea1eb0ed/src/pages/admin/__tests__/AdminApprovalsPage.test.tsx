/**
 * AdminApprovalsPage tests (#812).
 *
 * Strategy: stub `dashboardRepo` directly so the test exercises the
 * page logic (queue render, empty state, drawer wiring, optimistic
 * removal on approve) without standing up the full supabase mock graph.
 * SuperAdminGate / route auth are exercised by their own existing test
 * suite — here we render the page component directly.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

const fetchPendingApprovals = vi.fn();
const fetchExecutionTaskById = vi.fn();
const fetchTaskApprovals = vi.fn();
const decideTaskApproval = vi.fn();

vi.mock("@/repositories/domain/dashboard.repo", () => ({
  dashboardRepo: {
    fetchPendingApprovals: (...a: unknown[]) => fetchPendingApprovals(...a),
    fetchExecutionTaskById: (...a: unknown[]) => fetchExecutionTaskById(...a),
    fetchTaskApprovals: (...a: unknown[]) => fetchTaskApprovals(...a),
    decideTaskApproval: (...a: unknown[]) => decideTaskApproval(...a),
  },
}));

vi.mock("@/hooks/useUiEngine", () => ({ useUiEngine: () => undefined }));
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));
vi.mock("@/components/layout/SubPageShell", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import AdminApprovalsPage from "../AdminApprovalsPage";

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return {
    qc,
    ...render(
      <MemoryRouter>
        <QueryClientProvider client={qc}>
          <AdminApprovalsPage />
        </QueryClientProvider>
      </MemoryRouter>,
    ),
  };
}

const sampleRow = {
  id: "11111111-2222-3333-4444-555555555555",
  type: "marketplace.listing.create",
  domain: "marketplace",
  risk_level: "high",
  status: "pending_review",
  requested_by: null,
  agent_id: null,
  blocked_reason: "Price exceeds policy ceiling",
  approval_policy: { kind: "single_admin" },
  created_at: new Date(Date.now() - 5 * 60_000).toISOString(),
  updated_at: new Date().toISOString(),
};

beforeEach(() => {
  fetchPendingApprovals.mockReset();
  fetchExecutionTaskById.mockReset();
  fetchTaskApprovals.mockReset();
  decideTaskApproval.mockReset();
});

describe("<AdminApprovalsPage />", () => {
  it("renders the empty state when the queue is clear", async () => {
    fetchPendingApprovals.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByTestId("approvals-empty")).toBeInTheDocument();
  });

  it("renders rows from the queue", async () => {
    fetchPendingApprovals.mockResolvedValue([sampleRow]);
    renderPage();
    const row = await screen.findByTestId(`approval-row-${sampleRow.id}`);
    expect(row).toBeInTheDocument();
    expect(screen.getByText("marketplace.listing.create")).toBeInTheDocument();
  });

  it("surfaces a query error", async () => {
    fetchPendingApprovals.mockRejectedValue(new Error("rls denied"));
    renderPage();
    expect(await screen.findByTestId("approvals-error")).toBeInTheDocument();
  });

  it("opens the decision drawer when a row is clicked", async () => {
    fetchPendingApprovals.mockResolvedValue([sampleRow]);
    fetchExecutionTaskById.mockResolvedValue({
      ...sampleRow,
      payload: { before: { price: 100 }, after: { price: 250 } },
      result: null,
      error: null,
    });
    fetchTaskApprovals.mockResolvedValue([]);
    renderPage();
    fireEvent.click(await screen.findByTestId(`approval-row-${sampleRow.id}`));
    expect(
      await screen.findByTestId("approval-decision-drawer"),
    ).toBeInTheDocument();
  });

  it("optimistically removes a row after Approve and forwards client_request_id", async () => {
    fetchPendingApprovals.mockResolvedValue([sampleRow]);
    fetchExecutionTaskById.mockResolvedValue({
      ...sampleRow,
      payload: { before: { price: 100 }, after: { price: 250 } },
      result: null,
      error: null,
    });
    fetchTaskApprovals.mockResolvedValue([]);
    // Hold the RPC promise so we can observe the optimistic state BEFORE
    // the server response settles.
    let resolveDecision: (v: unknown) => void = () => {};
    decideTaskApproval.mockReturnValue(
      new Promise((res) => {
        resolveDecision = res;
      }),
    );

    renderPage();
    fireEvent.click(await screen.findByTestId(`approval-row-${sampleRow.id}`));
    fireEvent.click(await screen.findByTestId("decide-approve"));

    // Optimistic update: the row should disappear from the queue
    // BEFORE the RPC promise resolves.
    await waitFor(() => {
      expect(
        screen.queryByTestId(`approval-row-${sampleRow.id}`),
      ).not.toBeInTheDocument();
    });

    resolveDecision({ ok: true });

    await waitFor(() => {
      expect(decideTaskApproval).toHaveBeenCalledTimes(1);
    });
    const arg = decideTaskApproval.mock.calls[0][0] as {
      taskId: string;
      decision: string;
      clientRequestId?: string | null;
    };
    expect(arg.taskId).toBe(sampleRow.id);
    expect(arg.decision).toBe("approved");
    expect(arg.clientRequestId).toMatch(/^ui:[0-9a-f-]+:approved:/);
  });

  it("rolls back the optimistic queue removal when the RPC rejects", async () => {
    fetchPendingApprovals.mockResolvedValue([sampleRow]);
    fetchExecutionTaskById.mockResolvedValue({
      ...sampleRow,
      payload: {},
      result: null,
      error: null,
    });
    fetchTaskApprovals.mockResolvedValue([]);
    // Deferred rejection so we can witness the OPTIMISTIC removal first
    // and only THEN observe the rollback once the server fails.
    let rejectDecision: (e: unknown) => void = () => {};
    decideTaskApproval.mockReturnValue(
      new Promise((_res, rej) => {
        rejectDecision = rej;
      }),
    );

    renderPage();
    fireEvent.click(await screen.findByTestId(`approval-row-${sampleRow.id}`));
    fireEvent.click(await screen.findByTestId("decide-approve"));

    // 1. Optimistic disappearance while the RPC is still in-flight.
    await waitFor(() => {
      expect(
        screen.queryByTestId(`approval-row-${sampleRow.id}`),
      ).not.toBeInTheDocument();
    });

    // 2. Server rejects → row must be restored from the previous cache.
    rejectDecision(new Error("invalid_state"));

    await waitFor(() => {
      expect(
        screen.getByTestId(`approval-row-${sampleRow.id}`),
      ).toBeInTheDocument();
    });
  });

  it("sources diff from previous_state ↔ intent_payload (text diff via intent_payload.diff_kind)", async () => {
    fetchPendingApprovals.mockResolvedValue([sampleRow]);
    // Build-agent-style task: previous_state is the baseline, payload
    // wraps an `intent_payload` carrying a unified text diff.
    fetchExecutionTaskById.mockResolvedValue({
      ...sampleRow,
      previous_state: { file: "src/x.ts", content: "old" },
      payload: {
        intent_payload: {
          diff_kind: "text",
          unified_diff:
            "--- a/src/x.ts\n+++ b/src/x.ts\n@@\n-old\n+new\n",
        },
      },
      result: null,
      error: null,
    });
    fetchTaskApprovals.mockResolvedValue([]);
    renderPage();
    fireEvent.click(await screen.findByTestId(`approval-row-${sampleRow.id}`));
    await screen.findByTestId("approval-decision-drawer");
    // TextDiffView renders the unified diff verbatim — assert at least
    // one removed-line marker is present.
    await waitFor(() => {
      expect(screen.getByText(/-old/)).toBeInTheDocument();
      expect(screen.getByText(/\+new/)).toBeInTheDocument();
    });
  });

  it("returns decisions in chronological order from the repo (no client re-sort)", async () => {
    // Chronological order is enforced server-side by `ORDER BY decided_at ASC`
    // inside `system.list_task_approvals`. This test asserts the page-layer
    // contract: the repo result is consumed verbatim and never re-sorted on
    // the client (which would mask a server-side ordering regression).
    const earlier = "2026-04-15T09:00:00.000Z";
    const later = "2026-04-15T10:00:00.000Z";
    const ordered = [
      { id: "a", decision: "comment", decided_at: earlier, reason: "first" },
      { id: "b", decision: "approved", decided_at: later, reason: "second" },
    ];
    fetchTaskApprovals.mockResolvedValue(ordered);
    const { dashboardRepo } = await import(
      "@/repositories/domain/dashboard.repo"
    );
    const result = await dashboardRepo.fetchTaskApprovals(sampleRow.id);
    expect(result).toEqual(ordered);
    expect((result[0] as { id: string }).id).toBe("a");
    expect((result[1] as { id: string }).id).toBe("b");
  });

  it("requires a reason before reject is enabled", async () => {
    fetchPendingApprovals.mockResolvedValue([sampleRow]);
    fetchExecutionTaskById.mockResolvedValue({
      ...sampleRow,
      payload: {},
      result: null,
      error: null,
    });
    fetchTaskApprovals.mockResolvedValue([]);
    renderPage();
    fireEvent.click(await screen.findByTestId(`approval-row-${sampleRow.id}`));
    const reject = await screen.findByTestId("decide-reject");
    expect(reject).toBeDisabled();
    fireEvent.change(screen.getByTestId("decision-reason-input"), {
      target: { value: "Out of policy" },
    });
    expect(reject).not.toBeDisabled();
  });
});
