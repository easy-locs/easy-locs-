export interface BootStage {
  name: string;
  phase: "critical" | "interactive" | "background";
  targetMs: number;
  tasks: BootTask[];
}

export interface BootTask {
  name: string;
  priority: number;
  execute: () => Promise<void> | void;
  condition?: () => boolean;
}

export interface BootMetrics {
  totalMs: number;
  stages: Record<string, { startMs: number; endMs: number; durationMs: number }>;
  tasks: Record<string, { durationMs: number; skipped: boolean }>;
  connectionType: string;
}

export function getConnectionQuality(): "fast" | "medium" | "slow" | "offline" {
  if (typeof navigator === "undefined") return "fast";
  if (!navigator.onLine) return "offline";

  const conn = (navigator as any).connection;
  if (!conn) return "fast";

  const effectiveType = conn.effectiveType;
  if (effectiveType === "4g" && !conn.saveData) return "fast";
  if (effectiveType === "3g") return "medium";
  return "slow";
}

export function shouldSkipHeavyAsset(assetType: "threejs" | "mapbox" | "leaflet" | "charts"): boolean {
  const quality = getConnectionQuality();
  if (quality === "offline" || quality === "slow") return true;
  if (quality === "medium" && (assetType === "threejs")) return true;

  if (typeof navigator !== "undefined") {
    const conn = (navigator as any).connection;
    if (conn?.saveData) return true;
  }

  return false;
}

export function createProgressiveBoot(): {
  addTask: (phase: "critical" | "interactive" | "background", task: BootTask) => void;
  run: () => Promise<BootMetrics>;
} {
  const phases: Record<string, BootTask[]> = {
    critical: [],
    interactive: [],
    background: [],
  };

  function addTask(phase: "critical" | "interactive" | "background", task: BootTask) {
    phases[phase].push(task);
    phases[phase].sort((a, b) => b.priority - a.priority);
  }

  async function run(): Promise<BootMetrics> {
    const totalStart = performance.now();
    const metrics: BootMetrics = {
      totalMs: 0,
      stages: {},
      tasks: {},
      connectionType: getConnectionQuality(),
    };

    for (const [phase, tasks] of Object.entries(phases)) {
      const stageStart = performance.now();

      for (const task of tasks) {
        const taskStart = performance.now();

        if (task.condition && !task.condition()) {
          metrics.tasks[task.name] = { durationMs: 0, skipped: true };
          continue;
        }

        try {
          await task.execute();
        } catch (err) {
          console.error(`[Boot] Task "${task.name}" failed:`, err);
        }

        metrics.tasks[task.name] = {
          durationMs: Math.round(performance.now() - taskStart),
          skipped: false,
        };
      }

      const stageEnd = performance.now();
      metrics.stages[phase] = {
        startMs: Math.round(stageStart - totalStart),
        endMs: Math.round(stageEnd - totalStart),
        durationMs: Math.round(stageEnd - stageStart),
      };
    }

    metrics.totalMs = Math.round(performance.now() - totalStart);
    return metrics;
  }

  return { addTask, run };
}

export function deferNonCritical(fn: () => void, delayMs = 0): void {
  if (typeof requestIdleCallback !== "undefined") {
    requestIdleCallback(() => fn(), { timeout: delayMs + 5000 });
  } else {
    setTimeout(fn, delayMs);
  }
}

export function connectionAwareImport<T>(
  importFn: () => Promise<T>,
  fallback: T,
  assetType: "threejs" | "mapbox" | "leaflet" | "charts",
): Promise<T> {
  if (shouldSkipHeavyAsset(assetType)) {
    return Promise.resolve(fallback);
  }
  return importFn().catch(() => fallback);
}

export function measureBootPhase(phaseName: string): { end: () => number } {
  const start = performance.now();
  return {
    end: () => {
      const duration = Math.round(performance.now() - start);
      if (typeof performance !== "undefined" && performance.mark) {
        performance.mark(`boot-${phaseName}-end`);
        try {
          performance.measure(`boot-${phaseName}`, { start: start, end: performance.now() });
        } catch {}
      }
      return duration;
    },
  };
}

export const BOOT_BUDGETS = {
  critical: { targetMs: 1000, maxMs: 1500 },
  interactive: { targetMs: 3000, maxMs: 4000 },
  background: { targetMs: 10000, maxMs: 15000 },
  total: { targetMs: 3000, maxMs: 5000 },
};

export function evaluateBootPerformance(metrics: BootMetrics): {
  grade: "A" | "B" | "C" | "D" | "F";
  issues: string[];
} {
  const issues: string[] = [];

  const critStage = metrics.stages["critical"];
  if (critStage && critStage.durationMs > BOOT_BUDGETS.critical.maxMs) {
    issues.push(`Critical phase took ${critStage.durationMs}ms (budget: ${BOOT_BUDGETS.critical.targetMs}ms)`);
  }

  const intStage = metrics.stages["interactive"];
  if (intStage && intStage.endMs > BOOT_BUDGETS.interactive.maxMs) {
    issues.push(`Interactive ready at ${intStage.endMs}ms (budget: ${BOOT_BUDGETS.interactive.targetMs}ms)`);
  }

  if (metrics.totalMs > BOOT_BUDGETS.total.maxMs) {
    issues.push(`Total boot took ${metrics.totalMs}ms (budget: ${BOOT_BUDGETS.total.targetMs}ms)`);
  }

  for (const [name, task] of Object.entries(metrics.tasks)) {
    if (!task.skipped && task.durationMs > 1000) {
      issues.push(`Task "${name}" took ${task.durationMs}ms`);
    }
  }

  let grade: "A" | "B" | "C" | "D" | "F";
  if (issues.length === 0) grade = "A";
  else if (issues.length <= 1) grade = "B";
  else if (issues.length <= 2) grade = "C";
  else if (issues.length <= 3) grade = "D";
  else grade = "F";

  return { grade, issues };
}
