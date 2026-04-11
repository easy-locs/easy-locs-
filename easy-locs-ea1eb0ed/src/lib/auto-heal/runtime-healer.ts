import { classifyError, shouldIgnore, shouldRetry, type ClassifiedError } from "./error-classifier";
import { captureException, addBreadcrumb } from "@/lib/analytics/sentry";

const MAX_RETRY = 3;
const RETRY_BASE_DELAY = 1000;
const ERROR_LOG_MAX = 200;
const DEDUP_WINDOW_MS = 5000;

interface HealerState {
  errorLog: ClassifiedError[];
  recentHashes: Map<string, number>;
  retryCounters: Map<string, number>;
  healActions: HealAction[];
}

interface HealAction {
  timestamp: number;
  errorMessage: string;
  severity: string;
  action: string;
  success: boolean;
}

const state: HealerState = {
  errorLog: [],
  recentHashes: new Map(),
  retryCounters: new Map(),
  healActions: [],
};

function hashError(msg: string): string {
  return msg.replace(/\d+/g, "N").substring(0, 100);
}

function isDuplicate(msg: string): boolean {
  const hash = hashError(msg);
  const lastSeen = state.recentHashes.get(hash);
  const now = Date.now();
  if (lastSeen && now - lastSeen < DEDUP_WINDOW_MS) return true;
  state.recentHashes.set(hash, now);
  if (state.recentHashes.size > 500) {
    const newest = [...state.recentHashes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 250);
    state.recentHashes = new Map(newest);
  }
  return false;
}

export function healError(error: unknown): ClassifiedError {
  const classified = classifyError(error);

  if (shouldIgnore(classified)) return classified;
  if (isDuplicate(classified.message)) return classified;

  state.errorLog.push(classified);
  if (state.errorLog.length > ERROR_LOG_MAX) {
    state.errorLog = state.errorLog.slice(-ERROR_LOG_MAX);
  }

  addBreadcrumb("auto-heal", `[${classified.severity}/${classified.domain}] ${classified.message}`);

  switch (classified.severity) {
    case "critical":
      handleCritical(classified);
      break;
    case "medium":
      handleMedium(classified);
      break;
    case "minor":
      break;
  }

  return classified;
}

function handleCritical(classified: ClassifiedError) {
  captureException(classified.originalError, {
    autoHeal: true,
    severity: classified.severity,
    domain: classified.domain,
    action: classified.action,
  });

  logHealAction(classified, "critical_captured", true);
}

function handleMedium(classified: ClassifiedError) {
  if (import.meta.env.DEV) {
    console.warn(`[AutoHeal] Medium: ${classified.domain} — ${classified.message}`);
  }
  logHealAction(classified, "medium_logged", true);
}

function logHealAction(classified: ClassifiedError, action: string, success: boolean) {
  state.healActions.push({
    timestamp: Date.now(),
    errorMessage: classified.message.substring(0, 200),
    severity: classified.severity,
    action,
    success,
  });
  if (state.healActions.length > 100) {
    state.healActions = state.healActions.slice(-100);
  }
}

export async function withAutoRetry<T>(
  fn: () => Promise<T>,
  label: string,
  options: { maxRetries?: number; fallback?: T } = {},
): Promise<T> {
  const maxRetries = options.maxRetries ?? MAX_RETRY;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const classified = classifyError(err);

      if (attempt === maxRetries || !shouldRetry(classified)) {
        healError(err);
        if (options.fallback !== undefined) return options.fallback;
        throw err;
      }

      const delay = RETRY_BASE_DELAY * Math.pow(2, attempt);
      await new Promise(r => setTimeout(r, delay));
    }
  }

  throw new Error(`[AutoHeal] ${label}: max retries exceeded`);
}

export function getHealerReport() {
  const now = Date.now();
  const last5min = state.errorLog.filter(e => now - e.timestamp < 300_000);
  const criticalCount = last5min.filter(e => e.severity === "critical").length;
  const mediumCount = last5min.filter(e => e.severity === "medium").length;

  return {
    status: criticalCount > 5 ? "unhealthy" as const : criticalCount > 0 ? "degraded" as const : "healthy" as const,
    last5min: { total: last5min.length, critical: criticalCount, medium: mediumCount },
    totalLogged: state.errorLog.length,
    recentActions: state.healActions.slice(-10),
  };
}

export function installGlobalHealer() {
  if (typeof window === "undefined") return;

  window.addEventListener("error", (event) => {
    healError(event.error || event.message);
  });

  window.addEventListener("unhandledrejection", (event) => {
    healError(event.reason);
  });
}
