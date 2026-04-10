import { BaseEngine, type EngineTickResult } from "../core/base-engine";

export class ReconnectEngine extends BaseEngine {
  private reconnectAttempts = 0;
  private wasOnline = true;

  constructor() {
    super({
      id: "calls-reconnect",
      name: "Reconnect Engine",
      category: "calls",
      intervalMs: 5_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];
    const actions: string[] = [];

    const isOnline = navigator.onLine;

    if (!isOnline && this.wasOnline) {
      findings.push("Network dropped — call reconnection needed");
      this.reconnectAttempts = 0;
    }

    if (isOnline && !this.wasOnline) {
      this.emit("network-restored", { reconnectAttempts: this.reconnectAttempts });
      actions.push("Network restored — signaling reconnection");
      this.reconnectAttempts = 0;
    }

    if (!isOnline) {
      this.reconnectAttempts++;
      if (this.reconnectAttempts > 30) {
        findings.push(`Extended offline: ${this.reconnectAttempts} checks without connectivity`);
      }
    }

    this.wasOnline = isOnline;

    return {
      level: actions.length > 0 ? "act" : findings.length > 0 ? "detect" : "observe",
      findings: findings.length,
      actions,
      duration: 0,
    };
  }
}
