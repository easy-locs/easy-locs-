import type { FullAuditReport } from "@/lib/data-quality/types";

let sweepInProgress = false;
let lastSweepEnd = 0;
let sweepCount = 0;
let totalSweepMs = 0;
let maxSweepMs = 0;
let overlapAttempts = 0;
let cooldownBlocks = 0;
let noopRuns = 0;
let consecutiveFailures = 0;
let circuitOpen = false;
let circuitOpenedAt = 0;
let loopDetectorCounter = 0;
let loopDetectorWindowStart = 0;

const COOLDOWN_MS = 5_000;
const CIRCUIT_BREAKER_THRESHOLD = 3;
const CIRCUIT_BREAKER_RESET_MS = 60_000;
const LOOP_DETECTOR_MAX_PER_WINDOW = 10;
const LOOP_DETECTOR_WINDOW_MS = 30_000;
const MAX_SWEEP_DURATION_MS = 10_000;

let lastEntityHash = "";

function computeEntityHash(report: FullAuditReport): string {
  const s = report.summary;
  return `${s.totalEntities}:${s.quarantined}:${s.autoFixed}:${Object.keys(s.byClassification).sort().map(k => `${k}=${s.byClassification[k as keyof typeof s.byClassification]}`).join(",")}`;
}

export function acquireSweepLock(): boolean {
  if (sweepInProgress) {
    overlapAttempts++;
    return false;
  }

  if (circuitOpen) {
    if (Date.now() - circuitOpenedAt > CIRCUIT_BREAKER_RESET_MS) {
      circuitOpen = false;
      consecutiveFailures = 0;
    } else {
      return false;
    }
  }

  const now = Date.now();
  if (now - lastSweepEnd < COOLDOWN_MS && sweepCount > 0) {
    cooldownBlocks++;
    return false;
  }

  if (now - loopDetectorWindowStart > LOOP_DETECTOR_WINDOW_MS) {
    loopDetectorCounter = 0;
    loopDetectorWindowStart = now;
  }
  loopDetectorCounter++;
  if (loopDetectorCounter > LOOP_DETECTOR_MAX_PER_WINDOW) {
    if (import.meta.env.DEV) {
      console.warn("[runtime-safety] Loop detected — too many sweeps in window, blocking");
    }
    circuitOpen = true;
    circuitOpenedAt = now;
    return false;
  }

  sweepInProgress = true;
  return true;
}

export function releaseSweepLock(report: FullAuditReport | null, durationMs: number, success: boolean): void {
  sweepInProgress = false;
  lastSweepEnd = Date.now();
  sweepCount++;
  totalSweepMs += durationMs;
  if (durationMs > maxSweepMs) maxSweepMs = durationMs;

  if (success) {
    consecutiveFailures = 0;
  } else {
    consecutiveFailures++;
    if (consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
      circuitOpen = true;
      circuitOpenedAt = Date.now();
      if (import.meta.env.DEV) {
        console.warn("[runtime-safety] Circuit breaker opened after", consecutiveFailures, "consecutive failures");
      }
    }
  }

  if (report) {
    const newHash = computeEntityHash(report);
    if (newHash === lastEntityHash) {
      noopRuns++;
    }
    lastEntityHash = newHash;
  }
}

export function isSweepInProgress(): boolean {
  return sweepInProgress;
}

export function shouldSkipIncrementalSweep(): boolean {
  if (sweepInProgress) return true;
  if (circuitOpen) {
    if (Date.now() - circuitOpenedAt > CIRCUIT_BREAKER_RESET_MS) {
      circuitOpen = false;
      consecutiveFailures = 0;
    } else {
      return true;
    }
  }
  const now = Date.now();
  if (now - lastSweepEnd < COOLDOWN_MS && sweepCount > 0) return true;
  return false;
}

export function getRuntimeSafetyMetrics() {
  return {
    sweepInProgress,
    sweepCount,
    totalSweepMs,
    averageSweepMs: sweepCount > 0 ? Math.round(totalSweepMs / sweepCount) : 0,
    maxSweepMs,
    overlapAttempts,
    cooldownBlocks,
    noopRuns,
    consecutiveFailures,
    circuitOpen,
    lastSweepEnd,
    lastEntityHash,
    loopDetectorCounter,
  };
}

export function resetCircuitBreaker(): void {
  circuitOpen = false;
  consecutiveFailures = 0;
  circuitOpenedAt = 0;
}

const registeredSingletons = new Set<string>();

export function registerSingleton(id: string): boolean {
  if (registeredSingletons.has(id)) return false;
  registeredSingletons.add(id);
  return true;
}

export function isSingletonRegistered(id: string): boolean {
  return registeredSingletons.has(id);
}

const eventDedupMap = new Map<string, number>();
const EVENT_DEDUP_WINDOW_MS = 500;

export function shouldProcessEvent(eventKey: string): boolean {
  const now = Date.now();
  const last = eventDedupMap.get(eventKey);
  if (last && now - last < EVENT_DEDUP_WINDOW_MS) return false;
  eventDedupMap.set(eventKey, now);
  if (eventDedupMap.size > 200) {
    const cutoff = now - EVENT_DEDUP_WINDOW_MS * 2;
    for (const [k, v] of eventDedupMap) {
      if (v < cutoff) eventDedupMap.delete(k);
    }
  }
  return true;
}

export interface FlowTimeout {
  timer: ReturnType<typeof setTimeout> | null;
  started: number;
}

export function startFlowTimeout(timeoutMs: number, onTimeout: () => void): FlowTimeout {
  const flow: FlowTimeout = { timer: null, started: Date.now() };
  flow.timer = setTimeout(() => {
    flow.timer = null;
    onTimeout();
  }, timeoutMs);
  return flow;
}

export function clearFlowTimeout(flow: FlowTimeout): void {
  if (flow.timer) {
    clearTimeout(flow.timer);
    flow.timer = null;
  }
}

export function boundedRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  backoffMs: number = 1000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    let attempt = 0;
    const tryOnce = async () => {
      try {
        resolve(await fn());
      } catch (err) {
        attempt++;
        if (attempt >= maxRetries) {
          reject(err);
        } else {
          setTimeout(tryOnce, backoffMs * Math.pow(2, attempt - 1));
        }
      }
    };
    tryOnce();
  });
}

export function safeProtectionCheck<T>(
  entities: T[],
  filterFn: (entities: T[]) => T[],
  fallbackBehavior: "show_all" | "show_none" = "show_all",
): T[] {
  try {
    return filterFn(entities);
  } catch {
    if (import.meta.env.DEV) {
      console.warn("[runtime-safety] Surface protection check failed, using fallback:", fallbackBehavior);
    }
    return fallbackBehavior === "show_all" ? entities : [];
  }
}

let convergenceTestActive = false;

export function isConvergenceTestActive(): boolean {
  return convergenceTestActive;
}

let stressTestResults: {
  runs: number;
  converged: boolean;
  convergenceRun: number;
  hashes: string[];
  duplicateWork: number;
  skippedRuns: number;
} | null = null;

export function runConvergenceProof(runFn: () => FullAuditReport, iterations: number = 5): typeof stressTestResults {
  const hashes: string[] = [];
  let converged = false;
  let convergenceRun = -1;
  let duplicateWork = 0;
  let skippedRuns = 0;

  const savedSweepInProgress = sweepInProgress;
  const savedLastSweepEnd = lastSweepEnd;
  const savedCircuitOpen = circuitOpen;

  convergenceTestActive = true;
  sweepInProgress = false;
  circuitOpen = false;
  lastSweepEnd = 0;

  try {
    for (let i = 0; i < iterations; i++) {
      sweepInProgress = false;
      lastSweepEnd = 0;

      const report = runFn();
      const hash = computeEntityHash(report);
      hashes.push(hash);

      if (i > 0 && hash === hashes[i - 1]) {
        if (!converged) {
          converged = true;
          convergenceRun = i;
        }
        duplicateWork++;
      }
    }
  } finally {
    convergenceTestActive = false;
    sweepInProgress = savedSweepInProgress;
    lastSweepEnd = savedLastSweepEnd;
    circuitOpen = savedCircuitOpen;
  }

  stressTestResults = { runs: iterations, converged, convergenceRun, hashes, duplicateWork, skippedRuns };
  return stressTestResults;
}

export function getStressTestResults() {
  return stressTestResults;
}
