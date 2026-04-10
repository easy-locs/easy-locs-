import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import { platformBus } from "@/lib/shared/platform-bus";

interface FlowEvent {
  flow: string;
  step: string;
  ts: number;
  completed: boolean;
}

export class FlowIntegrityEngine extends BaseEngine {
  private flows: Map<string, FlowEvent[]> = new Map();

  constructor() {
    super({
      id: "biz-flow-integrity",
      name: "Flow Integrity Engine",
      category: "business",
      intervalMs: 30_000,
    });
    const flowEvents = [
      "order.created", "order.confirmed", "order.completed", "order.cancelled",
      "booking.requested", "booking.confirmed", "booking.completed",
      "payment.initiated", "payment.completed", "payment.failed",
    ];
    for (const evt of flowEvents) {
      platformBus.on(evt as any, (p: any) => {
        const flowId = p?.orderId || p?.bookingId || p?.paymentId || crypto.randomUUID();
        const existing = this.flows.get(flowId) || [];
        existing.push({ flow: evt.split(".")[0], step: evt.split(".")[1], ts: Date.now(), completed: evt.includes("completed") });
        this.flows.set(flowId, existing);
      });
    }
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];

    for (const [flowId, events] of this.flows) {
      const lastEvent = events[events.length - 1];
      if (!lastEvent.completed && Date.now() - lastEvent.ts > 300_000) {
        findings.push(`Stalled flow: ${lastEvent.flow}/${flowId.substring(0, 8)} at step "${lastEvent.step}" for ${Math.round((Date.now() - lastEvent.ts) / 60_000)}min`);
      }
    }

    if (this.flows.size > 500) {
      const sorted = [...this.flows.entries()].sort((a, b) => {
        const aLast = a[1][a[1].length - 1].ts;
        const bLast = b[1][b[1].length - 1].ts;
        return bLast - aLast;
      });
      this.flows = new Map(sorted.slice(0, 300));
    }

    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }
}
