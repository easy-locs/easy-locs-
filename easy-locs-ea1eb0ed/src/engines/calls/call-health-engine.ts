import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import { platformBus } from "@/lib/shared/platform-bus";

interface CallMetrics {
  callId: string;
  startedAt: number;
  quality: "good" | "degraded" | "poor";
  reconnects: number;
}

export class CallHealthEngine extends BaseEngine {
  private activeCalls: Map<string, CallMetrics> = new Map();

  constructor() {
    super({
      id: "calls-health",
      name: "Call Health Engine",
      category: "calls",
      intervalMs: 10_000,
    });
    platformBus.on("orbit:call_started" as any, (p: any) => {
      if (p?.callId) {
        this.activeCalls.set(p.callId, { callId: p.callId, startedAt: Date.now(), quality: "good", reconnects: 0 });
      }
    });
    platformBus.on("orbit:call_ended" as any, (p: any) => {
      if (p?.callId) this.activeCalls.delete(p.callId);
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];

    for (const [id, metrics] of this.activeCalls) {
      const duration = Date.now() - metrics.startedAt;
      if (duration > 3600_000) {
        findings.push(`Long call: ${id} running for ${Math.round(duration / 60_000)}min`);
      }
      if (metrics.reconnects > 5) {
        findings.push(`Unstable call: ${id} has ${metrics.reconnects} reconnects`);
      }
    }

    if (this.activeCalls.size > 3) {
      findings.push(`${this.activeCalls.size} concurrent calls — resource pressure`);
    }

    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }
}
