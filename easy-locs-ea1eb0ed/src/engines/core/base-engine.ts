import { platformBus } from "@/lib/shared/platform-bus";
import { engineObserver, type EngineLogLevel } from "./engine-observer";
import { isEngineEnabled } from "./engine-feature-flags";
import { isQuarantined, isRepairStormActive, getQuarantineStatus } from "./repair-safety";
import { isDomainQuarantined } from "@/lib/control-plane/domain-health";
import type { ControlDomain } from "@/lib/control-plane/types";
import { applyKnownFixes, type ApplyContext } from "./apply-known-fixes";
import { engineMemory } from "./engine-memory";
import { computeIssueSignature } from "./issue-signature";

export type EngineActionLevel = "observe" | "detect" | "propose" | "act";

export interface EngineTickResult {
  level: EngineActionLevel;
  findings: number;
  actions: string[];
  duration: number;
}

export interface EngineConfig {
  id: string;
  name: string;
  category: string;
  domain?: string;
  intervalMs: number;
  enabled?: boolean;
}

export abstract class BaseEngine {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly domain: string;
  readonly intervalMs: number;

  private _timer: ReturnType<typeof setInterval> | null = null;
  private _running = false;
  private _lastTick = 0;
  private _tickCount = 0;
  private _errorCount = 0;
  private _startedAt = 0;

  constructor(config: EngineConfig) {
    this.id = config.id;
    this.name = config.name;
    this.category = config.category;
    this.domain = config.domain ?? config.category;
    this.intervalMs = config.intervalMs;
  }

  get isRunning(): boolean {
    return this._running;
  }

  get stats() {
    return {
      id: this.id,
      name: this.name,
      category: this.category,
      domain: this.domain,
      running: this._running,
      tickCount: this._tickCount,
      errorCount: this._errorCount,
      lastTick: this._lastTick,
      uptime: this._running ? Date.now() - this._startedAt : 0,
      quarantineStatus: getQuarantineStatus(this.id),
    };
  }

  start(): void {
    if (this._running) return;
    if (import.meta.env.MODE === "test" && !import.meta.env.VITEST_ALLOW_ENGINES) return;
    if (!isEngineEnabled(this.id)) {
      this.log("info", `Skipped (disabled by feature flag)`);
      return;
    }
    this._running = true;
    this._startedAt = Date.now();
    this.log("info", `Started (interval: ${this.intervalMs}ms)`);
    platformBus.emit("engine:started", { engineId: this.id, category: this.category }, "system");

    setTimeout(() => this.executeTick(), 2000 + Math.random() * 3000);

    this._timer = setInterval(() => this.executeTick(), this.intervalMs);
  }

  stop(): void {
    if (!this._running) return;
    this._running = false;
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    this.log("info", `Stopped after ${this._tickCount} ticks`);
    platformBus.emit("engine:stopped", { engineId: this.id }, "system");
  }

  private async executeTick(): Promise<void> {
    if (!this._running) return;
    if (!isEngineEnabled(this.id)) {
      this.stop();
      return;
    }

    if (isQuarantined(this.id) || isQuarantined(`domain:${this.domain}`)) {
      return;
    }

    if (isDomainQuarantined(this.domain as ControlDomain)) {
      return;
    }

    if (isRepairStormActive()) {
      return;
    }

    const activeSignatures = this.collectActiveSignatures();
    if (activeSignatures.length > 0) {
      applyKnownFixes({ engineId: this.id, domain: this.domain, activeSignatures });
    }

    const start = performance.now();
    try {
      const result = await this.tick();
      this._tickCount++;
      this._lastTick = Date.now();
      const duration = Math.round(performance.now() - start);

      engineObserver.recordTick(this.id, this.category, result, duration);

      if (result.findings > 0 || result.actions.length > 0) {
        this.log("info", `Tick #${this._tickCount}: ${result.level} — ${result.findings} findings, ${result.actions.length} actions (${duration}ms)`);
      }
    } catch (err) {
      this._errorCount++;
      const duration = Math.round(performance.now() - start);
      this.log("error", `Tick failed (${duration}ms): ${err instanceof Error ? err.message : String(err)}`);
      engineObserver.recordError(this.id, this.category, err);
    }
  }

  protected log(level: EngineLogLevel, message: string): void {
    engineObserver.log(this.id, this.category, level, message);
  }

  protected emit(event: string, payload?: Record<string, unknown>): void {
    platformBus.emit(`engine:${this.category}:${event}`, {
      engineId: this.id,
      ...payload,
    }, "system");
  }

  private collectActiveSignatures(): string[] {
    if (!engineMemory.isLoaded) return [];
    const autoFixes = engineMemory.getAutoApplyFixes();
    return autoFixes
      .filter(f => f.domain === this.domain || f.engine_id === this.id)
      .map(f => f.issue_signature);
  }

  abstract tick(): Promise<EngineTickResult>;
}
