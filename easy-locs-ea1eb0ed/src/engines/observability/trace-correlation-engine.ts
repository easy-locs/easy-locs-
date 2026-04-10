import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import { platformBus } from "@/lib/shared/platform-bus";

interface TraceEntry {
  traceId: string;
  events: Array<{ type: string; ts: number; duration?: number }>;
  startedAt: number;
}

export class TraceCorrelationEngine extends BaseEngine {
  private traces: Map<string, TraceEntry> = new Map();

  constructor() {
    super({
      id: "obs-trace-correlation",
      name: "Trace Correlation Engine",
      category: "observability",
      intervalMs: 30_000,
    });
    platformBus.onAll((type: string, payload: any) => {
      const traceId = payload?.traceId || payload?.requestId;
      if (traceId) {
        const trace = this.traces.get(traceId) || { traceId, events: [], startedAt: Date.now() };
        trace.events.push({ type, ts: Date.now() });
        this.traces.set(traceId, trace);
      }
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];

    for (const [id, trace] of this.traces) {
      if (trace.events.length > 50) {
        findings.push(`High-cardinality trace ${id.substring(0, 8)}: ${trace.events.length} events`);
      }
      const age = Date.now() - trace.startedAt;
      if (age > 600_000 && trace.events.length > 0) {
        this.traces.delete(id);
      }
    }

    if (this.traces.size > 500) {
      const sorted = [...this.traces.entries()].sort((a, b) => b[1].startedAt - a[1].startedAt);
      this.traces = new Map(sorted.slice(0, 300));
    }

    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }
}
