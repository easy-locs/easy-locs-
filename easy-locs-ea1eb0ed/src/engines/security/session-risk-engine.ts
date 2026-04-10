import { BaseEngine, type EngineTickResult } from "../core/base-engine";

export class SessionRiskEngine extends BaseEngine {
  private sessionStart = Date.now();
  private lastActivity = Date.now();

  constructor() {
    super({
      id: "sec-session-risk",
      name: "Session Risk Engine",
      category: "security",
      intervalMs: 60_000,
    });
    this.trackActivity();
  }

  private trackActivity(): void {
    const update = () => { this.lastActivity = Date.now(); };
    document.addEventListener("click", update, { passive: true });
    document.addEventListener("keydown", update, { passive: true });
    document.addEventListener("touchstart", update, { passive: true });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];

    const sessionDuration = Date.now() - this.sessionStart;
    if (sessionDuration > 8 * 3600_000) {
      findings.push(`Long session: ${Math.round(sessionDuration / 3600_000)}h — token rotation recommended`);
    }

    const idleTime = Date.now() - this.lastActivity;
    if (idleTime > 30 * 60_000) {
      findings.push(`Idle session: ${Math.round(idleTime / 60_000)}min — auto-lock wallet recommended`);
      this.emit("session-idle", { idleMs: idleTime });
    }

    const tabCount = (window as any).__el_tab_count;
    if (typeof tabCount === "number" && tabCount > 5) {
      findings.push(`${tabCount} tabs open — session fragmentation risk`);
    }

    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }
}
