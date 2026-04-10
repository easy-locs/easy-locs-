import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import { platformBus } from "@/lib/shared/platform-bus";

export class MessageReconcileEngine extends BaseEngine {
  private pendingMessages: Map<string, number> = new Map();

  constructor() {
    super({
      id: "rt-message-reconcile",
      name: "Message Reconcile Engine",
      category: "realtime",
      intervalMs: 30_000,
    });
    this.installListeners();
  }

  private installListeners(): void {
    platformBus.on("orbit:message_sent" as any, (payload: any) => {
      if (payload?.messageId) {
        this.pendingMessages.set(payload.messageId, Date.now());
      }
    });
    platformBus.on("orbit:message_delivered" as any, (payload: any) => {
      if (payload?.messageId) {
        this.pendingMessages.delete(payload.messageId);
      }
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];
    const actions: string[] = [];

    const stale: string[] = [];
    for (const [id, ts] of this.pendingMessages) {
      if (Date.now() - ts > 60_000) stale.push(id);
    }

    if (stale.length > 0) {
      findings.push(`${stale.length} messages pending >60s — delivery may be stuck`);
      for (const id of stale) {
        this.pendingMessages.delete(id);
      }
      actions.push(`Cleared ${stale.length} stale pending messages`);
    }

    if (this.pendingMessages.size > 100) {
      findings.push(`Pending message queue growing: ${this.pendingMessages.size}`);
    }

    return {
      level: actions.length > 0 ? "act" : findings.length > 0 ? "detect" : "observe",
      findings: findings.length,
      actions,
      duration: 0,
    };
  }
}
