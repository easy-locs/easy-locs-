import { platformBus } from "@/lib/shared/platform-bus";

export interface EngineSLA {
  engineId: string;
  maxLatencyMs: number;
  maxErrorRate: number;
  minUptimePercent: number;
}

export interface SLAViolation {
  engineId: string;
  violationType: "latency" | "error_rate" | "uptime";
  threshold: number;
  actual: number;
  detectedAt: number;
}

export interface EngineRuntimeMetrics {
  engineId: string;
  tickCount: number;
  errorCount: number;
  totalDurationMs: number;
  startedAt: number;
  lastTickAt: number;
  downtimeMs: number;
}

const DEFAULT_SLA: Omit<EngineSLA, "engineId"> = {
  maxLatencyMs: 5000,
  maxErrorRate: 0.1,
  minUptimePercent: 95,
};

class SLAEngineManager {
  private slas = new Map<string, EngineSLA>();
  private metrics = new Map<string, EngineRuntimeMetrics>();
  private violations: SLAViolation[] = [];
  private quarantinedEngines = new Set<string>();
  private _checkInterval: ReturnType<typeof setInterval> | null = null;
  private readonly MAX_VIOLATIONS = 500;
  private engineStoppedAt = new Map<string, number>();

  registerSLA(sla: EngineSLA): void {
    this.slas.set(sla.engineId, sla);
  }

  registerDefaultSLA(engineId: string): void {
    this.slas.set(engineId, { engineId, ...DEFAULT_SLA });
  }

  recordTick(engineId: string, durationMs: number): void {
    if (!this.metrics.has(engineId)) {
      this.metrics.set(engineId, {
        engineId,
        tickCount: 0,
        errorCount: 0,
        totalDurationMs: 0,
        startedAt: Date.now(),
        lastTickAt: Date.now(),
        downtimeMs: 0,
      });
    }
    const m = this.metrics.get(engineId)!;
    m.tickCount++;
    m.totalDurationMs += durationMs;
    m.lastTickAt = Date.now();
  }

  recordError(engineId: string): void {
    if (!this.metrics.has(engineId)) {
      this.metrics.set(engineId, {
        engineId,
        tickCount: 0,
        errorCount: 0,
        totalDurationMs: 0,
        startedAt: Date.now(),
        lastTickAt: Date.now(),
        downtimeMs: 0,
      });
    }
    this.metrics.get(engineId)!.errorCount++;
  }

  recordDowntime(engineId: string, durationMs: number): void {
    const m = this.metrics.get(engineId);
    if (m) m.downtimeMs += durationMs;
  }

  checkSLAs(): SLAViolation[] {
    const newViolations: SLAViolation[] = [];
    const now = Date.now();

    for (const [engineId, sla] of this.slas) {
      const m = this.metrics.get(engineId);
      if (!m || m.tickCount === 0) continue;

      const avgLatency = m.totalDurationMs / m.tickCount;
      if (avgLatency > sla.maxLatencyMs) {
        const v: SLAViolation = {
          engineId,
          violationType: "latency",
          threshold: sla.maxLatencyMs,
          actual: Math.round(avgLatency),
          detectedAt: now,
        };
        newViolations.push(v);
      }

      const errorRate =
        m.tickCount + m.errorCount > 0
          ? m.errorCount / (m.tickCount + m.errorCount)
          : 0;
      if (errorRate > sla.maxErrorRate) {
        const v: SLAViolation = {
          engineId,
          violationType: "error_rate",
          threshold: sla.maxErrorRate,
          actual: Math.round(errorRate * 1000) / 1000,
          detectedAt: now,
        };
        newViolations.push(v);
      }

      const totalTime = now - m.startedAt;
      if (totalTime > 60_000) {
        const uptimePercent =
          ((totalTime - m.downtimeMs) / totalTime) * 100;
        if (uptimePercent < sla.minUptimePercent) {
          const v: SLAViolation = {
            engineId,
            violationType: "uptime",
            threshold: sla.minUptimePercent,
            actual: Math.round(uptimePercent * 10) / 10,
            detectedAt: now,
          };
          newViolations.push(v);
        }
      }
    }

    for (const v of newViolations) {
      this.violations.push(v);
      if (this.violations.length > this.MAX_VIOLATIONS) {
        this.violations.shift();
      }

      platformBus.emit(
        "system:sla_violation",
        {
          engineId: v.engineId,
          type: v.violationType,
          threshold: v.threshold,
          actual: v.actual,
        },
        "system",
      );

      const recentViolations = this.violations.filter(
        (vv) =>
          vv.engineId === v.engineId && Date.now() - vv.detectedAt < 300_000,
      );
      if (recentViolations.length >= 3 && !this.quarantinedEngines.has(v.engineId)) {
        this.quarantinedEngines.add(v.engineId);
        platformBus.emit(
          "system:engine_sla_quarantine",
          {
            engineId: v.engineId,
            violationCount: recentViolations.length,
            reason: "Repeated SLA violations",
          },
          "system",
        );
      }
    }

    return newViolations;
  }

  isQuarantined(engineId: string): boolean {
    return this.quarantinedEngines.has(engineId);
  }

  releaseFromQuarantine(engineId: string): void {
    this.quarantinedEngines.delete(engineId);
  }

  getViolations(engineId?: string): SLAViolation[] {
    if (engineId) {
      return this.violations.filter((v) => v.engineId === engineId);
    }
    return [...this.violations];
  }

  getSLA(engineId: string): EngineSLA | undefined {
    return this.slas.get(engineId);
  }

  getAllSLAs(): EngineSLA[] {
    return Array.from(this.slas.values());
  }

  getMetrics(engineId: string): EngineRuntimeMetrics | undefined {
    return this.metrics.get(engineId);
  }

  start(): () => void {
    if (this._checkInterval) return () => {};

    this._checkInterval = setInterval(() => {
      this.checkSLAs();
    }, 60_000);

    const unsubStop = platformBus.on("engine:stopped", (event) => {
      const engineId = (event.payload as { engineId: string }).engineId;
      if (engineId) {
        this.engineStoppedAt.set(engineId, Date.now());
      }
    });

    const unsubStart = platformBus.on("engine:started", (event) => {
      const engineId = (event.payload as { engineId: string }).engineId;
      if (engineId) {
        const stoppedAt = this.engineStoppedAt.get(engineId);
        if (stoppedAt) {
          const downtime = Date.now() - stoppedAt;
          this.recordDowntime(engineId, downtime);
          this.engineStoppedAt.delete(engineId);
        }
      }
    });

    const unsubPause = platformBus.on("engine:storm:engine_paused", (event) => {
      const engineId = (event.payload as { engineId: string }).engineId;
      if (engineId) {
        this.engineStoppedAt.set(engineId, Date.now());
      }
    });

    const unsubResume = platformBus.on("engine:storm:engine_resumed", (event) => {
      const payload = event.payload as { engineId: string; pauseDurationMs: number };
      if (payload.engineId) {
        this.recordDowntime(payload.engineId, payload.pauseDurationMs);
        this.engineStoppedAt.delete(payload.engineId);
      }
    });

    return () => {
      this.stop();
      unsubStop();
      unsubStart();
      unsubPause();
      unsubResume();
    };
  }

  stop(): void {
    if (this._checkInterval) {
      clearInterval(this._checkInterval);
      this._checkInterval = null;
    }
  }

  getReport(): {
    totalSLAs: number;
    totalViolations: number;
    quarantinedEngines: string[];
    recentViolations: SLAViolation[];
    engineSummary: Array<{
      engineId: string;
      sla: EngineSLA;
      violationCount: number;
      isQuarantined: boolean;
    }>;
  } {
    const engineSummary = Array.from(this.slas.values()).map((sla) => ({
      engineId: sla.engineId,
      sla,
      violationCount: this.violations.filter(
        (v) => v.engineId === sla.engineId,
      ).length,
      isQuarantined: this.quarantinedEngines.has(sla.engineId),
    }));

    return {
      totalSLAs: this.slas.size,
      totalViolations: this.violations.length,
      quarantinedEngines: Array.from(this.quarantinedEngines),
      recentViolations: this.violations.slice(-20),
      engineSummary,
    };
  }

  reset(): void {
    this.stop();
    this.slas.clear();
    this.metrics.clear();
    this.violations = [];
    this.quarantinedEngines.clear();
  }
}

export const slaEngineManager = new SLAEngineManager();
