import type { EngineTickResult } from "./base-engine";

export type EngineLogLevel = "info" | "warn" | "error" | "debug";

interface EngineLogEntry {
  timestamp: number;
  engineId: string;
  category: string;
  level: EngineLogLevel;
  message: string;
}

interface EngineMetric {
  engineId: string;
  category: string;
  tickCount: number;
  errorCount: number;
  totalFindings: number;
  totalActions: number;
  avgDurationMs: number;
  lastTick: number;
}

const MAX_LOGS = 500;
const MAX_ERRORS = 100;

class EngineObserver {
  private logs: EngineLogEntry[] = [];
  private errors: Array<{ timestamp: number; engineId: string; error: unknown }> = [];
  private metrics: Map<string, EngineMetric> = new Map();

  log(engineId: string, category: string, level: EngineLogLevel, message: string): void {
    this.logs.push({ timestamp: Date.now(), engineId, category, level, message });
    if (this.logs.length > MAX_LOGS) this.logs = this.logs.slice(-MAX_LOGS);

    if (import.meta.env.DEV) {
      const prefix = `[engine:${category}/${engineId}]`;
      if (level === "error") console.error(prefix, message);
      else if (level === "warn") console.warn(prefix, message);
    }
  }

  recordTick(engineId: string, category: string, result: EngineTickResult, durationMs: number): void {
    const existing = this.metrics.get(engineId);
    if (existing) {
      existing.tickCount++;
      existing.totalFindings += result.findings;
      existing.totalActions += result.actions.length;
      existing.avgDurationMs = Math.round(
        (existing.avgDurationMs * (existing.tickCount - 1) + durationMs) / existing.tickCount
      );
      existing.lastTick = Date.now();
    } else {
      this.metrics.set(engineId, {
        engineId,
        category,
        tickCount: 1,
        errorCount: 0,
        totalFindings: result.findings,
        totalActions: result.actions.length,
        avgDurationMs: durationMs,
        lastTick: Date.now(),
      });
    }
  }

  recordError(engineId: string, category: string, error: unknown): void {
    this.errors.push({ timestamp: Date.now(), engineId, error });
    if (this.errors.length > MAX_ERRORS) this.errors = this.errors.slice(-MAX_ERRORS);

    const existing = this.metrics.get(engineId);
    if (existing) {
      existing.errorCount++;
    } else {
      this.metrics.set(engineId, {
        engineId,
        category,
        tickCount: 0,
        errorCount: 1,
        totalFindings: 0,
        totalActions: 0,
        avgDurationMs: 0,
        lastTick: Date.now(),
      });
    }
  }

  getReport() {
    const allMetrics = Array.from(this.metrics.values());
    return {
      generatedAt: new Date().toISOString(),
      totalEngines: allMetrics.length,
      totalTicks: allMetrics.reduce((s, m) => s + m.tickCount, 0),
      totalErrors: allMetrics.reduce((s, m) => s + m.errorCount, 0),
      totalFindings: allMetrics.reduce((s, m) => s + m.totalFindings, 0),
      totalActions: allMetrics.reduce((s, m) => s + m.totalActions, 0),
      engines: allMetrics,
      recentLogs: this.logs.slice(-50),
      recentErrors: this.errors.slice(-20),
    };
  }

  getEngineLogs(engineId: string, limit = 50): EngineLogEntry[] {
    return this.logs.filter(l => l.engineId === engineId).slice(-limit);
  }

  getCategoryMetrics(category: string): EngineMetric[] {
    return Array.from(this.metrics.values()).filter(m => m.category === category);
  }

  clearLogs(): void {
    this.logs = [];
    this.errors = [];
  }

  reset(): void {
    this.logs = [];
    this.errors = [];
    this.metrics.clear();
  }
}

export const engineObserver = new EngineObserver();
