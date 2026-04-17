/**
 * post-deploy health-check + auto-rollback hook — LC6 (task #877).
 *
 * Polls a deployed app for up to 5 minutes after `deploy.prod` settles
 * succeeded. If `/api/health` (or any caller-supplied path) does not
 * report healthy within the watch window, this module drives the
 * `revert_pr` rollback strategy via `system.request_rollback` so the
 * production branch is reverted by a NEW commit (no force-push).
 *
 * Design notes:
 *   - Pure orchestration. The HTTP fetcher AND the rollback dispatcher
 *     are injected so unit tests can stub both without spinning up a
 *     real server or a database.
 *   - Auto-rollback fires ONLY when:
 *       (a) the deploy task has `rollback_strategy = 'auto' | 'manual'`,
 *       (b) the task carries metadata `{ rollback_strategy_name: 'revert_pr' }`
 *           (mirroring the row in `system.rollback_strategies`), and
 *       (c) the health check fails (any combination of HTTP error / non-2xx
 *           / `body.status !== 'ok'`) for `failureThreshold` consecutive
 *           samples within `windowMs`.
 *   - The hook itself does NOT mutate `execution_tasks`. It calls the
 *     supplied dispatcher (typically `system.request_rollback`) and lets
 *     the orchestrator's existing rollback path drive the lifecycle.
 *     Per LC6 critical-constraint #3: every rollback execution is its own
 *     `execution_tasks` row with full audit.
 */

export const HEALTH_CHECK_DEFAULTS = {
  windowMs: 5 * 60_000,
  intervalMs: 15_000,
  /** Per-request timeout. */
  requestTimeoutMs: 10_000,
  failureThreshold: 3,
  healthPath: "/api/health",
} as const;

export interface HealthCheckOptions {
  url: string;
  healthPath?: string;
  windowMs?: number;
  intervalMs?: number;
  requestTimeoutMs?: number;
  /** Number of consecutive failed samples before declaring unhealthy. */
  failureThreshold?: number;
  /** Injected fetcher (defaults to global fetch). */
  fetcher?: (url: string, init?: { signal?: AbortSignal }) => Promise<{ ok: boolean; status: number; bodyText: string }>;
  /** Injected clock (returns ms since epoch). Tests can advance freely. */
  now?: () => number;
  /** Injected sleeper. Tests can resolve immediately. */
  sleep?: (ms: number) => Promise<void>;
}

export interface HealthSample {
  ts: number;
  ok: boolean;
  httpStatus: number | null;
  /** Reason for an unhealthy sample (empty when ok). */
  reason: string;
}

export interface HealthCheckResult {
  healthy: boolean;
  samples: HealthSample[];
  /** Total wall-clock duration in ms. */
  durationMs: number;
  /** Number of consecutive failures observed at the moment we exited. */
  consecutiveFailures: number;
  /** Why the health check exited (`ok` | `threshold_exceeded` | `window_elapsed`). */
  exitReason: "ok" | "threshold_exceeded" | "window_elapsed";
}

const DEFAULT_FETCHER: NonNullable<HealthCheckOptions["fetcher"]> = async (url, init) => {
  const res = await fetch(url, init);
  const bodyText = await res.text().catch(() => "");
  return { ok: res.ok, status: res.status, bodyText };
};

function parseHealthBody(bodyText: string): { ok: boolean; reason: string } {
  if (!bodyText) return { ok: true, reason: "" };
  try {
    const parsed = JSON.parse(bodyText) as Record<string, unknown>;
    const status = parsed.status;
    if (typeof status === "string" && status.toLowerCase() !== "ok" && status.toLowerCase() !== "healthy") {
      return { ok: false, reason: `body.status=${status}` };
    }
    return { ok: true, reason: "" };
  } catch {
    return { ok: true, reason: "" };
  }
}

/**
 * Poll the deployed app's `/api/health` until either it stabilises healthy
 * OR the watch window elapses with `failureThreshold` consecutive
 * failures. Always returns — never throws.
 */
export async function runPostDeployHealthCheck(
  opts: HealthCheckOptions,
): Promise<HealthCheckResult> {
  const url = opts.url.replace(/\/+$/, "") + (opts.healthPath ?? HEALTH_CHECK_DEFAULTS.healthPath);
  const windowMs = opts.windowMs ?? HEALTH_CHECK_DEFAULTS.windowMs;
  const intervalMs = opts.intervalMs ?? HEALTH_CHECK_DEFAULTS.intervalMs;
  const requestTimeoutMs = opts.requestTimeoutMs ?? HEALTH_CHECK_DEFAULTS.requestTimeoutMs;
  const failureThreshold = opts.failureThreshold ?? HEALTH_CHECK_DEFAULTS.failureThreshold;
  const fetcher = opts.fetcher ?? DEFAULT_FETCHER;
  const now = opts.now ?? (() => Date.now());
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));

  const startedAt = now();
  const samples: HealthSample[] = [];
  let consecutiveFailures = 0;

  while (now() - startedAt < windowMs) {
    const ts = now();
    let sample: HealthSample;
    try {
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), requestTimeoutMs);
      try {
        const res = await fetcher(url, { signal: ac.signal });
        const httpOk = res.ok;
        const body = parseHealthBody(res.bodyText);
        const ok = httpOk && body.ok;
        sample = {
          ts,
          ok,
          httpStatus: res.status,
          reason: ok ? "" : (httpOk ? body.reason : `http_status=${res.status}`),
        };
      } finally {
        clearTimeout(timer);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      sample = { ts, ok: false, httpStatus: null, reason: `fetch_threw:${message}` };
    }

    samples.push(sample);
    if (sample.ok) {
      // First green sample exits early — production is up.
      return {
        healthy: true,
        samples,
        durationMs: now() - startedAt,
        consecutiveFailures: 0,
        exitReason: "ok",
      };
    }

    consecutiveFailures += 1;
    if (consecutiveFailures >= failureThreshold) {
      return {
        healthy: false,
        samples,
        durationMs: now() - startedAt,
        consecutiveFailures,
        exitReason: "threshold_exceeded",
      };
    }

    if (now() - startedAt + intervalMs >= windowMs) break;
    await sleep(intervalMs);
  }

  return {
    healthy: false,
    samples,
    durationMs: now() - startedAt,
    consecutiveFailures,
    exitReason: "window_elapsed",
  };
}

// ── Auto-rollback dispatch glue ──────────────────────────────────────────

export interface RollbackDispatcher {
  /**
   * Triggers `system.request_rollback` (or an equivalent) with the
   * named strategy. Returns the rollback execution_task id when one
   * is created, or null when the dispatcher refused (e.g. the task
   * already settled).
   */
  requestRollback(args: {
    /** Parent deploy task id. The new rollback row sets parent_task_id=taskId. */
    taskId: string;
    reason: string;
    strategySlug: string;
    metadata: Record<string, unknown>;
    /**
     * Payload for the newly-inserted child rollback execution_tasks row
     * (LC6 #877 — new-row lifecycle / audit). The child adapter
     * (`deploy.prod.rollback`) reads it to drive `executeRevertPr`.
     * When omitted, the dispatcher uses a minimal payload containing
     * just `reason` + `parent_task_id`.
     */
    childPayload?: Record<string, unknown>;
  }): Promise<{ rollbackTaskId: string | null }>;
}

export interface AutoRollbackContext {
  taskId: string;
  /** Mirrors `execution_tasks.rollback_strategy`. */
  rollbackStrategy: "auto" | "manual" | "none";
  /** Mirrors `metadata.rollback_strategy_name` (e.g. `revert_pr`). */
  rollbackStrategyName: string | null;
  /** Mirrors `execution_tasks.metadata` (passed through to the dispatcher). */
  metadata: Record<string, unknown>;
}

export interface AutoRollbackOutcome {
  triggered: boolean;
  /** Why rollback did not fire (when `triggered=false`). */
  skippedReason: string | null;
  rollbackTaskId: string | null;
  health: HealthCheckResult;
}

/**
 * High-level hook called from the `deploy.prod` post-execute path. Runs
 * the health check; on failure AND when the task opted in to a named
 * rollback strategy (`revert_pr`), dispatches the rollback through the
 * supplied `RollbackDispatcher`.
 */
export async function maybeAutoRollbackAfterDeploy(args: {
  ctx: AutoRollbackContext;
  health: HealthCheckOptions;
  dispatcher: RollbackDispatcher;
  allowedStrategies?: string[];
}): Promise<AutoRollbackOutcome> {
  const allowed = new Set(args.allowedStrategies ?? ["revert_pr"]);
  const result = await runPostDeployHealthCheck(args.health);
  if (result.healthy) {
    return { triggered: false, skippedReason: "healthy", rollbackTaskId: null, health: result };
  }
  if (args.ctx.rollbackStrategy === "none") {
    return {
      triggered: false,
      skippedReason: "rollback_strategy=none",
      rollbackTaskId: null,
      health: result,
    };
  }
  const slug = args.ctx.rollbackStrategyName;
  if (!slug || !allowed.has(slug)) {
    return {
      triggered: false,
      skippedReason: `strategy_not_allowed:${slug ?? "null"}`,
      rollbackTaskId: null,
      health: result,
    };
  }

  const reason = `LC6 auto-rollback: post-deploy health check ${result.exitReason} ` +
    `after ${Math.round(result.durationMs / 1000)}s ` +
    `(${result.consecutiveFailures} consecutive failures)`;

  const dispatch = await args.dispatcher.requestRollback({
    taskId: args.ctx.taskId,
    reason,
    strategySlug: slug,
    metadata: { ...args.ctx.metadata, lc6_health: result },
  });
  return {
    triggered: true,
    skippedReason: null,
    rollbackTaskId: dispatch.rollbackTaskId,
    health: result,
  };
}
