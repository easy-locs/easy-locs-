/**
 * DevRunDetail unit tests — LC8 (#875).
 *
 * Verifies the dev-run renderer surfaces diff / build log / test
 * output / drift report / PR status / Actions URL, and wires the
 * Replay + View PR controls.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DevRunDetail from "../DevRunDetail";
import type { AgentRunRichRow } from "@/lib/admin/agents-repo";

function makeDevRun(overrides: Partial<AgentRunRichRow> = {}): AgentRunRichRow {
  return {
    task_id: "11111111-2222-3333-4444-555555555555",
    type: "DEV.BUILDER.APPLY",
    status: "succeeded",
    risk_level: "medium",
    cost_usd: 0.0023,
    latency_ms: 4200,
    held_for_review: false,
    held_reason: null,
    released_at: null,
    created_at: new Date("2026-04-17T12:00:00Z").toISOString(),
    prompt: null,
    response: null,
    model: null,
    provider: null,
    error: null,
    verification: null,
    tools_used: null,
    purpose: "add map error retry backoff",
    dev_diff:
      "--- a/foo.ts\n+++ b/foo.ts\n@@ -1,2 +1,2 @@\n-const x = 1\n+const x = 2\n",
    dev_build_log: "▶ tsc --noEmit\nDone in 3.1s.",
    dev_test_output: "PASS src/foo.test.ts\n  ✓ works (5ms)",
    dev_drift: { added_files: ["foo.ts"], removed_files: [] },
    dev_logs: null,
    pr_url: "https://github.com/owner/repo/pull/42",
    external_run_url: "https://github.com/owner/repo/actions/runs/999",
    pr_status: "open",
    payload: { purpose: "add map error retry backoff" },
    ...overrides,
  };
}

describe("<DevRunDetail />", () => {
  it("renders core dev-run sections from a mock row", () => {
    render(
      <MemoryRouter>
        <DevRunDetail run={makeDevRun()} />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("dev-run-detail")).toBeInTheDocument();
    expect(screen.getByTestId("dev-run-diff")).toBeInTheDocument();
    expect(screen.getByTestId("text-diff-view")).toBeInTheDocument();
    expect(screen.getByTestId("dev-run-build-log")).toBeInTheDocument();
    expect(screen.getByTestId("dev-run-test-output")).toBeInTheDocument();
    expect(screen.getByTestId("dev-run-drift")).toBeInTheDocument();
    const pr = screen.getByTestId("dev-run-pr-status");
    expect(within(pr).getByText("open")).toBeInTheDocument();
    expect(screen.getByText(/add map error retry backoff/)).toBeInTheDocument();
  });

  it("links View PR to the GitHub PR url and opens externally", () => {
    render(
      <MemoryRouter>
        <DevRunDetail run={makeDevRun()} />
      </MemoryRouter>,
    );
    const node = screen.getByTestId("dev-run-view-pr");
    const link = node.tagName === "A" ? node : node.querySelector("a");
    expect(link).toHaveAttribute(
      "href",
      "https://github.com/owner/repo/pull/42",
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("hides View PR when no pr_url is present", () => {
    render(
      <MemoryRouter>
        <DevRunDetail run={makeDevRun({ pr_url: null })} />
      </MemoryRouter>,
    );
    expect(screen.queryByTestId("dev-run-view-pr")).toBeNull();
  });

  it("invokes onReplay when Replay is clicked", () => {
    const onReplay = vi.fn();
    render(
      <MemoryRouter>
        <DevRunDetail run={makeDevRun()} onReplay={onReplay} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByTestId("dev-run-replay"));
    expect(onReplay).toHaveBeenCalledTimes(1);
  });

  it("hides Replay when no handler is provided", () => {
    render(
      <MemoryRouter>
        <DevRunDetail run={makeDevRun()} />
      </MemoryRouter>,
    );
    expect(screen.queryByTestId("dev-run-replay")).toBeNull();
  });

  it("falls back to logs[] when build_log is empty", () => {
    render(
      <MemoryRouter>
        <DevRunDetail
          run={makeDevRun({
            dev_build_log: null,
            dev_logs: ["step 1", "step 2"],
          })}
        />
      </MemoryRouter>,
    );
    const build = screen.getByTestId("dev-run-build-log");
    expect(within(build).getByText(/step 1/)).toBeInTheDocument();
    expect(within(build).getByText(/step 2/)).toBeInTheDocument();
  });

  it("omits the drift section when no drift report is present", () => {
    render(
      <MemoryRouter>
        <DevRunDetail run={makeDevRun({ dev_drift: null })} />
      </MemoryRouter>,
    );
    expect(screen.queryByTestId("dev-run-drift")).toBeNull();
  });

  it("renders held-for-review banner with deep link to approvals", () => {
    render(
      <MemoryRouter>
        <DevRunDetail
          run={makeDevRun({
            status: "pending_review",
            held_for_review: true,
            held_reason: "diff touches RLS policy",
          })}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Held for review/)).toBeInTheDocument();
    const link = screen.getByText(/Review in approvals inbox/).closest("a");
    expect(link).toHaveAttribute(
      "href",
      "/admin/approvals?taskId=11111111-2222-3333-4444-555555555555",
    );
  });
});
