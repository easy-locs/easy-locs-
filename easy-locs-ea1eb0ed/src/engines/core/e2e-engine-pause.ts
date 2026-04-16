import { platformBus } from "@/lib/shared/platform-bus";

let _paused = false;
const _pausedEngines: string[] = [];

export function isE2ERunning(): boolean {
  return !!(globalThis as any).__E2E_RUNNING__ || _paused;
}

export function pauseEnginesForE2E(): void {
  (globalThis as any).__E2E_RUNNING__ = true;
  _paused = true;
  platformBus.emit("system:e2e_pause", { paused: true, timestamp: Date.now() }, "e2e");
}

export function resumeEnginesAfterE2E(): void {
  (globalThis as any).__E2E_RUNNING__ = false;
  _paused = false;
  platformBus.emit("system:e2e_resume", { paused: false, timestamp: Date.now() }, "e2e");
}

const E2E_BLOCKED_CATEGORIES = new Set(["self-healing", "auto-fix", "repair", "correction"]);

export function shouldSkipEngine(_engineId: string, category?: string): boolean {
  if (!isE2ERunning()) return false;
  if (category && E2E_BLOCKED_CATEGORIES.has(category)) return true;
  return false;
}

export function getE2EPauseState(): { paused: boolean; pausedEngines: string[] } {
  return { paused: _paused, pausedEngines: [..._pausedEngines] };
}
