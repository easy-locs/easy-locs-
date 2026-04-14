import { platformBus } from "@/lib/shared/platform-bus";

export type PathType = "fast" | "heavy";

export interface DomainLatencyBudget {
  domain: string;
  fastPathBudgetMs: number;
  heavyPathThresholdMs: number;
  degradeOnBudgetExceeded: boolean;
  heavyPathQueue: string;
}

export interface PathDecision {
  path: PathType;
  budgetMs: number;
  elapsed?: number;
  degraded: boolean;
  deferredToQueue?: string;
}

const DOMAIN_BUDGETS: Record<string, DomainLatencyBudget> = {
  message_send: {
    domain: "orbit",
    fastPathBudgetMs: 200,
    heavyPathThresholdMs: 100,
    degradeOnBudgetExceeded: true,
    heavyPathQueue: "orbit:heavy",
  },
  payment: {
    domain: "wallet",
    fastPathBudgetMs: 500,
    heavyPathThresholdMs: 300,
    degradeOnBudgetExceeded: true,
    heavyPathQueue: "wallet:heavy",
  },
  booking: {
    domain: "booking",
    fastPathBudgetMs: 400,
    heavyPathThresholdMs: 250,
    degradeOnBudgetExceeded: true,
    heavyPathQueue: "booking:heavy",
  },
  file_upload: {
    domain: "media",
    fastPathBudgetMs: 300,
    heavyPathThresholdMs: 150,
    degradeOnBudgetExceeded: false,
    heavyPathQueue: "media:heavy",
  },
  auth_session: {
    domain: "auth",
    fastPathBudgetMs: 150,
    heavyPathThresholdMs: 80,
    degradeOnBudgetExceeded: true,
    heavyPathQueue: "auth:heavy",
  },
  dashboard_bootstrap: {
    domain: "dashboard",
    fastPathBudgetMs: 600,
    heavyPathThresholdMs: 400,
    degradeOnBudgetExceeded: false,
    heavyPathQueue: "dashboard:heavy",
  },
  food_order: {
    domain: "food",
    fastPathBudgetMs: 350,
    heavyPathThresholdMs: 200,
    degradeOnBudgetExceeded: true,
    heavyPathQueue: "food:heavy",
  },
  notification: {
    domain: "notification",
    fastPathBudgetMs: 100,
    heavyPathThresholdMs: 50,
    degradeOnBudgetExceeded: false,
    heavyPathQueue: "notification:heavy",
  },
};

type HeavyPathEnqueuer = (queue: string, flow: string, context?: Record<string, unknown>) => void;
let heavyPathEnqueuer: HeavyPathEnqueuer | null = null;

export function setHeavyPathEnqueuer(enqueuer: HeavyPathEnqueuer): void {
  heavyPathEnqueuer = enqueuer;
}

const pathMetrics = new Map<string, { fastCount: number; heavyCount: number; budgetExceeded: number; totalLatencyMs: number }>();

function getOrCreateMetrics(flow: string) {
  let m = pathMetrics.get(flow);
  if (!m) {
    m = { fastCount: 0, heavyCount: 0, budgetExceeded: 0, totalLatencyMs: 0 };
    pathMetrics.set(flow, m);
  }
  return m;
}

export function getDomainBudget(flow: string): DomainLatencyBudget | undefined {
  return DOMAIN_BUDGETS[flow];
}

export function getAllDomainBudgets(): Record<string, DomainLatencyBudget> {
  return { ...DOMAIN_BUDGETS };
}

export type FastPathResult<T> =
  | { ok: true; result: T; decision: PathDecision }
  | { ok: false; result: undefined; decision: PathDecision };

export async function executeFastPath<T>(
  flow: string,
  fastFn: () => Promise<T>,
  heavyFn?: () => Promise<void>,
): Promise<FastPathResult<T>> {
  const budget = DOMAIN_BUDGETS[flow];
  const budgetMs = budget?.fastPathBudgetMs ?? 500;
  const metrics = getOrCreateMetrics(flow);

  const start = performance.now();
  const fastPromise = fastFn();

  let raceResult: { tag: "done"; value: T } | { tag: "timeout" } | { tag: "error"; error: unknown };
  try {
    raceResult = await Promise.race([
      fastPromise.then((r) => ({ tag: "done" as const, value: r })),
      new Promise<{ tag: "timeout" }>((resolve) =>
        setTimeout(() => resolve({ tag: "timeout" }), budgetMs)
      ),
    ]);
  } catch (err: unknown) {
    raceResult = { tag: "error", error: err };
  }

  const elapsed = performance.now() - start;

  if (raceResult.tag === "done") {
    metrics.fastCount++;
    metrics.totalLatencyMs += elapsed;

    if (heavyFn) {
      queueMicrotask(() => {
        heavyFn().catch((err: unknown) => {
          platformBus.emit("runtime:heavy_path_error", {
            flow,
            error: err instanceof Error ? err.message : String(err),
          }, "system");
        });
      });
    }

    return {
      ok: true,
      result: raceResult.value,
      decision: { path: "fast", budgetMs, elapsed, degraded: false },
    };
  }

  if (raceResult.tag === "error") {
    metrics.budgetExceeded++;
    metrics.totalLatencyMs += elapsed;
    return {
      ok: false,
      result: undefined,
      decision: {
        path: "fast",
        budgetMs,
        elapsed,
        degraded: false,
      },
    };
  }

  metrics.budgetExceeded++;
  metrics.heavyCount++;
  platformBus.emit("runtime:budget_exceeded", {
    flow,
    budgetMs,
    elapsed,
    domain: budget?.domain,
  }, "system");

  if (heavyPathEnqueuer && budget?.heavyPathQueue) {
    try {
      heavyPathEnqueuer(budget.heavyPathQueue, flow, { budgetMs, elapsed, degraded: true });
    } catch (enqueueErr: unknown) {
      platformBus.emit("runtime:heavy_enqueue_error", {
        flow,
        queue: budget.heavyPathQueue,
        error: enqueueErr instanceof Error ? enqueueErr.message : String(enqueueErr),
      }, "system");
    }
  }

  fastPromise.catch((err: unknown) => {
    platformBus.emit("runtime:deferred_promise_error", {
      flow,
      error: err instanceof Error ? err.message : String(err),
    }, "system");
  });

  return {
    ok: false,
    result: undefined,
    decision: {
      path: "heavy",
      budgetMs,
      elapsed,
      degraded: true,
      deferredToQueue: budget?.heavyPathQueue,
    },
  };
}

export function classifyPath(flow: string, estimatedLatencyMs: number): PathType {
  const budget = DOMAIN_BUDGETS[flow];
  if (!budget) return estimatedLatencyMs > 200 ? "heavy" : "fast";
  return estimatedLatencyMs <= budget.heavyPathThresholdMs ? "fast" : "heavy";
}

export function getPathMetrics(): Record<string, { fastCount: number; heavyCount: number; budgetExceeded: number; avgLatencyMs: number }> {
  const result: Record<string, { fastCount: number; heavyCount: number; budgetExceeded: number; avgLatencyMs: number }> = {};
  for (const [flow, m] of pathMetrics) {
    const total = m.fastCount + m.heavyCount;
    result[flow] = {
      ...m,
      avgLatencyMs: total > 0 ? Math.round(m.totalLatencyMs / total) : 0,
    };
  }
  return result;
}

export function resetPathMetrics(): void {
  pathMetrics.clear();
}

export const HEAVY_PATH_OPERATIONS = [
  "enrichment",
  "fan_out_notifications",
  "media_processing",
  "ai_scoring",
  "analytics_aggregation",
  "search_index_update",
  "recommendation_recompute",
  "report_generation",
  "bulk_email",
  "data_export",
] as const;

export function isHeavyOperation(operation: string): boolean {
  return (HEAVY_PATH_OPERATIONS as readonly string[]).includes(operation);
}
