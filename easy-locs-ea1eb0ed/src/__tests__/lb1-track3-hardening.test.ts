/**
 * LB1 Track 3 (#843) — hardened catch-site + Command Center coverage.
 *
 * Two production hot paths used to swallow errors with a `console.warn`:
 *
 *   1. `_shared/execution/ai-dispatch.ts` — poll-loop read against
 *      `system.execution_tasks`. Schema/permission errors silently spun
 *      until the caller's timeout.
 *   2. `_shared/ai-router.ts` — provider-throw fallback path. The chain
 *      moved on to the next provider but no structured signal was emitted.
 *
 * Plus the Command Center page used to write `agent_tasks` directly,
 * bypassing `system.dispatch_execution_task`.
 *
 * These tests pin the new contract end-to-end:
 *
 *   - **Helpers** (pure): classifier severity table, structured-log
 *     envelopes (with `task_id` and `agent_slug` correlation fields).
 *   - **Catch sites** (behavioural): exercise the actual catch branch,
 *     assert the canonical event is emitted via `console.error` and that
 *     fatal codes re-throw / last-entry re-throws.
 *   - **UI projection** (pure): both writer-path shapes
 *     (orchestrator-V2 `execution_result` and legacy `result`/`error`
 *     written by `execution-runner-callback`) flow correctly into the
 *     4-zone UI.
 *   - **Command Center dispatch** (integration): submit lands a row in
 *     `system.execution_tasks` via the canonical edge function, and NO
 *     `agent_tasks` write is performed.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildPollReadErrorRecord,
  classifyPollReadError,
  handlePollReadError,
} from "../../supabase/functions/_shared/execution/poll-read-classifier.ts";
import {
  type AiRouteForAgentInput,
  aiRouteForAgent,
  buildProviderFallbackLog,
} from "../../supabase/functions/_shared/ai-router.ts";
import {
  type ExecutionTaskRow,
  projectTask,
  uiStatus,
} from "../pages/DashboardCommandCenter";
import {
  COMMAND_CENTER_TASK_COLUMNS,
  dispatchCommandCenterPrompt,
} from "../lib/execution/dispatchCommandCenter";

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

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

/** Capture every JSON line console.error received during the test. */
function captureStructuredErrors() {
  const calls: Record<string, unknown>[] = [];
  const spy = vi.spyOn(console, "error").mockImplementation((arg: unknown) => {
    if (typeof arg === "string") {
      try { calls.push(JSON.parse(arg)); }
      catch { /* not a JSON line — ignore */ }
    }
  });
  return { calls, spy };
}

// ─────────────────────────────────────────────────────────────────────
// Pure classifier
// ─────────────────────────────────────────────────────────────────────

describe("Track 3 (#843) — ai-dispatch.classifyPollReadError", () => {
  it("treats Postgres / PostgREST schema + auth codes as FATAL", () => {
    expect(classifyPollReadError("42501")).toBe("fatal");
    expect(classifyPollReadError("42P01")).toBe("fatal");
    expect(classifyPollReadError("42703")).toBe("fatal");
    expect(classifyPollReadError("42883")).toBe("fatal");
    expect(classifyPollReadError("PGRST301")).toBe("fatal");
    expect(classifyPollReadError("PGRST302")).toBe("fatal");
  });

  it("treats unknown / null / transient codes as TRANSIENT", () => {
    expect(classifyPollReadError(null)).toBe("transient");
    expect(classifyPollReadError(undefined)).toBe("transient");
    expect(classifyPollReadError("")).toBe("transient");
    expect(classifyPollReadError("PGRST116")).toBe("transient");
    expect(classifyPollReadError("ECONNRESET")).toBe("transient");
    expect(classifyPollReadError("57P03")).toBe("transient");
  });

  it("buildPollReadErrorRecord includes task_id + agent_slug correlation", () => {
    const r = buildPollReadErrorRecord({
      taskId: "task_42",
      agentSlug: "support-triage",
      code: "ECONNRESET",
      message: "connection lost",
    });
    expect(r.event).toBe("ai_dispatch.poll_read_error");
    expect(r.level).toBe("error");
    expect(r.task_id).toBe("task_42");
    expect(r.agent_slug).toBe("support-triage");
    expect(r.code).toBe("ECONNRESET");
    expect(r.severity).toBe("transient");
  });

  it("buildPollReadErrorRecord defaults agent_slug to null when missing", () => {
    const r = buildPollReadErrorRecord({
      taskId: "task_42",
      code: null,
      message: "boom",
    });
    expect(r.agent_slug).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────
// Catch-path behaviour: handlePollReadError actually emits + throws
// ─────────────────────────────────────────────────────────────────────

describe("Track 3 (#843) — handlePollReadError catch behaviour", () => {
  let captured: ReturnType<typeof captureStructuredErrors>;

  beforeEach(() => { captured = captureStructuredErrors(); });
  afterEach(() => { captured.spy.mockRestore(); });

  it("transient code → emits structured log AND does NOT throw", () => {
    const result = handlePollReadError({
      taskId: "task_t1",
      agentSlug: "github-runner",
      code: "PGRST116",
      message: "no rows",
    });
    expect(result.severity).toBe("transient");
    expect(captured.calls).toHaveLength(1);
    expect(captured.calls[0]).toMatchObject({
      event: "ai_dispatch.poll_read_error",
      level: "error",
      task_id: "task_t1",
      agent_slug: "github-runner",
      code: "PGRST116",
      severity: "transient",
    });
  });

  it("fatal code (RLS denial 42501) → emits structured log AND throws", () => {
    expect(() => handlePollReadError({
      taskId: "task_f1",
      agentSlug: "ai-completion",
      code: "42501",
      message: "row-level security denied",
    })).toThrow(/fatal poll read error.*42501.*task_f1/);
    expect(captured.calls).toHaveLength(1);
    expect(captured.calls[0]).toMatchObject({
      event: "ai_dispatch.poll_read_error",
      task_id: "task_f1",
      agent_slug: "ai-completion",
      severity: "fatal",
    });
  });

  it("fatal code (undefined_table 42P01) → throws + logs", () => {
    expect(() => handlePollReadError({
      taskId: "task_f2",
      code: "42P01",
      message: "relation system.execution_tasks does not exist",
    })).toThrow();
    expect(captured.calls[0]?.severity).toBe("fatal");
    expect(captured.calls[0]?.agent_slug).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────
// ai-router fallback log envelope (pure) + actual catch-path execution
// ─────────────────────────────────────────────────────────────────────

describe("Track 3 (#843) — ai-router.buildProviderFallbackLog", () => {
  it("emits the canonical event name + structured envelope (with correlation IDs)", () => {
    const log = buildProviderFallbackLog({
      feature: "support_chat",
      agentSlug: "support-triage",
      taskId: "task_99",
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
    expect(log.agent_slug).toBe("support-triage");
    expect(log.task_id).toBe("task_99");
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

  it("agent_slug + task_id default to null when caller omits them", () => {
    const log = buildProviderFallbackLog({
      feature: "rag",
      provider: "openai",
      model: "gpt-4o",
      keyEnv: "OPENAI_API_KEY",
      attempt: 0,
      chainSize: 1,
      outcome: "http_error",
      status: 503,
      latencyMs: 12,
    });
    expect(log.agent_slug).toBeNull();
    expect(log.task_id).toBeNull();
    expect(log.is_last).toBe(true);
  });

  it("serialises as a single JSON line", () => {
    const serialised = JSON.stringify(buildProviderFallbackLog({
      feature: "rag",
      provider: "openai",
      model: "gpt-4o",
      keyEnv: "OPENAI_API_KEY",
      attempt: 0,
      chainSize: 1,
      outcome: "threw",
      message: "boom",
      latencyMs: 10,
    }));
    expect(serialised).not.toContain("\n");
    expect(JSON.parse(serialised).event).toBe("ai_router.provider_fallback");
  });
});

describe("Track 3 (#843) — aiRouteForAgent fallback catch path", () => {
  let captured: ReturnType<typeof captureStructuredErrors>;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    captured = captureStructuredErrors();
    originalFetch = globalThis.fetch;
    process.env.OPENAI_API_KEY = "sk-test-openai";
    process.env.ANTHROPIC_API_KEY = "sk-test-anthropic";
  });

  afterEach(() => {
    captured.spy.mockRestore();
    globalThis.fetch = originalFetch;
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
  });

  function makeInput(): AiRouteForAgentInput {
    return {
      feature: "test_chat",
      agentSlug: "registry-agent-x",
      taskId: "task_router_1",
      config: {
        kind: "chat",
        primary: { provider: "openai", model: "gpt-4o-mini", keyEnv: "OPENAI_API_KEY" },
        fallbacks: [{ provider: "anthropic", model: "claude-3-5-haiku-20241022", keyEnv: "ANTHROPIC_API_KEY" }],
        costPer1k: { "gpt-4o-mini": { prompt: 0, completion: 0 }, "claude-3-5-haiku-20241022": { prompt: 0, completion: 0 } },
        source: "registry",
      },
      options: { messages: [{ role: "user", content: "hi" }] },
    };
  }

  it("primary throws → emits structured log with agent_slug + task_id and falls through to a successful fallback", async () => {
    let calls = 0;
    globalThis.fetch = vi.fn(async (_url: RequestInfo | URL) => {
      calls++;
      if (calls === 1) throw new Error("ECONNRESET");
      return new Response(JSON.stringify({ choices: [], usage: {} }), { status: 200 });
    }) as typeof globalThis.fetch;

    const out = await aiRouteForAgent(makeInput());
    expect(out.provider).toBe("anthropic");

    const fb = captured.calls.filter((c) => c.event === "ai_router.provider_fallback");
    expect(fb).toHaveLength(1);
    expect(fb[0]).toMatchObject({
      event: "ai_router.provider_fallback",
      level: "error",
      feature: "test_chat",
      agent_slug: "registry-agent-x",
      task_id: "task_router_1",
      provider: "openai",
      outcome: "threw",
      message: "ECONNRESET",
      is_last: false,
    });
  });

  it("primary 503 + fallback throws on LAST entry → re-throws AND emits a structured log per failure", async () => {
    let calls = 0;
    globalThis.fetch = vi.fn(async () => {
      calls++;
      if (calls === 1) return new Response("upstream", { status: 503 });
      throw new Error("ANTHROPIC_DOWN");
    }) as typeof globalThis.fetch;

    await expect(aiRouteForAgent(makeInput())).rejects.toThrow(/ANTHROPIC_DOWN/);

    const fb = captured.calls.filter((c) => c.event === "ai_router.provider_fallback");
    expect(fb).toHaveLength(2);
    expect(fb[0]).toMatchObject({
      provider: "openai",
      outcome: "http_error",
      status: 503,
      is_last: false,
      agent_slug: "registry-agent-x",
      task_id: "task_router_1",
    });
    expect(fb[1]).toMatchObject({
      provider: "anthropic",
      outcome: "threw",
      message: "ANTHROPIC_DOWN",
      is_last: true,
    });
  });
});

// ─────────────────────────────────────────────────────────────────────
// Command Center projection (UI shape)
// ─────────────────────────────────────────────────────────────────────

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
    const row = makeRow({
      status: "succeeded",
      payload: { prompt: "fix login bug", label: "fix login bug" },
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

  it("FAILED runner callback surfaces error + conclusion in the UI", () => {
    const row = makeRow({
      status: "failed",
      payload: { prompt: "p" },
      error: "GitHub Actions runner reported failure",
      result: { github_status: "FAILED", error: "step 3 failed", logs: ["build ok", "test FAILED"] },
    });
    const view = projectTask(row);
    expect(uiStatus(view.status)).toBe("error");
    expect(view.github_conclusion).toBe("FAILED");
    expect(view.logs).toBe("build ok\ntest FAILED");
  });

  it("queued (just-dispatched) row leaves run details empty without crashing", () => {
    const view = projectTask(makeRow({ status: "queued", payload: { prompt: "hi" } }));
    expect(view.github_run_id).toBeNull();
    expect(view.github_conclusion).toBeNull();
    expect(view.logs).toBeNull();
    expect(view.result).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────
// Command Center dispatch — integration via mock Supabase
// ─────────────────────────────────────────────────────────────────────

describe("Track 3 (#843) — dispatchCommandCenterPrompt integration", () => {
  function mockSupabase(opts: {
    invokeData?: { task_id?: string; status?: string; error?: string };
    invokeError?: { message: string } | null;
    rowFor?: (id: string) => ExecutionTaskRow | null;
  }) {
    const calls = {
      functionsInvoke: [] as Array<{ name: string; body: unknown }>,
      schemas: [] as string[],
      tables: [] as string[],
      selects: [] as string[],
      ids: [] as string[],
    };

    const queryChain = (id: string) => ({
      maybeSingle: async () => ({
        data: opts.rowFor?.(id) ?? null,
        error: null,
      }),
    });

    const select = (cols: string) => {
      calls.selects.push(cols);
      return {
        eq: (col: string, val: string) => {
          calls.ids.push(`${col}=${val}`);
          return queryChain(val);
        },
      };
    };

    const fromTable = (table: string) => {
      calls.tables.push(table);
      return {
        select,
        // The allowlist forbids these — if any test ever calls them,
        // we want a loud failure rather than a silent allow.
        insert: () => { throw new Error(`forbidden write to ${table}`); },
        update: () => { throw new Error(`forbidden write to ${table}`); },
        upsert: () => { throw new Error(`forbidden write to ${table}`); },
        delete: () => { throw new Error(`forbidden write to ${table}`); },
      };
    };

    const fromSchema = (schema: string) => {
      calls.schemas.push(schema);
      return { from: fromTable };
    };

    const client = {
      functions: {
        invoke: vi.fn(async (name: string, args: { body?: unknown }) => {
          calls.functionsInvoke.push({ name, body: args?.body });
          return { data: opts.invokeData ?? null, error: opts.invokeError ?? null };
        }),
      },
      schema: fromSchema,
    };

    return { client, calls };
  }

  it("submit lands a row in system.execution_tasks via the canonical edge function (no agent_tasks write)", async () => {
    const row = makeRow({ id: "task_dispatched_1", status: "queued", payload: { prompt: "hello" } });
    const { client, calls } = mockSupabase({
      invokeData: { task_id: "task_dispatched_1", status: "queued" },
      rowFor: (id) => (id === "task_dispatched_1" ? row : null),
    });

    const result = await dispatchCommandCenterPrompt(client as never, "hello");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.taskId).toBe("task_dispatched_1");
    expect(result.status).toBe("queued");
    expect(result.row).toEqual(row);

    // Dispatch path: exactly ONE call to the canonical edge function.
    expect(client.functions.invoke).toHaveBeenCalledTimes(1);
    expect(calls.functionsInvoke[0]).toEqual({
      name: "trigger-github",
      body: { prompt: "hello" },
    });

    // Read-back path: read from system.execution_tasks (NOT agent_tasks).
    expect(calls.schemas).toEqual(["system"]);
    expect(calls.tables).toEqual(["execution_tasks"]);
    expect(calls.tables).not.toContain("agent_tasks");
    expect(calls.selects[0]).toBe(COMMAND_CENTER_TASK_COLUMNS);
    expect(calls.ids[0]).toBe("id=task_dispatched_1");
  });

  it("trims the prompt before sending it through the dispatcher", async () => {
    const { client, calls } = mockSupabase({
      invokeData: { task_id: "t2", status: "queued" },
      rowFor: () => null,
    });
    await dispatchCommandCenterPrompt(client as never, "   spaced out   ");
    expect(calls.functionsInvoke[0].body).toEqual({ prompt: "spaced out" });
  });

  it("rejects empty prompts WITHOUT calling the edge function", async () => {
    const { client } = mockSupabase({ invokeData: { task_id: "x" } });
    const result = await dispatchCommandCenterPrompt(client as never, "    ");
    expect(result.ok).toBe(false);
    expect(client.functions.invoke).not.toHaveBeenCalled();
  });

  it("surfaces edge-function errors in the result envelope", async () => {
    const { client } = mockSupabase({
      invokeData: { error: "admin only" },
    });
    const result = await dispatchCommandCenterPrompt(client as never, "x");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("admin only");
  });
});
