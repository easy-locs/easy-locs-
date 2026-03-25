/**
 * Unified Monitor — Connects Sentry, module_health, and engine_run_logs
 * into a single observability layer.
 * 
 * Modes:
 *   MODE 1 — Observe: sees everything, changes nothing
 *   MODE 2 — Safe Auto: retries, timeouts, guards, fallback UI, data cleanup
 *   MODE 3 — Controlled Full Auto: patch, test, deploy if guard-fous OK
 */
import { initSentry, captureException, captureDinoError } from "@/lib/analytics/sentry";
import { reportModuleHealth, incrementErrorCount } from "@/lib/engines/module-health-reporter";
import { logEngineRun } from "@/lib/engines/engine-logger";

export type RepairMode = "observe" | "safe_auto" | "controlled_full_auto";

let currentMode: RepairMode = "safe_auto";

export function setRepairMode(mode: RepairMode) {
  currentMode = mode;
  console.info(`[monitor] Repair mode set to: ${mode}`);
}

export function getRepairMode() {
  return currentMode;
}

/**
 * Wrap any engine execution with full observability:
 * - Logs to engine_run_logs
 * - Reports to module_health
 * - Captures exceptions in Sentry
 */
export async function monitoredEngineRun<T extends { summary: string; rowsAffected: number; metadata?: Record<string, any> }>(params: {
  engineName: string;
  category: string;
  module: "orbit" | "wallet" | "scanner" | "checkout" | "radar" | "delivery" | "deep_scrape" | "publish_pipeline" | "notifications" | "realtime" | "chat" | "payments";
  fn: () => Promise<T>;
}): Promise<T | null> {
  const start = Date.now();

  try {
    const result = await logEngineRun({
      engineName: params.engineName,
      category: params.category,
      fn: async () => {
        const r = await params.fn();
        return { summary: r.summary, rowsAffected: r.rowsAffected, metadata: r.metadata };
      },
    });

    const latency = Date.now() - start;
    
    if (result.status === "ok") {
      await reportModuleHealth(params.module, "ok", latency);
    } else {
      await reportModuleHealth(params.module, "error", latency, result.errorMessage);
      await incrementErrorCount(params.module);
      
      // Sentry capture
      captureDinoError(`Engine ${params.engineName} failed: ${result.errorMessage}`, {
        engine: params.engineName,
        category: params.category,
        module: params.module,
        duration: latency,
      });
    }

    return null; // result is logged, not returned directly
  } catch (e: any) {
    const latency = Date.now() - start;
    await reportModuleHealth(params.module, "error", latency, e?.message);
    await incrementErrorCount(params.module);
    captureException(e, { engine: params.engineName });
    return null;
  }
}

/**
 * Initialize unified monitoring stack
 */
export function initUnifiedMonitoring() {
  // 1. Sentry (no-op if DSN missing)
  initSentry();

  // 2. Global error handler → Sentry + module_health
  const origOnError = window.onerror;
  window.onerror = (msg, source, line, col, error) => {
    captureException(error ?? msg, { source: source ?? "", line, col });
    origOnError?.call(window, msg, source, line, col, error);
  };

  const origOnUnhandled = window.onunhandledrejection;
  window.onunhandledrejection = (event) => {
    captureException(event.reason, { type: "unhandledrejection" });
    if (typeof origOnUnhandled === "function") origOnUnhandled.call(window, event);
  };

  console.info("[monitor] Unified monitoring initialized (mode: safe_auto)");
}
