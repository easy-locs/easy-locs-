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

interface EngineRunResult {
  summary: string;
  rowsAffected: number;
  metadata?: Record<string, unknown>;
}

type ModuleName =
  | "orbit" | "wallet" | "scanner" | "checkout" | "radar"
  | "delivery" | "deep_scrape" | "publish_pipeline"
  | "notifications" | "realtime" | "chat" | "payments";

export async function monitoredEngineRun<T extends EngineRunResult>(params: {
  engineName: string;
  category: string;
  module: ModuleName;
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

      captureDinoError(`Engine ${params.engineName} failed: ${result.errorMessage}`, {
        engine: params.engineName,
        category: params.category,
        module: params.module,
        duration: latency,
      });
    }

    return null;
  } catch (error: unknown) {
    const latency = Date.now() - start;
    const message = error instanceof Error ? error.message : String(error);
    await reportModuleHealth(params.module, "error", latency, message);
    await incrementErrorCount(params.module);
    captureException(error, { engine: params.engineName });
    return null;
  }
}

const HTTP_ERROR_NOISE = [
  "HTTP Client Error",
  "Failed to fetch",
  "Load failed",
  "NetworkError",
  "AbortError",
  "The operation was aborted",
  "net::ERR_",
  "ResizeObserver loop",
];

function isNoiseError(msg: string): boolean {
  return HTTP_ERROR_NOISE.some((p) => msg.includes(p));
}

export function initUnifiedMonitoring() {
  initSentry();

  const origOnError = window.onerror;
  window.onerror = (msg, source, line, col, error) => {
    const message = typeof msg === "string" ? msg : error?.message || "";
    if (isNoiseError(message)) {
      origOnError?.call(window, msg, source, line, col, error);
      return;
    }
    captureException(error ?? msg, { source: source ?? "", line, col });
    origOnError?.call(window, msg, source, line, col, error);
  };

  const origOnUnhandled = window.onunhandledrejection;
  window.onunhandledrejection = (event) => {
    const message = event.reason?.message || String(event.reason || "");
    if (isNoiseError(message)) {
      if (typeof origOnUnhandled === "function") origOnUnhandled.call(window, event);
      return;
    }
    captureException(event.reason, { type: "unhandledrejection" });
    if (typeof origOnUnhandled === "function") origOnUnhandled.call(window, event);
  };

  console.info("[monitor] Unified monitoring initialized");
}
