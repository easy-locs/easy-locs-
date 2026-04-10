import { BaseEngine, type EngineTickResult } from "../core/base-engine";

interface FailedOperation {
  type: string;
  payload: unknown;
  timestamp: number;
  retries: number;
  maxRetries: number;
}

export class RetryReplayEngine extends BaseEngine {
  private queue: FailedOperation[] = [];

  constructor() {
    super({
      id: "rt-retry-replay",
      name: "Retry Replay Engine",
      category: "realtime",
      intervalMs: 15_000,
    });
  }

  enqueue(type: string, payload: unknown, maxRetries = 3): void {
    this.queue.push({ type, payload, timestamp: Date.now(), retries: 0, maxRetries });
    if (this.queue.length > 200) this.queue = this.queue.slice(-200);
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];
    const actions: string[] = [];

    if (!navigator.onLine) {
      if (this.queue.length > 0) {
        findings.push(`${this.queue.length} operations queued — device offline`);
      }
      return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions, duration: 0 };
    }

    const expired: number[] = [];
    for (let i = 0; i < this.queue.length; i++) {
      const op = this.queue[i];
      if (op.retries >= op.maxRetries) {
        expired.push(i);
        findings.push(`Dropped: ${op.type} after ${op.maxRetries} retries`);
        continue;
      }
      if (Date.now() - op.timestamp > 600_000) {
        expired.push(i);
        findings.push(`Expired: ${op.type} (>10min old)`);
        continue;
      }
    }

    for (let i = expired.length - 1; i >= 0; i--) {
      this.queue.splice(expired[i], 1);
    }
    if (expired.length > 0) {
      actions.push(`Pruned ${expired.length} expired/failed operations`);
    }

    return {
      level: actions.length > 0 ? "act" : findings.length > 0 ? "detect" : "observe",
      findings: findings.length,
      actions,
      duration: 0,
    };
  }
}
