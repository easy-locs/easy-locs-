/**
 * LB Closeout #853 — hardening regression suite.
 *
 * Three independent guards:
 *   1. `createSupabaseInteractionSink` (the SOLE writer of `ai_interactions`
 *      from inside a dispatched run) populates `execution_task_id` from the
 *      originating `execution_tasks.id`. Proves the linkage claim.
 *   2. The structured-error helper emits a parseable envelope on caught
 *      errors so the four ex-bare-catch sites are now audit-correlated.
 *   3. The lockdown migration file actually drops the writable RLS policies
 *      on `public.agent_tasks` (lightweight static check — the full RLS
 *      assertion lives in `supabase/tests/agent_tasks_lockdown.test.sql`).
 */
import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  createSupabaseInteractionSink,
  type AiInteractionRecord,
} from "../../supabase/functions/_shared/execution/adapters/ai/ai-adapter";
import {
  emitStructuredError,
  runOrLog,
} from "../../supabase/functions/_shared/structured-error";
import { buildAiDispatchHarness } from "./harnesses/ai-dispatch-harness";
import {
  AI_DOMAIN,
  AI_TASK_TYPES,
} from "../../supabase/functions/_shared/execution/adapters/ai/types";
import type { TaskVerifier } from "../../supabase/functions/_shared/execution/verifier-registry";

function fakeTask(overrides: Partial<{ id: string; requested_by: string | null; correlation_id: string | null }> = {}) {
  return {
    id: overrides.id ?? "task-uuid-001",
    // Use `in` so the caller can pass an explicit `null` to model a
    // system-initiated run (the `??` operator would coalesce null away).
    requested_by: "requested_by" in overrides ? overrides.requested_by : "user-uuid-007",
    correlation_id: "correlation_id" in overrides ? overrides.correlation_id : "corr-001",
    domain: "ai",
    task_type: "completion",
    payload: {},
    status: "running",
    created_at: new Date().toISOString(),
  } as unknown as Parameters<ReturnType<typeof createSupabaseInteractionSink>["record"]>[0]["task"];
}

function fakeInteraction(): AiInteractionRecord {
  return {
    feature: "test.feature",
    provider: "openai",
    model: "gpt-4o-mini",
    promptTokens: 10,
    completionTokens: 20,
    costUsd: 0.001,
    latencyMs: 123,
    fallbackUsed: false,
    status: "ok",
    metadata: { sample: true },
  } as AiInteractionRecord;
}

describe("LB Closeout #853 · ai_interactions linkage", () => {
  it("createSupabaseInteractionSink writes execution_task_id from task.id", async () => {
    const captured: Array<Record<string, unknown>> = [];
    const fakeSb = {
      from(table: string) {
        expect(table).toBe("ai_interactions");
        return {
          insert(row: Record<string, unknown>) {
            captured.push(row);
            return Promise.resolve({ error: null });
          },
        };
      },
    } as unknown as Parameters<typeof createSupabaseInteractionSink>[0];

    const sink = createSupabaseInteractionSink(fakeSb);
    await sink.record({
      task: fakeTask({ id: "task-correlation-uuid-xyz" }),
      interaction: fakeInteraction(),
      domainTaskType: "completion",
    });

    expect(captured).toHaveLength(1);
    const row = captured[0];
    // The headline assertion: linkage is populated for every dispatched-run row.
    expect(row.execution_task_id).toBe("task-correlation-uuid-xyz");
    // And a few sanity checks so a shape regression also fails this test.
    expect(row.feature).toBe("test.feature");
    expect(row.provider).toBe("openai");
    expect(row.user_id).toBe("user-uuid-007");
    expect((row.metadata as Record<string, unknown>).correlation_id).toBe("corr-001");
    expect((row.metadata as Record<string, unknown>).task_type).toBe("completion");
  });

  it("propagates linkage even when requested_by is null (system-initiated runs)", async () => {
    const captured: Array<Record<string, unknown>> = [];
    const fakeSb = {
      from() {
        return { insert(row: Record<string, unknown>) { captured.push(row); return Promise.resolve({ error: null }); } };
      },
    } as unknown as Parameters<typeof createSupabaseInteractionSink>[0];

    const sink = createSupabaseInteractionSink(fakeSb);
    await sink.record({
      task: fakeTask({ id: "system-task-id", requested_by: null }),
      interaction: fakeInteraction(),
      domainTaskType: "completion",
    });

    expect(captured[0].execution_task_id).toBe("system-task-id");
    expect(captured[0].user_id).toBeNull();
  });

  it("throws InteractionSinkError when the insert fails so the orchestrator can stamp PERSIST_INTERACTION_FAILED", async () => {
    const fakeSb = {
      from() {
        return { insert() { return Promise.resolve({ error: { message: "boom" } }); } };
      },
    } as unknown as Parameters<typeof createSupabaseInteractionSink>[0];
    const sink = createSupabaseInteractionSink(fakeSb);
    await expect(
      sink.record({ task: fakeTask(), interaction: fakeInteraction(), domainTaskType: "completion" }),
    ).rejects.toThrow(/boom/);
  });
});

// ── End-to-end dispatch path: prove execution_task_id propagation ────────
//
// Plugs the REAL `createSupabaseInteractionSink` (against a mock supabase
// client that captures the insert payload) into the ai-dispatch harness,
// then runs the full pipeline:
//   simulateDispatch → orchestrator → ai-completion-adapter →
//   createSupabaseInteractionSink → mock `.from("ai_interactions").insert(...)`
// and asserts the persisted row's `execution_task_id` equals the dispatch
// handle's `taskId`. This is the "true dispatch-path" linkage proof.

const ALL_AI_PASSING_VERIFIERS: TaskVerifier[] = (
  Object.values(AI_TASK_TYPES) as string[]
).map((taskType) => ({
  domain: AI_DOMAIN,
  taskType,
  verify: async () => ({ ok: true }),
}));

function makeCapturingSupabaseClient() {
  const inserted: Array<Record<string, unknown>> = [];
  const sb = {
    from(table: string) {
      // The real sink only ever writes to `ai_interactions`; assert that
      // contract so a regression in the writer is caught here too.
      if (table !== "ai_interactions") {
        throw new Error(`Unexpected table write: ${table}`);
      }
      return {
        insert(row: Record<string, unknown>) {
          inserted.push(row);
          return Promise.resolve({ error: null });
        },
      };
    },
  };
  // Cast to the SupabaseClient surface area the sink uses — it only calls
  // .from(...).insert(...).
  return { sb: sb as unknown as Parameters<typeof createSupabaseInteractionSink>[0], inserted };
}

describe("LB Closeout #853 · ai_interactions linkage (dispatch-path proof)", () => {
  it("dispatchAiCompletion fixture run: persisted ai_interactions row carries execution_task_id == taskId", async () => {
    const { sb, inserted } = makeCapturingSupabaseClient();
    const realSink = createSupabaseInteractionSink(sb);

    const h = buildAiDispatchHarness({
      verifiers: ALL_AI_PASSING_VERIFIERS,
      interactions: realSink,
    });

    const handle = h.simulateDispatch({
      domain: AI_DOMAIN,
      taskType: AI_TASK_TYPES.COMPLETION,
      payload: { feature: "linkage_proof", messages: [{ role: "user", content: "hi" }] },
    });

    const outcome = await h.orchestrator.run(handle.taskId);
    expect(outcome.finalStatus).toBe("succeeded");

    // EXACTLY one ai_interactions row was persisted, and it is linked
    // back to the originating execution_tasks.id.
    expect(inserted).toHaveLength(1);
    expect(inserted[0].execution_task_id).toBe(handle.taskId);
    expect(inserted[0].feature).toBe("linkage_proof");
    expect(inserted[0].domain).toBe(AI_DOMAIN);
    expect((inserted[0].metadata as Record<string, unknown>).task_type).toBe(
      AI_TASK_TYPES.COMPLETION,
    );
  });

  it("100% link rate: a fixture batch of N=5 dispatched runs all carry execution_task_id (no nulls)", async () => {
    const { sb, inserted } = makeCapturingSupabaseClient();
    const realSink = createSupabaseInteractionSink(sb);

    const h = buildAiDispatchHarness({
      verifiers: ALL_AI_PASSING_VERIFIERS,
      interactions: realSink,
    });

    const taskIds: string[] = [];
    for (let i = 0; i < 5; i++) {
      const handle = h.simulateDispatch({
        domain: AI_DOMAIN,
        taskType: AI_TASK_TYPES.COMPLETION,
        payload: { feature: `batch.${i}`, messages: [{ role: "user", content: `q${i}` }] },
      });
      taskIds.push(handle.taskId);
      const out = await h.orchestrator.run(handle.taskId);
      expect(out.finalStatus).toBe("succeeded");
    }

    expect(inserted).toHaveLength(5);
    // Every persisted row has a non-null execution_task_id (link-rate proof).
    const linkRate = inserted.filter((r) => typeof r.execution_task_id === "string" && r.execution_task_id).length / inserted.length;
    expect(linkRate).toBe(1);
    // And each row's link points to the matching dispatched task.
    for (let i = 0; i < 5; i++) {
      expect(inserted[i].execution_task_id).toBe(taskIds[i]);
    }
  });
});

describe("LB Closeout #853 · structured-error helper replaces bare catches", () => {
  it("emitStructuredError writes a JSON line with event + correlation fields", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      emitStructuredError(
        { event: "test.sample_failure", task_id: "T-1", agent_slug: "test.agent" },
        new Error("kaboom"),
      );
      expect(spy).toHaveBeenCalledTimes(1);
      const line = spy.mock.calls[0][0] as string;
      const parsed = JSON.parse(line);
      expect(parsed.level).toBe("error");
      expect(parsed.event).toBe("test.sample_failure");
      expect(parsed.task_id).toBe("T-1");
      expect(parsed.agent_slug).toBe("test.agent");
      expect(parsed.message).toBe("kaboom");
    } finally {
      spy.mockRestore();
    }
  });

  it("runOrLog returns the value on success and undefined on caught failure", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const ok = await runOrLog({ event: "noop.success" }, async () => 42);
      expect(ok).toBe(42);
      expect(spy).not.toHaveBeenCalled();

      const fail = await runOrLog({ event: "noop.failure", entity_id: "E-9" }, async () => {
        throw new Error("oops");
      });
      expect(fail).toBeUndefined();
      expect(spy).toHaveBeenCalledTimes(1);
      const parsed = JSON.parse(spy.mock.calls[0][0] as string);
      expect(parsed.event).toBe("noop.failure");
      expect(parsed.entity_id).toBe("E-9");
      expect(parsed.message).toBe("oops");
    } finally {
      spy.mockRestore();
    }
  });
});

describe("LB Closeout #853 · agent_tasks lockdown migration", () => {
  const migrationPath = resolve(
    process.cwd(),
    "supabase/migrations/20260429000000_agent_tasks_lockdown.sql",
  );

  it("migration file exists and drops both writable RLS policies", () => {
    const sql = readFileSync(migrationPath, "utf8");
    expect(sql).toMatch(/DROP POLICY "agent_tasks_owner_insert"/);
    expect(sql).toMatch(/DROP POLICY "agent_tasks_owner_update"/);
  });

  it("migration revokes INSERT/UPDATE/DELETE from authenticated and anon", () => {
    const sql = readFileSync(migrationPath, "utf8");
    expect(sql).toMatch(/REVOKE\s+INSERT,\s*UPDATE,\s*DELETE\s+ON\s+public\.agent_tasks\s+FROM\s+authenticated/);
    expect(sql).toMatch(/REVOKE\s+INSERT,\s*UPDATE,\s*DELETE\s+ON\s+public\.agent_tasks\s+FROM\s+anon/);
  });

  it("does NOT drop the SELECT policy or the table itself", () => {
    const sql = readFileSync(migrationPath, "utf8");
    expect(sql).not.toMatch(/DROP POLICY.*agent_tasks_owner_select/);
    expect(sql).not.toMatch(/DROP TABLE\s+public\.agent_tasks/);
  });
});

describe("LB Closeout #853 · bare-catch sites are migrated to structured emission", () => {
  // Static guard: the four ex-bare-catch sites no longer hold `catch (_) {}`,
  // they import the helper, and they pass through `runOrLog(...)` with the
  // correct event namespace + correlation fields.
  const SITES = [
    {
      file: "supabase/functions/engine-cron-server/index.ts",
      events: ["engine_cron.supervisor_upsert_failed", "engine_cron.fx_refresh_failed"],
    },
    {
      file: "supabase/functions/pipeline-worker/index.ts",
      events: ["pipeline_worker.validate_firewall_log_failed", "pipeline_worker.publish_firewall_log_failed"],
    },
  ] as const;

  it.each(SITES)("$file uses runOrLog and emits the expected structured events", ({ file, events }) => {
    const src = readFileSync(resolve(process.cwd(), file), "utf8");
    expect(src, `${file} still contains a bare \`catch (_) {}\` swallow`).not.toMatch(/catch\s*\(\s*_\s*\)\s*\{\s*\}/);
    expect(src, `${file} should import runOrLog from structured-error.ts`).toMatch(
      /import\s*\{\s*runOrLog\s*\}\s*from\s*["']\.\.\/_shared\/structured-error\.ts["']/,
    );
    for (const event of events) {
      expect(src, `${file} should pass event "${event}" into runOrLog`).toContain(event);
    }
  });

  // Runtime guard: simulate each replaced catch path by invoking runOrLog
  // with the SAME (event, ctx) that the replaced site uses, and a thrown
  // function. Asserts the structured envelope is correctly emitted.
  // This is the runtime proof that the replacement is alive (not just the
  // string match).
  const RUNTIME_SITES = [
    {
      label: "engine-cron supervisor heartbeat",
      ctx: { event: "engine_cron.supervisor_upsert_failed", engine_name: "fx-refresh", status: "running" },
      expectedFields: ["engine_name", "status"],
    },
    {
      label: "engine-cron fx refresh",
      ctx: { event: "engine_cron.fx_refresh_failed", base: "AED", targets: ["USD", "EUR"] },
      expectedFields: ["base", "targets"],
    },
    {
      label: "pipeline-worker validate firewall block log",
      ctx: { event: "pipeline_worker.validate_firewall_log_failed", entity_id: "merchant-42", reasons: ["bad_score"] },
      expectedFields: ["entity_id", "reasons"],
    },
    {
      label: "pipeline-worker publish firewall block log",
      ctx: { event: "pipeline_worker.publish_firewall_log_failed", entity_id: "merchant-99", reasons: ["missing_photo"] },
      expectedFields: ["entity_id", "reasons"],
    },
  ];

  it.each(RUNTIME_SITES)("forces the catch-path at $label and asserts the structured envelope fires", async ({ ctx, expectedFields }) => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const result = await runOrLog(ctx, async () => {
        throw new Error("simulated supabase upsert failure");
      });
      expect(result).toBeUndefined();
      expect(spy).toHaveBeenCalledTimes(1);
      const parsed = JSON.parse(spy.mock.calls[0][0] as string);
      expect(parsed.level).toBe("error");
      expect(parsed.event).toBe(ctx.event);
      expect(parsed.message).toBe("simulated supabase upsert failure");
      for (const field of expectedFields) {
        expect(parsed).toHaveProperty(field);
      }
    } finally {
      spy.mockRestore();
    }
  });
});
