/**
 * Level C · L5 — Dev approval policy hook (Task #873).
 *
 * Pure module evaluated in the dispatch pre-execute pipeline for every
 * `domain: 'code'` task produced by the dev-builder pipeline (LC1..LC4).
 *
 * Rules (single source of truth — mirrored read-only into
 * `system.policy_profiles.metadata` by `20260430000000_dev_policies.sql`):
 *
 *   * Any changed path matching `DEV_SENSITIVE_PATH_RULES` → pending_review.
 *   * Any task type matching `DEV_SENSITIVE_TASK_TYPES`    → pending_review.
 *
 * The hook never blocks (no `blocked` status), it only routes the task to
 * the existing Level A · L5 reviewer inbox by:
 *   - tagging `payload.dev_sensitive` with a human-readable summary the
 *     drawer renders ("Fichiers sensibles touchés"), and
 *   - returning a decision that the dispatch wrapper translates into
 *     `p_requires_approval=true` + `p_approval_policy='single-admin'` +
 *     `p_status='pending_review'` on the canonical RPC call.
 *
 * No new state machine: re-uses `pending_review` from Level A · L5.
 */

/** Path-rule descriptor. `pattern` is a strict regex tested against the
 *  POSIX-style relative path inside the repo (no leading "./", forward
 *  slashes only — callers MUST normalise before passing). */
export interface DevSensitivePathRule {
  readonly id: string;
  readonly pattern: RegExp;
  readonly description: string;
}

/** Single, exported list of sensitive path rules. Never duplicated — the
 *  SQL migration mirrors these patterns as TEXT for audit only. */
export const DEV_SENSITIVE_PATH_RULES: readonly DevSensitivePathRule[] = [
  {
    id: "shared-edge-functions",
    pattern: /^supabase\/functions\/_shared(\/|$)/,
    description: "Shared edge-function code is reused across many runtimes.",
  },
  {
    id: "sql-migrations",
    pattern: /^supabase\/migrations\/[^/]+\.sql$/,
    description:
      "SQL migrations alter live schemas and cannot be rolled back trivially.",
  },
  {
    id: "rls-policies",
    // Files whose name itself signals an RLS / policy edit. We keep the
    // pattern strict (anchored to filename) so generic words like
    // "policy" inside an unrelated component path do not over-flag.
    pattern: /(^|\/)(rls|policies)[^/]*\.(sql|ts)$/,
    description: "Row-Level-Security policy files guard tenant isolation.",
  },
] as const;

/** Task types whose mere presence flips the task into pending_review,
 *  regardless of which files were touched (or even if no files at all
 *  are touched, e.g. a pure deployment trigger). */
export const DEV_SENSITIVE_TASK_TYPES: ReadonlySet<string> = new Set([
  "DEPLOY.PROD",
]);

export interface DevPolicyMatch {
  readonly kind: "path" | "task_type";
  readonly ruleId: string;
  /** The matched path (kind=path) or task type (kind=task_type). */
  readonly subject: string;
  readonly description: string;
}

export interface DevPolicyDecision {
  /** `dev-sensitive` if any rule fired, `dev-default` otherwise. */
  readonly profile: "dev-default" | "dev-sensitive";
  readonly requiresReview: boolean;
  readonly matches: readonly DevPolicyMatch[];
  /** Compact, human-readable reason — safe to surface in the inbox row. */
  readonly reason: string | null;
}

export interface DevPolicyInput {
  taskType: string;
  changedPaths?: readonly string[] | null;
}

function normalisePath(p: string): string {
  // Strip leading "./" and any leading slashes; collapse backslashes.
  return p.replace(/^\.\//, "").replace(/^\/+/, "").replace(/\\/g, "/");
}

/** Pure evaluator — does no IO, safe to call from anywhere. */
export function evaluateDevPolicy(input: DevPolicyInput): DevPolicyDecision {
  const matches: DevPolicyMatch[] = [];

  const taskType = (input.taskType ?? "").trim();
  if (taskType && DEV_SENSITIVE_TASK_TYPES.has(taskType.toUpperCase())) {
    matches.push({
      kind: "task_type",
      ruleId: "sensitive-task-type",
      subject: taskType,
      description: `Task type ${taskType} is always reviewed.`,
    });
  }

  const paths = (input.changedPaths ?? []).filter(
    (p): p is string => typeof p === "string" && p.length > 0,
  );
  for (const raw of paths) {
    const path = normalisePath(raw);
    for (const rule of DEV_SENSITIVE_PATH_RULES) {
      if (rule.pattern.test(path)) {
        matches.push({
          kind: "path",
          ruleId: rule.id,
          subject: path,
          description: rule.description,
        });
      }
    }
  }

  if (matches.length === 0) {
    return {
      profile: "dev-default",
      requiresReview: false,
      matches: [],
      reason: null,
    };
  }

  // Build a stable, deduped reason summary for the inbox row.
  const ruleIds = Array.from(new Set(matches.map((m) => m.ruleId))).sort();
  const reason = `DEV_SENSITIVE: ${ruleIds.join(", ")}`;

  return {
    profile: "dev-sensitive",
    requiresReview: true,
    matches,
    reason,
  };
}

/** Shape of dispatch input the wrapper passes through. Loose on purpose
 *  so this stays decoupled from the Deno-only `dispatch.ts` typings. */
export interface DispatchInputLike {
  domain: string;
  taskType: string;
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  approvalPolicy?: string;
}

export interface ApplyDevPolicyResult<T extends DispatchInputLike> {
  /** The (possibly enriched) dispatch input. Identity-equal to the
   *  original when the policy did not fire. */
  input: T;
  decision: DevPolicyDecision;
  /** When `decision.requiresReview` is true, the wrapper MUST forward
   *  these RPC parameters to flip the new task into pending_review. */
  rpcOverrides: {
    requiresApproval?: boolean;
    status?: "pending_review";
    blockedReason?: string;
  };
}

/** Apply the dev policy to a dispatch input. No-op for any
 *  `domain !== 'code'` so the wrapper can call this unconditionally. */
export function applyDevPolicyToDispatchInput<T extends DispatchInputLike>(
  input: T,
): ApplyDevPolicyResult<T> {
  if (input.domain !== "code") {
    return {
      input,
      decision: {
        profile: "dev-default",
        requiresReview: false,
        matches: [],
        reason: null,
      },
      rpcOverrides: {},
    };
  }

  const rawPaths = (input.payload?.changed_paths ?? input.payload?.changedPaths) as
    | unknown
    | undefined;
  const changedPaths = Array.isArray(rawPaths)
    ? rawPaths.filter((p): p is string => typeof p === "string")
    : [];

  const decision = evaluateDevPolicy({
    taskType: input.taskType,
    changedPaths,
  });

  if (!decision.requiresReview) {
    return { input, decision, rpcOverrides: {} };
  }

  const summary = {
    profile: decision.profile,
    rules: Array.from(new Set(decision.matches.map((m) => m.ruleId))),
    matched_paths: decision.matches
      .filter((m) => m.kind === "path")
      .map((m) => m.subject),
    matched_task_types: decision.matches
      .filter((m) => m.kind === "task_type")
      .map((m) => m.subject),
    reason: decision.reason,
  };

  const enriched: T = {
    ...input,
    approvalPolicy: "single-admin",
    payload: {
      ...(input.payload ?? {}),
      dev_sensitive: summary,
    },
    metadata: {
      ...(input.metadata ?? {}),
      dev_sensitive: summary,
    },
  };

  return {
    input: enriched,
    decision,
    rpcOverrides: {
      requiresApproval: true,
      status: "pending_review",
      blockedReason: decision.reason ?? "DEV_SENSITIVE",
    },
  };
}
