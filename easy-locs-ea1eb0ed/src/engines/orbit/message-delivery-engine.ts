import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import { platformBus } from "@/lib/shared/platform-bus";

export class MessageDeliveryEngine extends BaseEngine {
  private sentMessages: Map<string, number> = new Map();
  private deliveryTimes: number[] = [];

  constructor() {
    super({
      id: "orbit-message-delivery",
      name: "Message Delivery Engine",
      category: "orbit",
      intervalMs: 15_000,
    });
    platformBus.on("orbit:message_sent" as any, (p: any) => {
      if (p?.messageId) this.sentMessages.set(p.messageId, Date.now());
    });
    platformBus.on("orbit:message_delivered" as any, (p: any) => {
      if (p?.messageId && this.sentMessages.has(p.messageId)) {
        const latency = Date.now() - this.sentMessages.get(p.messageId)!;
        this.deliveryTimes.push(latency);
        if (this.deliveryTimes.length > 200) this.deliveryTimes = this.deliveryTimes.slice(-200);
        this.sentMessages.delete(p.messageId);
      }
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];

    const stale = [...this.sentMessages.entries()].filter(([, ts]) => Date.now() - ts > 30_000);
    if (stale.length > 0) {
      findings.push(`${stale.length} messages not delivered after 30s`);
    }

    if (this.deliveryTimes.length > 10) {
      const avg = this.deliveryTimes.reduce((s, t) => s + t, 0) / this.deliveryTimes.length;
      if (avg > 3000) {
        findings.push(`Slow delivery: avg ${Math.round(avg)}ms`);
      }
    }

    for (const [id] of stale) {
      if (Date.now() - (this.sentMessages.get(id) || 0) > 120_000) {
        this.sentMessages.delete(id);
      }
    }

    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }
}
