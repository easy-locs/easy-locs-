/**
 * LB1 Track 3 (#843) — hardened catch-site coverage.
 *
 * Two production hot paths used to swallow errors with a `console.warn`:
 *
 *   1. `_shared/execution/ai-dispatch.ts` — poll-loop read against
 *      `system.execution_tasks`. Schema/permission errors silently spun
 *      until the caller's timeout.
 *   2. `_shared/ai-router.ts` — provider-throw fallback path. The chain
 *      moved on to the next provider but no structured signal was emitted.
 *
 * These tests pin the new contract:
 *   - Poll-read errors are CLASSIFIED into `fatal | transient`. Fatal
 *     codes (RLS denial, missing relation/column/function, JWT invalid /
 *     expired) re-throw; everything else continues polling.
 *   - Provider fallbacks emit a single structured JSON line at error
 *     level with the canonical `event: "ai_router.provider_fallback"`
 *     stable name plus the call context (provider, model, attempt,
 *     chain_size, is_last, latency_ms).
 */

import { describe, expect, it } from "vitest";

import { classifyPollReadError } from "../../supabase/functions/_shared/execution/poll-read-classifier.ts";
import { buildProviderFallbackLog } from "../../supabase/functions/_shared/ai-router.ts";
import {
  type ExecutionTaskRow,
  projectTask,
  uiStatus,
} from "../pages/DashboardCommandCenter";

function makeRow(over: Partial<ExecutionTaskRow> = {}): ExecutionTaskRow {
  return {
    id: "task_1",
    type: "GITHUB.SMOKE_NOOP",
    status: "queued",
    payload: null,
    execution_result: null,
    result: null,
    external_run_url: null,
    blocked_reason: null,
    error_code: null,
    error: null,
    requested_by: "user_1",
    created_at: "2026-04-17T00:00:00.000Z",
    updated_at: "2026-04-17T00:00:00.000Z",
    ...over,
  };
}

describe("Track 3 (#843) — ai-dispatch.classifyPollReadError", () => {
  it("treats Postgres / PostgREST schema + auth codes as FATAL", () => {
    expect(classifyPollReadError("42501")).toBe("fatal");   // RLS denial
    expect(classifyPollReadError("42P01")).toBe("fatal");   // undefined_table
    expect(classifyPollReadError("42703")).toBe("fatal");   // undefined_column
    expect(classifyPollReadError("42883")).toBe("fatal");   // undefined_function
    expect(classifyPollReadError("PGRST301")).toBe("fatal"); // jwt_invalid
    expect(classifyPollReadError("PGRST302")).toBe("fatal"); // jwt_expired
  });

  it("treats unknown / null / transient codes as TRANSIENT", () => {
    expect(classifyPollReadError(null)).toBe("transient");
    expect(classifyPollReadError(undefined)).toBe("transient");
    expect(classifyPollReadError("")).toBe("transient");
    // PostgREST 5xx-ish + retryable errors stay transient
    expect(classifyPollReadError("PGRST116")).toBe("transient");
    expect(classifyPollReadError("ECONNRESET")).toBe("transient");
    expect(classifyPollReadError("57P03")).toBe("transient"); // cannot_connect_now
  });

  it("does not throw for any input shape", () => {
    expect(() => classifyPollReadError("anything")).not.toThrow();
    expect(() => classifyPollReadError(null)).not.toThrow();
  });
});

describe("Track 3 (#843) — ai-router.buildProviderFallbackLog", () => {
  it("emits the canonical event name + structured envelope on provider throw", () => {
    const log = buildProviderFallbackLog({
      feature: "support_chat",
      provider: "openai",
      model: "gpt-4o-mini",
      keyEnv: "OPENAI_API_KEY",
      attempt: 0,
      chainSize: 2,
      outcome: "threw",
      message: "ECONNRESET",
      latencyMs: 1234,
    });

    expect(log.event).toBe("ai_router.provider_fallback");
    expect(log.level).toBe("error");
    expect(log.feature).toBe("support_chat");
    expect(log.provider).toBe("openai");
    expect(log.model).toBe("gpt-4o-mini");
    expect(log.key_env).toBe("OPENAI_API_KEY");
    expect(log.attempt).toBe(0);
    expect(log.chain_size).toBe(2);
    expect(log.is_last).toBe(false);
    expect(log.outcome).toBe("threw");
    expect(log.status).toBeNull();
    expect(log.message).toBe("ECONNRESET");
    expect(log.latency_ms).toBe(1234);
  });

  it("flags the LAST entry in the chain so the audit timeline can show terminal failures", () => {
    const log = buildProviderFallbackLog({
      feature: "translate",
      provider: "anthropic",
      model: "claude-3-5-sonnet-20240620",
      keyEnv: "ANTHROPIC_API_KEY",
      attempt: 1,
      chainSize: 2,
      outcome: "http_error",
      status: 503,
      latencyMs: 500,
    });

    expect(log.is_last).toBe(true);
    expect(log.outcome).toBe("http_error");
    expect(log.status).toBe(503);
    expect(log.message).toBeNull();
  });

});

describe("Track 3 (#843) — Command Center projection (system.execution_tasks → UI)", () => {
  it("uiStatus collapses orchestrator statuses into the 4-zone palette", () => {
    expect(uiStatus("queued")).toBe("queued");
    expect(uiStatus("draft")).toBe("queued");
    expect(uiStatus("approved")).toBe("queued");
    expect(uiStatus("running")).toBe("running");
    expect(uiStatus("pending_review")).toBe("running");
    expect(uiStatus("rolling_back")).toBe("running");
    expect(uiStatus("succeeded")).toBe("success");
    expect(uiStatus("rolled_back")).toBe("success");
    expect(uiStatus("failed")).toBe("error");
    expect(uiStatus("blocked")).toBe("error");
    expect(uiStatus("rejected")).toBe("error");
    expect(uiStatus("cancelled")).toBe("error");
  });

  it("projects a GitHub-runner-callback row (legacy `result` + `error` columns)", () => {
    // Mirrors what `supabase/functions/execution-runner-callback` writes
    // for a SUCCESS callback.
    const row = makeRow({
      status: "succeeded",
      payload: { prompt: "fix login bug", label: "fix login bug", triggered_by: "command-center" },
      external_run_url: "https://github.com/owner/repo/actions/runs/1234567",
      result: {
        github_status: "SUCCESS",
        pr_url: "https://github.com/owner/repo/pull/42",
        logs: ["step 1: ok", "step 2: ok"],
      },
    });

    const view = projectTask(row);

    expect(view.prompt).toBe("fix login bug");
    expect(view.github_run_id).toBe("1234567");
    expect(view.github_run_url).toBe("https://github.com/owner/repo/actions/runs/1234567");
    expect(view.github_conclusion).toBe("SUCCESS");
    expect(view.logs).toBe("step 1: ok\nstep 2: ok");
  });

  it("projects an orchestrator-V2 row (`execution_result.output.*` shape)", () => {
    const row = makeRow({
      status: "succeeded",
      payload: { prompt: "summarise PR" },
      execution_result: {
        output: {
          github_status: "SUCCESS",
          workflow_file: "execution-runner.yml",
          ref: "feature/agent",
          output_text: "PR summary text",
        },
      },
    });

    const view = projectTask(row);

    expect(view.github_workflow_name).toBe("execution-runner.yml");
    expect(view.github_branch).toBe("feature/agent");
    expect(view.github_conclusion).toBe("SUCCESS");
    expect(view.result).toBe("PR summary text");
  });

  it("FAILED runner callback surfaces error message + conclusion in the UI", () => {
    const row = makeRow({
      status: "failed",
      payload: { prompt: "p" },
      error: "GitHub Actions runner reported failure",
      result: {
        github_status: "FAILED",
        error: "step 3 failed",
        logs: ["bootstrap ok", "build ok", "test FAILED"],
      },
    });

    const view = projectTask(row);

    expect(uiStatus(view.status)).toBe("error");
    expect(view.github_conclusion).toBe("FAILED");
    expect(view.logs).toBe("bootstrap ok\nbuild ok\ntest FAILED");
  });

  it("queued (just-dispatched) row leaves run details empty without crashing", () => {
    const row = makeRow({ status: "queued", payload: { prompt: "hi" } });
    const view = projectTask(row);
    expect(view.github_run_id).toBeNull();
    expect(view.github_conclusion).toBeNull();
    expect(view.logs).toBeNull();
    expect(view.result).toBeNull();
  });

});

describe("Track 3 (#843) — ai-router.buildProviderFallbackLog (serialisation)", () => {
  it("serialises as a single JSON line so the platform log scraper can index it", () => {
    const log = buildProviderFallbackLog({
      feature: "rag",
      provider: "openai",
      model: "gpt-4o",
      keyEnv: "OPENAI_API_KEY",
      attempt: 0,
      chainSize: 1,
      outcome: "threw",
      message: "boom",
      latencyMs: 10,
    });
    const serialised = JSON.stringify(log);
    expect(serialised).not.toContain("\n");
    const round = JSON.parse(serialised);
    expect(round.event).toBe("ai_router.provider_fallback");
    expect(round.is_last).toBe(true);
  });
});
