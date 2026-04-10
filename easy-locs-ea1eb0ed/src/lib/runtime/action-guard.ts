/**
 * action-guard.ts — Wraps async user actions with telemetry, timeout, and incident logging.
 */
import {
  getBrowserRuntimeSessionId,
  pushBrowserFrontIncident,
  pushBrowserTelemetry,
} from "@/lib/runtime/browser-telemetry";

export interface GuardedActionOptions {
  userId?: string | null;
  orgId?: string | null;
  routeKey?: string | null;
  componentKey?: string | null;
  flowKey?: string | null;
  actionKey: string;
  timeoutMs?: number;
  slowMs?: number;
  deadClickTitle?: string;
}

export async function runGuardedAction<T>(
  fn: () => Promise<T>,
  options: GuardedActionOptions,
): Promise<T> {
  const startedAt = performance.now();
  const sessionId = getBrowserRuntimeSessionId();
  const timeoutMs = options.timeoutMs ?? 12000;
  const slowMs = options.slowMs ?? 2500;

  pushBrowserTelemetry({
    sessionId,
    userId: options.userId,
    orgId: options.orgId,
    routeKey: options.routeKey,
    componentKey: options.componentKey,
    flowKey: options.flowKey,
    eventType: "action_started",
    severity: "info",
    actionKey: options.actionKey,
  });

  let slowReported = false;

  const slowHandle = setTimeout(() => {
    slowReported = true;
    pushBrowserTelemetry({
      sessionId,
      userId: options.userId,
      routeKey: options.routeKey,
      componentKey: options.componentKey,
      flowKey: options.flowKey,
      eventType: "ui_warning",
      severity: "warning",
      actionKey: options.actionKey,
      message: "Action is slow",
      durationMs: Math.round(performance.now() - startedAt),
      metadata: { thresholdMs: slowMs },
    });
  }, slowMs);

  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`Action timeout: ${options.actionKey}`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([fn(), timeoutPromise]);
    clearTimeout(slowHandle);
    if (timeoutHandle) clearTimeout(timeoutHandle);

    pushBrowserTelemetry({
      sessionId,
      userId: options.userId,
      routeKey: options.routeKey,
      componentKey: options.componentKey,
      flowKey: options.flowKey,
      eventType: "action_success",
      severity: slowReported ? "warning" : "info",
      actionKey: options.actionKey,
      durationMs: Math.round(performance.now() - startedAt),
      status: "ok",
    });

    return result as T;
  } catch (err: any) {
    clearTimeout(slowHandle);
    if (timeoutHandle) clearTimeout(timeoutHandle);

    const isTimeout = String(err?.message ?? "").toLowerCase().includes("timeout");

    pushBrowserTelemetry({
      sessionId,
      userId: options.userId,
      routeKey: options.routeKey,
      componentKey: options.componentKey,
      flowKey: options.flowKey,
      eventType: isTimeout ? "action_timeout" : "action_failed",
      severity: isTimeout ? "critical" : "warning",
      actionKey: options.actionKey,
      durationMs: Math.round(performance.now() - startedAt),
      message: err?.message ?? "Unknown action error",
      errorStack: err?.stack ?? null,
      status: "error",
    });

    pushBrowserFrontIncident({
      sessionId,
      userId: options.userId,
      routeKey: options.routeKey,
      componentKey: options.componentKey,
      flowKey: options.flowKey,
      issueType: isTimeout ? "action_timeout" : "action_failed",
      severity: isTimeout ? "critical" : "warning",
      title: options.deadClickTitle ?? `Action failed: ${options.actionKey}`,
      summary: err?.message ?? "Unknown action error",
      metadata: {
        actionKey: options.actionKey,
        durationMs: Math.round(performance.now() - startedAt),
      },
    });

    throw err;
  }
}
