/**
 * Level C · L3 — Dev planner shared types & validators (Task #876).
 *
 * Pure module (no Deno-only imports) so it can be exercised from vitest
 * AND imported by the `dev-planner` edge function on Supabase. It is the
 * single source of truth for:
 *
 *   - the strict shape of a dev plan (`DevPlan`),
 *   - the closed set of tools a planner may emit,
 *   - the system prompt that asks the LLM for that exact shape,
 *   - `validateDevPlan(raw)`, the runtime guard called BEFORE any plan is
 *     persisted into `system.execution_tasks.payload.plan`,
 *   - `runDevPlanner(...)`, the dependency-injected planning loop the
 *     edge function wraps over `dispatchAiCompletion` (Level B).
 *
 * Critical constraints (mirrors task #876):
 *   - The planner NEVER invokes a tool. It produces a plan only.
 *   - Plans are strictly typed and validated against this schema before
 *     persistence. Invalid plans are rejected with a structured error,
 *     never silently coerced.
 *   - No new AI path: `runDevPlanner` only calls the injected
 *     `dispatchAiCompletion`-shaped function — i.e. Level B's canonical
 *     entrypoint. There is zero reference to OpenAI/Anthropic SDKs here.
 *   - The downstream tools (`code.edit`, `build.run`, `test.run`) are the
 *     same primitives LC1/LC2 register; this module mirrors their domain
 *     names so the LC4 builder can route each step verbatim.
 */

// ── Tool whitelist ───────────────────────────────────────────────────────

/** The closed set of tools a dev plan step may invoke. Adding a tool here
 *  is the ONLY way to expand planner reach. */
export const DEV_PLAN_TOOLS = ["code.edit", "build.run", "test.run"] as const;
export type DevPlanTool = (typeof DEV_PLAN_TOOLS)[number];

/** Map a tool slug to the canonical (domain, task_type) pair the LC4
 *  builder uses to dispatch the step through `system.execution_tasks`. */
export const DEV_PLAN_TOOL_BINDINGS: Readonly<
  Record<DevPlanTool, { domain: string; taskType: string }>
> = {
  "code.edit": { domain: "code", taskType: "code.edit" },
  "build.run": { domain: "build", taskType: "BUILD_RUN" },
  "test.run": { domain: "test", taskType: "TEST_RUN" },
};

// ── Plan shape ───────────────────────────────────────────────────────────

export interface DevPlanStep {
  /** Tool slug — must be one of `DEV_PLAN_TOOLS`. */
  readonly tool: DevPlanTool;
  /** Tool-specific arguments. Schema enforced per-tool by `validateArgs`. */
  readonly args: Record<string, unknown>;
  /**
   * Plain-language criterion the verifier (LC6) will check after the
   * step runs. Must be ≤ 240 chars; required so every step is
   * independently auditable.
   */
  readonly success_criteria: string;
}

export interface DevPlan {
  /** One-sentence restatement of the dev intent. */
  readonly summary: string;
  /** Ordered list of steps. 1..MAX_PLAN_STEPS. */
  readonly steps: readonly DevPlanStep[];
}

/** Hard upper bound — plans larger than this are rejected. The LC4
 *  builder applies its own per-attempt budget on top. */
export const MAX_PLAN_STEPS = 8;
/** Soft lower bound for the integration contract: a healthy intent
 *  produces 3-5 steps. Plans with 1-2 steps are still accepted (a
 *  trivial intent may need a single edit), but never zero. */
export const MIN_PLAN_STEPS = 1;

// ── Validation ───────────────────────────────────────────────────────────

export type ValidateDevPlanResult =
  | { ok: true; plan: DevPlan }
  | { ok: false; errorCode: string; errorMessage: string; stepIndex?: number };

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function validateArgs(
  tool: DevPlanTool,
  args: unknown,
): { ok: true } | { ok: false; reason: string } {
  if (!isPlainObject(args)) {
    return { ok: false, reason: "args must be an object" };
  }
  switch (tool) {
    case "code.edit": {
      // LC1 contract: a code.edit step must describe at least the path
      // it intends to touch and the diff_kind. The actual diff body may
      // be filled in by the builder (LC4) before dispatch — the planner
      // only needs to commit to the file(s) it will edit so dev-policy
      // (LC5) can pre-classify sensitivity.
      const path = args.path;
      const paths = args.paths;
      const hasPath =
        (typeof path === "string" && path.length > 0) ||
        (Array.isArray(paths) && paths.length > 0 &&
          paths.every((p) => typeof p === "string" && p.length > 0));
      if (!hasPath) {
        return { ok: false, reason: "code.edit requires `path` or `paths`" };
      }
      const description = args.description;
      if (typeof description !== "string" || description.length === 0) {
        return { ok: false, reason: "code.edit requires a `description`" };
      }
      return { ok: true };
    }
    case "build.run": {
      // LC2 build.run: optional `mode`, `label`. No required arg — the
      // adapter defaults to `vite build` in production mode. We only
      // validate types when present so the LLM doesn't smuggle in
      // unexpected commands.
      if (
        args.mode !== undefined &&
        typeof args.mode !== "string"
      ) {
        return { ok: false, reason: "build.run.mode must be a string" };
      }
      if (
        args.label !== undefined &&
        typeof args.label !== "string"
      ) {
        return { ok: false, reason: "build.run.label must be a string" };
      }
      return { ok: true };
    }
    case "test.run": {
      // LC2 test.run: optional `pattern` to scope the run, optional
      // `label`. Same shape contract as build.run.
      if (
        args.pattern !== undefined &&
        typeof args.pattern !== "string"
      ) {
        return { ok: false, reason: "test.run.pattern must be a string" };
      }
      if (
        args.label !== undefined &&
        typeof args.label !== "string"
      ) {
        return { ok: false, reason: "test.run.label must be a string" };
      }
      return { ok: true };
    }
  }
}

/**
 * Strict validator. Returns a discriminated union — callers MUST handle
 * the `ok: false` branch. No silent coercion: an invalid plan is a hard
 * planner failure that the edge function surfaces as a 422.
 */
export function validateDevPlan(raw: unknown): ValidateDevPlanResult {
  if (!isPlainObject(raw)) {
    return {
      ok: false,
      errorCode: "DEV_PLAN_INVALID_SHAPE",
      errorMessage: "plan must be a JSON object",
    };
  }
  const summary = raw.summary;
  if (typeof summary !== "string" || summary.length === 0) {
    return {
      ok: false,
      errorCode: "DEV_PLAN_MISSING_SUMMARY",
      errorMessage: "plan.summary must be a non-empty string",
    };
  }
  const stepsRaw = raw.steps;
  if (!Array.isArray(stepsRaw)) {
    return {
      ok: false,
      errorCode: "DEV_PLAN_STEPS_NOT_ARRAY",
      errorMessage: "plan.steps must be an array",
    };
  }
  if (stepsRaw.length < MIN_PLAN_STEPS) {
    return {
      ok: false,
      errorCode: "DEV_PLAN_EMPTY",
      errorMessage: `plan must have at least ${MIN_PLAN_STEPS} step`,
    };
  }
  if (stepsRaw.length > MAX_PLAN_STEPS) {
    return {
      ok: false,
      errorCode: "DEV_PLAN_TOO_LARGE",
      errorMessage:
        `plan has ${stepsRaw.length} steps; max is ${MAX_PLAN_STEPS}`,
    };
  }

  const steps: DevPlanStep[] = [];
  for (let i = 0; i < stepsRaw.length; i++) {
    const s = stepsRaw[i];
    if (!isPlainObject(s)) {
      return {
        ok: false,
        errorCode: "DEV_PLAN_STEP_INVALID",
        errorMessage: `steps[${i}] is not an object`,
        stepIndex: i,
      };
    }
    const tool = s.tool;
    if (
      typeof tool !== "string" ||
      !(DEV_PLAN_TOOLS as readonly string[]).includes(tool)
    ) {
      return {
        ok: false,
        errorCode: "DEV_PLAN_STEP_TOOL_UNKNOWN",
        errorMessage:
          `steps[${i}].tool must be one of ${DEV_PLAN_TOOLS.join(", ")}`,
        stepIndex: i,
      };
    }
    const argsCheck = validateArgs(tool as DevPlanTool, s.args);
    if (!argsCheck.ok) {
      return {
        ok: false,
        errorCode: "DEV_PLAN_STEP_ARGS_INVALID",
        errorMessage: `steps[${i}].args invalid: ${argsCheck.reason}`,
        stepIndex: i,
      };
    }
    const sc = s.success_criteria;
    if (typeof sc !== "string" || sc.length === 0) {
      return {
        ok: false,
        errorCode: "DEV_PLAN_STEP_MISSING_CRITERIA",
        errorMessage:
          `steps[${i}].success_criteria must be a non-empty string`,
        stepIndex: i,
      };
    }
    if (sc.length > 240) {
      return {
        ok: false,
        errorCode: "DEV_PLAN_STEP_CRITERIA_TOO_LONG",
        errorMessage:
          `steps[${i}].success_criteria must be ≤ 240 chars (got ${sc.length})`,
        stepIndex: i,
      };
    }
    steps.push({
      tool: tool as DevPlanTool,
      args: s.args as Record<string, unknown>,
      success_criteria: sc,
    });
  }

  return { ok: true, plan: { summary, steps } };
}

// ── System prompt ────────────────────────────────────────────────────────

/** Single-source system prompt the planner sends through Level B. The
 *  rules echo the validator above; any drift here is caught by
 *  `validateDevPlan` rejecting the LLM output. */
export const DEV_PLANNER_SYSTEM_PROMPT =
  `You are the Dev Planner agent of a governed self-evolving software platform.

Your job: read the developer's INTENT and break it into an ordered list of
small, concrete steps that the dev pipeline can run today.

You MUST respond with valid JSON of the exact shape:
{
  "summary": "one-sentence restatement of the intent",
  "steps": [
    {
      "tool": "code.edit" | "build.run" | "test.run",
      "args": { /* tool-specific args, see below */ },
      "success_criteria": "plain-language check the verifier will run after this step"
    }
  ]
}

Rules:
- Use ONLY the three tools above. Any other tool name is invalid and
  causes the entire plan to be rejected.
- Emit between ${MIN_PLAN_STEPS} and ${MAX_PLAN_STEPS} steps. Prefer 3-5
  for a typical feature change.
- Order matters: earlier steps run first. A typical plan is
  code.edit → build.run → test.run.
- success_criteria must be one short sentence (≤ 240 chars) describing a
  concrete observable outcome (e.g. "endpoint /api/foo returns 200 with
  the X field", "vitest reports 0 failures").
- Never invent files outside the repo. Reference paths exactly as they
  appear in the intent's CONTEXT block, if provided.

Tool argument schemas:
  • code.edit:
      { "path": string | "paths": string[],   // file(s) you intend to edit
        "description": string }                // what the edit accomplishes
  • build.run:
      { "mode"?: "production" | "staging" | "development",
        "label"?: string }                     // optional human tag
  • test.run:
      { "pattern"?: string,                    // optional vitest --testNamePattern
        "label"?: string }`;

// ── Deterministic fallback ──────────────────────────────────────────────

/**
 * Deterministic fallback used when the LLM call fails or returns
 * unparseable output. It produces a minimal, valid 3-step plan
 * (edit → build → test) so the calling builder always has something to
 * persist for audit. Real planning resumes on the next attempt.
 */
export function deterministicFallbackPlan(intent: string): DevPlan {
  const trimmed = intent.length > 120 ? intent.slice(0, 117) + "..." : intent;
  return {
    summary: `Fallback plan: triage the intent "${trimmed}" with a smoke loop.`,
    steps: [
      {
        tool: "code.edit",
        args: {
          path: "docs/dev-planner-fallback.md",
          description:
            "Record the intent in the fallback log so an operator can plan it manually.",
        },
        success_criteria:
          "docs/dev-planner-fallback.md has a new entry with the intent verbatim.",
      },
      {
        tool: "build.run",
        args: { mode: "production", label: "dev-planner-fallback" },
        success_criteria:
          "vite build exits 0 and the bundle size is within the recorded baseline.",
      },
      {
        tool: "test.run",
        args: { label: "dev-planner-fallback" },
        success_criteria: "vitest run reports 0 failures.",
      },
    ],
  };
}

// ── Plan generation loop (dependency-injected) ──────────────────────────

/** Minimal shape of `dispatchAiCompletion`'s outcome — duplicated here so
 *  this module stays free of Deno-only imports. The edge function passes
 *  the real `dispatchAiCompletion` and the types line up at the boundary. */
export interface DevPlannerCompletion {
  status: "succeeded" | "failed" | "blocked" | "rejected" | "pending_review" | "timeout";
  output: {
    text: string;
    json?: unknown;
    interaction: { provider: string; model: string };
  } | null;
  errorCode: string | null;
  errorMessage: string | null;
}

export type DevPlannerCompletionFn = (
  systemPrompt: string,
  userMessage: string,
) => Promise<DevPlannerCompletion>;

// ── Persistence helper (pure) ───────────────────────────────────────────

export interface DevPlanEnvelope {
  readonly plan: DevPlan;
  readonly plan_source: "ai" | "fallback";
  readonly plan_provider: string | null;
  readonly plan_model: string | null;
  readonly planned_at: string;
}

/**
 * Pure merge that produces the next `system.execution_tasks.payload`
 * value with the plan persisted at the canonical location
 * `payload.intent_payload.plan` (per task #876 acceptance and the
 * convention documented in 20260424000000_admin_approvals_inbox.sql).
 *
 * Behaviour:
 *   - Preserves any existing fields on `payload`.
 *   - Preserves any existing fields on `payload.intent_payload`.
 *   - Writes the plan + envelope metadata under
 *     `payload.intent_payload.plan` and
 *     `payload.intent_payload.dev_plan` (envelope: source/provider/
 *     model/timestamp).
 *   - Mirrors the plan envelope at the top-level `payload.dev_plan`
 *     for forward-compat with renderers that key on the explicit
 *     `dev_plan` namespace; readers MUST prefer the nested
 *     `intent_payload.plan` location.
 */
export function mergePlanIntoPayload(
  existingPayload: Record<string, unknown> | null | undefined,
  plan: DevPlan,
  meta: { source: "ai" | "fallback"; provider: string | null; model: string | null; plannedAt?: string },
): Record<string, unknown> {
  const base =
    existingPayload && typeof existingPayload === "object" && !Array.isArray(existingPayload)
      ? { ...(existingPayload as Record<string, unknown>) }
      : {};
  const existingIntent =
    base.intent_payload && typeof base.intent_payload === "object" && !Array.isArray(base.intent_payload)
      ? { ...(base.intent_payload as Record<string, unknown>) }
      : {};
  const envelope: DevPlanEnvelope = {
    plan,
    plan_source: meta.source,
    plan_provider: meta.provider,
    plan_model: meta.model,
    planned_at: meta.plannedAt ?? new Date().toISOString(),
  };
  base.intent_payload = {
    ...existingIntent,
    plan,
    dev_plan: envelope,
  };
  base.dev_plan = envelope;
  return base;
}

export interface RunDevPlannerInput {
  /** The developer's high-level intent (e.g. "ajoute un endpoint /api/foo
   *  qui retourne X"). */
  readonly intent: string;
  /** Optional context block appended to the user message — typically the
   *  list of relevant files / branch / repo so the LLM grounds its plan
   *  in real paths. */
  readonly context?: string;
  /** Injected LLM call. Production: a thin wrapper over
   *  `dispatchAiCompletion`. Tests: a canned function. */
  readonly complete: DevPlannerCompletionFn;
}

export interface RunDevPlannerResult {
  readonly plan: DevPlan;
  readonly source: "ai" | "fallback";
  readonly provider: string | null;
  readonly model: string | null;
  /** Populated on the fallback path so the caller can log root cause. */
  readonly fallbackReason: string | null;
}

function safeParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Single planning loop. ONE LLM call, strict validation, deterministic
 * fallback on any error. Never throws — failures degrade to the fallback
 * plan with a structured `fallbackReason`.
 */
export async function runDevPlanner(
  input: RunDevPlannerInput,
): Promise<RunDevPlannerResult> {
  const userMessage = input.context
    ? `INTENT:\n${input.intent}\n\nCONTEXT:\n${input.context}`
    : `INTENT:\n${input.intent}`;

  let outcome: DevPlannerCompletion;
  try {
    outcome = await input.complete(DEV_PLANNER_SYSTEM_PROMPT, userMessage);
  } catch (e) {
    return {
      plan: deterministicFallbackPlan(input.intent),
      source: "fallback",
      provider: null,
      model: null,
      fallbackReason: `complete() threw: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  if (outcome.status !== "succeeded" || !outcome.output) {
    return {
      plan: deterministicFallbackPlan(input.intent),
      source: "fallback",
      provider: outcome.output?.interaction.provider ?? null,
      model: outcome.output?.interaction.model ?? null,
      fallbackReason:
        `dispatch status=${outcome.status} code=${outcome.errorCode ?? "n/a"} msg=${outcome.errorMessage ?? "n/a"}`,
    };
  }

  const parsed = outcome.output.json ?? safeParseJson(outcome.output.text);
  const validation = validateDevPlan(parsed);
  if (!validation.ok) {
    return {
      plan: deterministicFallbackPlan(input.intent),
      source: "fallback",
      provider: outcome.output.interaction.provider,
      model: outcome.output.interaction.model,
      fallbackReason: `${validation.errorCode}: ${validation.errorMessage}`,
    };
  }

  return {
    plan: validation.plan,
    source: "ai",
    provider: outcome.output.interaction.provider,
    model: outcome.output.interaction.model,
    fallbackReason: null,
  };
}
