import { platformBus } from "@/lib/shared/platform-bus";
import { engineObserver } from "./engine-observer";

export type StormGuardStatus = "normal" | "warning" | "paused" | "global_pause";

export interface CorrectionsRecord {
  engineId: string;
  fixSignature: string;
  timestamp: number;
}

export interface EngineStormState {
  engineId: string;
  correctionsThisMinute: number;
  paused: boolean;
  pausedUntil: number | null;
  loopDetected: boolean;
  loopSignature: string | null;
  totalCorrections: number;
  totalPauses: number;
  inSafeMode: boolean;
  safeModeEnteredAt: number | null;
}

const MAX_CORRECTIONS_PER_ENGINE_PER_MINUTE = 10;
const LOOP_DETECTION_SAME_FIX_COUNT = 3;
const LOOP_DETECTION_WINDOW_MS = 60_000;
const ENGINE_PAUSE_DURATION_MS = 30_000;
const STORM_SAFE_MODE_PAUSE_THRESHOLD = 3;

const GLOBAL_STORM_THRESHOLD = 50;
const GLOBAL_PAUSE_DURATION_MS = 30_000;
const GLOBAL_WINDOW_MS = 60_000;

const NON_CRITICAL_PAUSE_DURATION_MS = 30_000;
const CRITICAL_ENGINE_IDS = new Set<string>();

class EngineStormGuard {
  private corrections: CorrectionsRecord[] = [];
  private engineStates: Map<string, EngineStormState> = new Map();
  private globalPausedUntil = 0;
  private status: StormGuardStatus = "normal";
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  start(): void {
    if (this.cleanupInterval) return;
    this.cleanupInterval = setInterval(() => this.cleanup(), 10_000);
  }

  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  registerCriticalEngine(engineId: string): void {
    CRITICAL_ENGINE_IDS.add(engineId);
  }

  registerCriticalEngines(engineIds: string[]): void {
    for (const id of engineIds) CRITICAL_ENGINE_IDS.add(id);
  }

  canApplyCorrection(engineId: string, fixSignature: string): boolean {
    if (this.isGloballyPaused()) {
      if (!CRITICAL_ENGINE_IDS.has(engineId)) return false;
    }

    const state = this.getOrCreateState(engineId);
    if (state.inSafeMode) return false;
    if (state.paused && state.pausedUntil && Date.now() < state.pausedUntil) return false;
    if (state.paused && state.pausedUntil && Date.now() >= state.pausedUntil) {
      state.paused = false;
      state.pausedUntil = null;
      state.loopDetected = false;
      state.loopSignature = null;
    }

    const now = Date.now();
    const windowStart = now - GLOBAL_WINDOW_MS;
    const recentCorrections = this.corrections.filter(
      c => c.engineId === engineId && c.timestamp >= windowStart
    );

    if (recentCorrections.length >= MAX_CORRECTIONS_PER_ENGINE_PER_MINUTE) {
      this.pauseEngine(engineId, state, `Too many corrections (${recentCorrections.length}/min), limit=${MAX_CORRECTIONS_PER_ENGINE_PER_MINUTE}`);
      return false;
    }

    const recentSameFix = recentCorrections.filter(c => c.fixSignature === fixSignature);
    if (recentSameFix.length >= LOOP_DETECTION_SAME_FIX_COUNT - 1) {
      state.loopDetected = true;
      state.loopSignature = fixSignature;
      this.pauseEngine(engineId, state, `Infinite loop detected — same fix applied ${recentSameFix.length + 1}x in ${LOOP_DETECTION_WINDOW_MS / 1000}s`);
      return false;
    }

    return true;
  }

  recordCorrection(engineId: string, fixSignature: string): void {
    this.corrections.push({ engineId, fixSignature, timestamp: Date.now() });
    if (this.corrections.length > 2000) {
      this.corrections = this.corrections.slice(-2000);
    }

    const state = this.getOrCreateState(engineId);
    state.totalCorrections++;
    this.updateMinuteCount(state, engineId);

    this.checkGlobalThreshold();
  }

  private updateMinuteCount(state: EngineStormState, engineId: string): void {
    const windowStart = Date.now() - GLOBAL_WINDOW_MS;
    state.correctionsThisMinute = this.corrections.filter(
      c => c.engineId === engineId && c.timestamp >= windowStart
    ).length;
  }

  private checkGlobalThreshold(): void {
    const windowStart = Date.now() - GLOBAL_WINDOW_MS;
    const recentGlobal = this.corrections.filter(c => c.timestamp >= windowStart);

    if (recentGlobal.length >= GLOBAL_STORM_THRESHOLD && !this.isGloballyPaused()) {
      this.globalPausedUntil = Date.now() + GLOBAL_PAUSE_DURATION_MS;
      this.status = "global_pause";

      engineObserver.log("engine-storm-guard", "storm-guard", "error",
        `Global correction storm detected: ${recentGlobal.length} corrections in ${GLOBAL_WINDOW_MS / 1000}s — pausing all non-critical engines for ${GLOBAL_PAUSE_DURATION_MS / 1000}s`);

      platformBus.emit("engine:storm:global_pause", {
        corrections: recentGlobal.length,
        pausedUntil: this.globalPausedUntil,
        timestamp: Date.now(),
      });

      this.pauseNonCriticalEngines();
    }
  }

  private pauseNonCriticalEngines(): void {
    for (const [engineId, state] of this.engineStates) {
      if (!CRITICAL_ENGINE_IDS.has(engineId) && !state.paused) {
        state.paused = true;
        state.pausedUntil = Date.now() + NON_CRITICAL_PAUSE_DURATION_MS;
        state.totalPauses++;
      }
    }
  }

  private pauseEngine(engineId: string, state: EngineStormState, reason: string): void {
    if (!state.paused) {
      state.paused = true;
      state.pausedUntil = Date.now() + ENGINE_PAUSE_DURATION_MS;
      state.totalPauses++;

      engineObserver.log(engineId, "storm-guard", "warn",
        `Engine paused for ${ENGINE_PAUSE_DURATION_MS / 1000}s: ${reason} (pause #${state.totalPauses})`);

      platformBus.emit("engine:storm:engine_paused", {
        engineId,
        reason,
        pausedUntil: state.pausedUntil,
        timestamp: Date.now(),
      });

      if (state.totalPauses >= STORM_SAFE_MODE_PAUSE_THRESHOLD) {
        this.enterEngineSafeMode(engineId, state,
          `${state.totalPauses} storm pauses exceeded threshold of ${STORM_SAFE_MODE_PAUSE_THRESHOLD} — ${reason}`);
      }
    }
  }

  private isGloballyPaused(): boolean {
    if (this.globalPausedUntil > Date.now()) return true;
    if (this.status === "global_pause") {
      this.status = "normal";
      engineObserver.log("engine-storm-guard", "storm-guard", "info", "Global storm pause lifted");
    }
    return false;
  }

  isEnginePaused(engineId: string): boolean {
    if (this.isGloballyPaused() && !CRITICAL_ENGINE_IDS.has(engineId)) return true;
    const state = this.engineStates.get(engineId);
    if (!state) return false;
    if (state.inSafeMode) return true;
    if (state.paused && state.pausedUntil && Date.now() >= state.pausedUntil) {
      state.paused = false;
      state.pausedUntil = null;
      return false;
    }
    return state.paused;
  }

  manualUnpause(engineId: string): void {
    const state = this.engineStates.get(engineId);
    if (state) {
      state.paused = false;
      state.pausedUntil = null;
      state.loopDetected = false;
      state.loopSignature = null;
    }
  }

  private _safeModeCallback: ((engineId: string, reason: string) => void) | null = null;

  onEngineSafeMode(callback: (engineId: string, reason: string) => void): void {
    this._safeModeCallback = callback;
  }

  private enterEngineSafeMode(engineId: string, state: EngineStormState, reason: string): void {
    if (state.inSafeMode) return;
    state.inSafeMode = true;
    state.safeModeEnteredAt = Date.now();
    engineObserver.log(engineId, "storm-guard", "error",
      `Engine entered storm safe mode: ${reason}`);
    platformBus.emit("engine:health:safe_mode", {
      engineId,
      reason: `storm-guard: ${reason}`,
      timestamp: Date.now(),
    });
    if (this._safeModeCallback) {
      try { this._safeModeCallback(engineId, reason); } catch {}
    }
  }

  exitEngineSafeMode(engineId: string): void {
    const state = this.engineStates.get(engineId);
    if (state?.inSafeMode) {
      state.inSafeMode = false;
      state.safeModeEnteredAt = null;
      state.totalPauses = 0;
      engineObserver.log(engineId, "storm-guard", "info", "Engine exited storm safe mode");
    }
  }

  private getOrCreateState(engineId: string): EngineStormState {
    if (!this.engineStates.has(engineId)) {
      this.engineStates.set(engineId, {
        engineId,
        correctionsThisMinute: 0,
        paused: false,
        pausedUntil: null,
        loopDetected: false,
        loopSignature: null,
        totalCorrections: 0,
        totalPauses: 0,
        inSafeMode: false,
        safeModeEnteredAt: null,
      });
    }
    return this.engineStates.get(engineId)!;
  }

  private cleanup(): void {
    const cutoff = Date.now() - Math.max(GLOBAL_WINDOW_MS, LOOP_DETECTION_WINDOW_MS) * 2;
    this.corrections = this.corrections.filter(c => c.timestamp >= cutoff);

    for (const [, state] of this.engineStates) {
      if (state.paused && state.pausedUntil && Date.now() >= state.pausedUntil) {
        state.paused = false;
        state.pausedUntil = null;
      }
    }
  }

  getEngineState(engineId: string): EngineStormState | undefined {
    return this.engineStates.get(engineId);
  }

  getEngineTotalCorrections(engineId: string): number {
    return this.engineStates.get(engineId)?.totalCorrections ?? 0;
  }

  getReport() {
    const windowStart = Date.now() - GLOBAL_WINDOW_MS;
    const recentGlobal = this.corrections.filter(c => c.timestamp >= windowStart);

    return {
      status: this.status,
      globallyPaused: this.isGloballyPaused(),
      globalPausedUntil: this.globalPausedUntil > Date.now() ? this.globalPausedUntil : null,
      globalCorrectionsPerMinute: recentGlobal.length,
      globalThreshold: GLOBAL_STORM_THRESHOLD,
      criticalEngines: Array.from(CRITICAL_ENGINE_IDS),
      engineStates: Array.from(this.engineStates.values()),
      limits: {
        perEnginePerMinute: MAX_CORRECTIONS_PER_ENGINE_PER_MINUTE,
        loopDetectionCount: LOOP_DETECTION_SAME_FIX_COUNT,
        loopDetectionWindowMs: LOOP_DETECTION_WINDOW_MS,
        enginePauseDurationMs: ENGINE_PAUSE_DURATION_MS,
        globalStormThreshold: GLOBAL_STORM_THRESHOLD,
      },
    };
  }
}

export const engineStormGuard = new EngineStormGuard();
