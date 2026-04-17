/**
 * LC3 — Dev planner agent · integration tests (task #876).
 *
 * Pins the contract for the planner module that powers the
 * `dev-planner` edge function:
 *
 *   - `validateDevPlan(raw)` strictly accepts only the canonical shape
 *     and rejects every category of malformed plan with a typed error
 *     code (no silent coercion).
 *   - `runDevPlanner({ intent, complete })` calls the injected LLM once,
 *     parses + validates the response, and returns a structured plan
 *     with provider metadata when the response is valid.
 *   - On ANY LLM failure path (throw, non-succeeded status, malformed
 *     JSON, schema-invalid plan), `runDevPlanner` falls back to the
 *     deterministic 3-step plan so the calling builder always has a
 *     valid structure to persist for audit.
 *   - The "intent simple → plan en 3-5 steps cohérents" smoke contract
 *     from task #876: a typical intent yields between 3 and 5 steps,
 *     ordered code.edit → build.run → test.run, with non-empty
 *     success_criteria on every step.
 *
 * The test deliberately exercises the pure planner module (zero Deno
 * imports) with a stubbed `complete` function shaped like
 * `dispatchAiCompletion`'s outcome. The thin Deno.serve wrapper in
 * `dev-planner/index.ts` only adds auth + persistence on top of this
 * core, both covered by the existing edge-function harnesses.
 */

import { describe, expect, it } from "vitest";
import {
  DEV_PLAN_TOOL_BINDINGS,
  DEV_PLAN_TOOLS,
  DEV_PLANNER_SYSTEM_PROMPT,
  MAX_PLAN_STEPS,
  type DevPlannerCompletion,
  deterministicFallbackPlan,
  mergePlanIntoPayload,
  runDevPlanner,
  validateDevPlan,
} from "../../supabase/functions/_shared/execution/types/dev-plan.ts";

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

function okOutcome(json: unknown, provider = "openai", model = "gpt-4o-mini"): DevPlannerCompletion {
  return {
    status: "succeeded",
    output: {
      text: JSON.stringify(json),
      json,
      interaction: { provider, model },
    },
    errorCode: null,
    errorMessage: null,
  };
}

function failedOutcome(code: string, msg: string): DevPlannerCompletion {
  return {
    status: "failed",
    output: null,
    errorCode: code,
    errorMessage: msg,
  };
}

const SAMPLE_PLAN_JSON = {
  summary: "Add a /api/foo endpoint that returns the user's first name.",
  steps: [
    {
      tool: "code.edit",
      args: {
        path: "supabase/functions/api/foo.ts",
        description: "Create the /api/foo handler that returns { first_name }.",
      },
      success_criteria:
        "GET /api/foo responds 200 with a JSON body containing first_name.",
    },
    {
      tool: "build.run",
      args: { mode: "production", label: "api-foo" },
      success_criteria: "vite build exits 0 with no new bundle warnings.",
    },
    {
      tool: "test.run",
      args: { pattern: "api/foo", label: "api-foo" },
      success_criteria: "vitest run reports 0 failures for the api/foo suite.",
    },
  ],
};

// ──────────────────────────────────────────────────────────────────────
// validateDevPlan — strict shape contract
// ──────────────────────────────────────────────────────────────────────

describe("LC3 — validateDevPlan (strict shape contract)", () => {
  it("accepts the canonical 3-step edit → build → test plan", () => {
    const r = validateDevPlan(SAMPLE_PLAN_JSON);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.plan.steps).toHaveLength(3);
      expect(r.plan.steps.map((s) => s.tool)).toEqual([
        "code.edit",
        "build.run",
        "test.run",
      ]);
    }
  });

  it("rejects non-objects with DEV_PLAN_INVALID_SHAPE", () => {
    const cases: unknown[] = [null, undefined, "plan", 42, [1, 2]];
    for (const raw of cases) {
      const r = validateDevPlan(raw);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.errorCode).toBe("DEV_PLAN_INVALID_SHAPE");
    }
  });

  it("rejects a plan with no summary", () => {
    const r = validateDevPlan({ steps: SAMPLE_PLAN_JSON.steps });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errorCode).toBe("DEV_PLAN_MISSING_SUMMARY");
  });

  it("rejects a plan whose steps is not an array", () => {
    const r = validateDevPlan({ summary: "x", steps: "nope" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errorCode).toBe("DEV_PLAN_STEPS_NOT_ARRAY");
  });

  it("rejects an empty steps array", () => {
    const r = validateDevPlan({ summary: "x", steps: [] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errorCode).toBe("DEV_PLAN_EMPTY");
  });

  it("rejects a plan exceeding MAX_PLAN_STEPS", () => {
    const tooMany = Array.from({ length: MAX_PLAN_STEPS + 1 }, () => ({
      tool: "build.run",
      args: {},
      success_criteria: "vite build exits 0.",
    }));
    const r = validateDevPlan({ summary: "x", steps: tooMany });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errorCode).toBe("DEV_PLAN_TOO_LARGE");
  });

  it("rejects an unknown tool name with DEV_PLAN_STEP_TOOL_UNKNOWN", () => {
    const r = validateDevPlan({
      summary: "x",
      steps: [
        {
          tool: "deploy.prod",
          args: { project: "myapp" },
          success_criteria: "deploy succeeds.",
        },
      ],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errorCode).toBe("DEV_PLAN_STEP_TOOL_UNKNOWN");
      expect(r.stepIndex).toBe(0);
    }
  });

  it("rejects a code.edit step missing path", () => {
    const r = validateDevPlan({
      summary: "x",
      steps: [
        {
          tool: "code.edit",
          args: { description: "edit something" },
          success_criteria: "file changed.",
        },
      ],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errorCode).toBe("DEV_PLAN_STEP_ARGS_INVALID");
  });

  it("rejects a code.edit step missing description", () => {
    const r = validateDevPlan({
      summary: "x",
      steps: [
        {
          tool: "code.edit",
          args: { path: "src/foo.ts" },
          success_criteria: "file changed.",
        },
      ],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errorCode).toBe("DEV_PLAN_STEP_ARGS_INVALID");
  });

  it("accepts a code.edit with the `paths` array variant", () => {
    const r = validateDevPlan({
      summary: "x",
      steps: [
        {
          tool: "code.edit",
          args: {
            paths: ["src/a.ts", "src/b.ts"],
            description: "rename Foo to Bar across two files",
          },
          success_criteria: "both files compile and reference Bar.",
        },
      ],
    });
    expect(r.ok).toBe(true);
  });

  it("rejects a step missing success_criteria", () => {
    const r = validateDevPlan({
      summary: "x",
      steps: [{ tool: "build.run", args: {} }],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errorCode).toBe("DEV_PLAN_STEP_MISSING_CRITERIA");
  });

  it("rejects a success_criteria > 240 chars", () => {
    const long = "x".repeat(241);
    const r = validateDevPlan({
      summary: "x",
      steps: [{ tool: "build.run", args: {}, success_criteria: long }],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errorCode).toBe("DEV_PLAN_STEP_CRITERIA_TOO_LONG");
  });

  it("rejects a build.run step with non-string mode", () => {
    const r = validateDevPlan({
      summary: "x",
      steps: [
        { tool: "build.run", args: { mode: 7 }, success_criteria: "ok." },
      ],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errorCode).toBe("DEV_PLAN_STEP_ARGS_INVALID");
  });
});

// ──────────────────────────────────────────────────────────────────────
// Tool binding contract (LC4 will read this directly)
// ──────────────────────────────────────────────────────────────────────

describe("LC3 — DEV_PLAN_TOOL_BINDINGS (LC4 contract)", () => {
  it("exposes a (domain, taskType) pair for every allowed tool", () => {
    for (const tool of DEV_PLAN_TOOLS) {
      const binding = DEV_PLAN_TOOL_BINDINGS[tool];
      expect(binding.domain).toBeTruthy();
      expect(binding.taskType).toBeTruthy();
    }
  });

  it("binds tools to the (domain, taskType) pairs LC1/LC2 register", () => {
    expect(DEV_PLAN_TOOL_BINDINGS["code.edit"]).toEqual({
      domain: "code",
      taskType: "code.edit",
    });
    expect(DEV_PLAN_TOOL_BINDINGS["build.run"]).toEqual({
      domain: "build",
      taskType: "BUILD_RUN",
    });
    expect(DEV_PLAN_TOOL_BINDINGS["test.run"]).toEqual({
      domain: "test",
      taskType: "TEST_RUN",
    });
  });
});

// ──────────────────────────────────────────────────────────────────────
// runDevPlanner — happy + failure paths
// ──────────────────────────────────────────────────────────────────────

describe("LC3 — runDevPlanner (LLM-driven plan loop)", () => {
  it("calls the injected LLM exactly once with the dev-planner system prompt", async () => {
    const calls: Array<{ system: string; user: string }> = [];
    const result = await runDevPlanner({
      intent: "ajoute un endpoint /api/foo qui retourne X",
      complete: async (system, user) => {
        calls.push({ system, user });
        return okOutcome(SAMPLE_PLAN_JSON);
      },
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].system).toBe(DEV_PLANNER_SYSTEM_PROMPT);
    expect(calls[0].user).toContain("ajoute un endpoint /api/foo");
    expect(result.source).toBe("ai");
    expect(result.provider).toBe("openai");
    expect(result.model).toBe("gpt-4o-mini");
    expect(result.fallbackReason).toBeNull();
  });

  it("appends the optional context block to the user message", async () => {
    let captured = "";
    await runDevPlanner({
      intent: "rename Foo → Bar",
      context: "files: src/a.ts, src/b.ts",
      complete: async (_s, user) => {
        captured = user;
        return okOutcome(SAMPLE_PLAN_JSON);
      },
    });
    expect(captured).toContain("INTENT:");
    expect(captured).toContain("rename Foo → Bar");
    expect(captured).toContain("CONTEXT:");
    expect(captured).toContain("src/a.ts");
  });

  it("integration smoke: a typical intent yields a 3-5 step coherent plan", async () => {
    const result = await runDevPlanner({
      intent: "ajoute un endpoint /api/foo qui retourne X",
      complete: async () => okOutcome(SAMPLE_PLAN_JSON),
    });
    expect(result.source).toBe("ai");
    expect(result.plan.steps.length).toBeGreaterThanOrEqual(3);
    expect(result.plan.steps.length).toBeLessThanOrEqual(5);
    // Coherent ordering: a code.edit precedes any build/test step.
    const firstEditIdx = result.plan.steps.findIndex((s) => s.tool === "code.edit");
    const firstBuildIdx = result.plan.steps.findIndex((s) => s.tool === "build.run");
    const firstTestIdx = result.plan.steps.findIndex((s) => s.tool === "test.run");
    expect(firstEditIdx).toBeGreaterThanOrEqual(0);
    expect(firstBuildIdx).toBeGreaterThan(firstEditIdx);
    expect(firstTestIdx).toBeGreaterThan(firstBuildIdx);
    for (const step of result.plan.steps) {
      expect(step.success_criteria.length).toBeGreaterThan(0);
      expect(step.success_criteria.length).toBeLessThanOrEqual(240);
    }
  });

  it("falls back deterministically when the LLM call throws", async () => {
    const result = await runDevPlanner({
      intent: "do the thing",
      complete: async () => {
        throw new Error("network down");
      },
    });
    expect(result.source).toBe("fallback");
    expect(result.fallbackReason).toContain("network down");
    expect(result.plan.steps).toHaveLength(3);
    // Fallback plan still satisfies the validator — important so the
    // builder can persist it without a second sanity check.
    expect(validateDevPlan(result.plan).ok).toBe(true);
  });

  it("falls back when dispatch returns a non-succeeded status", async () => {
    const result = await runDevPlanner({
      intent: "do the thing",
      complete: async () => failedOutcome("AI_DISPATCH_TIMEOUT", "timed out after 30s"),
    });
    expect(result.source).toBe("fallback");
    expect(result.fallbackReason).toContain("AI_DISPATCH_TIMEOUT");
  });

  it("falls back when the LLM returns malformed JSON text", async () => {
    const result = await runDevPlanner({
      intent: "do the thing",
      complete: async () => ({
        status: "succeeded",
        output: {
          text: "this is not JSON {",
          interaction: { provider: "openai", model: "gpt-4o-mini" },
        },
        errorCode: null,
        errorMessage: null,
      }),
    });
    expect(result.source).toBe("fallback");
    expect(result.fallbackReason).toMatch(/^DEV_PLAN_/);
  });

  it("falls back when the LLM returns a schema-invalid plan", async () => {
    const result = await runDevPlanner({
      intent: "do the thing",
      complete: async () =>
        okOutcome({
          summary: "bad plan",
          steps: [{ tool: "deploy.prod", args: {}, success_criteria: "ok." }],
        }),
    });
    expect(result.source).toBe("fallback");
    expect(result.fallbackReason).toContain("DEV_PLAN_STEP_TOOL_UNKNOWN");
    // Provider metadata is preserved even on the fallback path so the
    // caller can audit which model produced the rejected output.
    expect(result.provider).toBe("openai");
  });
});

// ──────────────────────────────────────────────────────────────────────
// mergePlanIntoPayload — canonical persistence shape
// ──────────────────────────────────────────────────────────────────────

describe("LC3 — mergePlanIntoPayload (intent_payload.plan persistence)", () => {
  const sample = SAMPLE_PLAN_JSON as unknown as Parameters<typeof mergePlanIntoPayload>[1];
  const meta = {
    source: "ai" as const,
    provider: "openai",
    model: "gpt-4o-mini",
    plannedAt: "2026-04-17T00:00:00.000Z",
  };

  it("writes the plan at the canonical payload.intent_payload.plan slot", () => {
    const next = mergePlanIntoPayload({}, sample, meta);
    expect(next.intent_payload).toBeDefined();
    const intent = next.intent_payload as Record<string, unknown>;
    expect(intent.plan).toEqual(sample);
  });

  it("attaches a sibling intent_payload.dev_plan envelope with provider metadata", () => {
    const next = mergePlanIntoPayload({}, sample, meta);
    const intent = next.intent_payload as Record<string, unknown>;
    expect(intent.dev_plan).toMatchObject({
      plan: sample,
      plan_source: "ai",
      plan_provider: "openai",
      plan_model: "gpt-4o-mini",
      planned_at: "2026-04-17T00:00:00.000Z",
    });
  });

  it("preserves pre-existing top-level payload fields", () => {
    const next = mergePlanIntoPayload(
      { goal_id: "g-1", correlation_id: "c-1", custom: { foo: "bar" } },
      sample,
      meta,
    );
    expect(next.goal_id).toBe("g-1");
    expect(next.correlation_id).toBe("c-1");
    expect(next.custom).toEqual({ foo: "bar" });
  });

  it("preserves pre-existing intent_payload fields next to the new plan", () => {
    const next = mergePlanIntoPayload(
      { intent_payload: { diff_kind: "text", initiator: "builder" } },
      sample,
      meta,
    );
    const intent = next.intent_payload as Record<string, unknown>;
    expect(intent.diff_kind).toBe("text");
    expect(intent.initiator).toBe("builder");
    expect(intent.plan).toEqual(sample);
  });

  it("mirrors the envelope at top-level payload.dev_plan for forward-compat readers", () => {
    const next = mergePlanIntoPayload({}, sample, meta);
    expect(next.dev_plan).toMatchObject({
      plan: sample,
      plan_source: "ai",
      plan_provider: "openai",
    });
  });

  it("treats null / non-object existing payloads as empty without throwing", () => {
    expect(() => mergePlanIntoPayload(null, sample, meta)).not.toThrow();
    expect(() => mergePlanIntoPayload(undefined, sample, meta)).not.toThrow();
    const fromNull = mergePlanIntoPayload(null, sample, meta);
    expect(fromNull.intent_payload).toBeDefined();
  });

  it("auto-generates planned_at when not supplied, preserving ISO 8601 shape", () => {
    const next = mergePlanIntoPayload({}, sample, {
      source: "fallback",
      provider: null,
      model: null,
    });
    const intent = next.intent_payload as Record<string, unknown>;
    const env = intent.dev_plan as Record<string, unknown>;
    expect(typeof env.planned_at).toBe("string");
    expect(() => new Date(env.planned_at as string).toISOString()).not.toThrow();
    expect(env.plan_source).toBe("fallback");
  });
});

// ──────────────────────────────────────────────────────────────────────
// deterministicFallbackPlan
// ──────────────────────────────────────────────────────────────────────

describe("LC3 — deterministicFallbackPlan", () => {
  it("returns a 3-step edit→build→test plan that passes validation", () => {
    const plan = deterministicFallbackPlan("some intent");
    const r = validateDevPlan(plan);
    expect(r.ok).toBe(true);
    expect(plan.steps.map((s) => s.tool)).toEqual([
      "code.edit",
      "build.run",
      "test.run",
    ]);
  });

  it("truncates a very long intent inside the summary", () => {
    const long = "x".repeat(500);
    const plan = deterministicFallbackPlan(long);
    expect(plan.summary.length).toBeLessThan(500);
    expect(plan.summary).toContain("...");
  });
});
