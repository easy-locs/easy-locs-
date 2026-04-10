/**
 * RUNTIME GUARDS — Anti-KO enforcement for critical actions.
 *
 * Provides:
 * - Idempotency guard (requestId dedup)
 * - Correlation tracking
 * - Structured logging
 * - Single-path enforcement
 *
 * Usage:
 *   const guard = createActionGuard("wallet.transfer");
 *   const result = await guard.execute(async (ctx) => {
 *     // ctx.correlationId, ctx.requestId available
 *     return await doTransfer(ctx);
 *   });
 */

// ── Idempotency Registry ──
const processedRequests = new Map<string, { at: number; result: any }>();
const MAX_REGISTRY = 5000;
const DEDUP_WINDOW_MS = 5000;

function cleanRegistry() {
  if (processedRequests.size <= MAX_REGISTRY) return;
  const cutoff = Date.now() - 60_000;
  for (const [key, val] of processedRequests) {
    if (val.at < cutoff) processedRequests.delete(key);
  }
}

// ── Structured Logger ──
export interface StructuredLog {
  domain: string;
  action: string;
  correlationId: string;
  requestId: string;
  status: "started" | "success" | "failed" | "deduplicated";
  duration?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

const logBuffer: StructuredLog[] = [];
const MAX_LOG_BUFFER = 1000;

function pushLog(entry: StructuredLog) {
  logBuffer.push(entry);
  if (logBuffer.length > MAX_LOG_BUFFER) logBuffer.splice(0, 200);

  if (import.meta.env.DEV) {
    const prefix = `[${entry.domain}:${entry.action}]`;
    if (entry.status === "failed") {
      console.warn(`${prefix} FAILED (${entry.duration}ms): ${entry.error}`, entry.correlationId);
    } else if (entry.status === "deduplicated") {
      console.debug(`${prefix} DEDUP: ${entry.requestId}`);
    } else {
      console.debug(`${prefix} ${entry.status} (${entry.duration ?? 0}ms)`, entry.correlationId);
    }
  }
}

export function getStructuredLogs(): readonly StructuredLog[] {
  return logBuffer;
}

export function clearStructuredLogs(): void {
  logBuffer.length = 0;
}

// ── Action Context ──
export interface ActionContext {
  requestId: string;
  correlationId: string;
  domain: string;
  action: string;
  retryCount: number;
}

// ── Action Guard ──
export interface ActionGuardResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
  deduplicated?: boolean;
  correlationId: string;
  requestId: string;
}

export interface ActionGuardOptions {
  /** Custom requestId for dedup (default: auto-generated) */
  requestId?: string;
  /** Custom correlationId for tracing (default: auto-generated) */
  correlationId?: string;
  /** Dedup window in ms (default: 5000) */
  dedupWindowMs?: number;
  /** Extra metadata for logging */
  metadata?: Record<string, unknown>;
}

export function createActionGuard(domainAction: string) {
  const [domain, ...rest] = domainAction.split(".");
  const action = rest.join(".") || domainAction;

  return {
    async execute<T>(
      fn: (ctx: ActionContext) => Promise<T>,
      options?: ActionGuardOptions
    ): Promise<ActionGuardResult<T>> {
      const requestId = options?.requestId ?? crypto.randomUUID();
      const correlationId = options?.correlationId ?? crypto.randomUUID();
      const dedupWindow = options?.dedupWindowMs ?? DEDUP_WINDOW_MS;

      // ── Idempotency check ──
      const existing = processedRequests.get(requestId);
      if (existing && Date.now() - existing.at < dedupWindow) {
        pushLog({
          domain, action, correlationId, requestId,
          status: "deduplicated", metadata: options?.metadata,
        });
        return {
          ok: true,
          data: existing.result,
          deduplicated: true,
          correlationId,
          requestId,
        };
      }

      const ctx: ActionContext = { requestId, correlationId, domain, action, retryCount: 0 };
      const startedAt = Date.now();

      pushLog({
        domain, action, correlationId, requestId,
        status: "started", metadata: options?.metadata,
      });

      try {
        const result = await fn(ctx);

        processedRequests.set(requestId, { at: Date.now(), result });
        cleanRegistry();

        pushLog({
          domain, action, correlationId, requestId,
          status: "success", duration: Date.now() - startedAt,
          metadata: options?.metadata,
        });

        return { ok: true, data: result, correlationId, requestId };
      } catch (err: any) {
        const errorMsg = err?.message || String(err);

        pushLog({
          domain, action, correlationId, requestId,
          status: "failed", duration: Date.now() - startedAt,
          error: errorMsg, metadata: options?.metadata,
        });

        return { ok: false, error: errorMsg, correlationId, requestId };
      }
    },
  };
}

// ── Single-path enforcement ──
const activeFlows = new Set<string>();

/**
 * Ensures only one execution of a given flow key at a time.
 * Returns a release function, or null if already active (reject).
 */
export function acquireSinglePath(flowKey: string): (() => void) | null {
  if (activeFlows.has(flowKey)) return null;
  activeFlows.add(flowKey);
  return () => activeFlows.delete(flowKey);
}

/**
 * Check if a flow is currently active.
 */
export function isFlowLocked(flowKey: string): boolean {
  return activeFlows.has(flowKey);
}
