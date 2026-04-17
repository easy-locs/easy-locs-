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
  // A static check — proves the four ex-bare-catch sites no longer hold
  // `catch (_) {}` and now emit a structured event envelope.
  const SITES = [
    { file: "supabase/functions/engine-cron-server/index.ts", events: ["engine_cron.supervisor_upsert_failed", "engine_cron.fx_refresh_failed"] },
    { file: "supabase/functions/pipeline-worker/index.ts", events: ["pipeline_worker.validate_firewall_log_failed", "pipeline_worker.publish_firewall_log_failed"] },
  ] as const;

  it.each(SITES)("$file no longer contains `catch (_) {}` and emits the expected structured events", ({ file, events }) => {
    const src = readFileSync(resolve(process.cwd(), file), "utf8");
    expect(src, `${file} still contains a bare \`catch (_) {}\` swallow`).not.toMatch(/catch\s*\(\s*_\s*\)\s*\{\s*\}/);
    for (const event of events) {
      expect(src, `${file} should emit structured event "${event}"`).toContain(event);
    }
  });
});
