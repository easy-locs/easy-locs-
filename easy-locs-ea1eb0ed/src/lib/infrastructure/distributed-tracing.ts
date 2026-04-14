import { platformBus, type PlatformEvent } from "@/lib/shared/platform-bus";

let _traceCounter = 0;

export function generateTraceId(prefix = "trace"): string {
  return `${prefix}-${Date.now()}-${++_traceCounter}-${Math.random().toString(36).slice(2, 6)}`;
}

export interface TraceSpan {
  traceId: string;
  spanId: string;
  parentSpanId: string | null;
  operation: string;
  source: string;
  startedAt: number;
  endedAt: number | null;
  durationMs: number | null;
  status: "ok" | "error" | "pending";
  metadata: Record<string, unknown>;
}

const MAX_TRACES = 1000;
const MAX_SPANS_PER_TRACE = 200;

const traceStore = new Map<string, TraceSpan[]>();
const traceOrder: string[] = [];

let _spanCounter = 0;
function generateSpanId(): string {
  return `span-${++_spanCounter}-${Math.random().toString(36).slice(2, 6)}`;
}

export function startSpan(
  traceId: string,
  operation: string,
  source: string,
  parentSpanId: string | null = null,
  metadata: Record<string, unknown> = {},
): TraceSpan {
  const span: TraceSpan = {
    traceId,
    spanId: generateSpanId(),
    parentSpanId,
    operation,
    source,
    startedAt: performance.now(),
    endedAt: null,
    durationMs: null,
    status: "pending",
    metadata,
  };

  if (!traceStore.has(traceId)) {
    traceStore.set(traceId, []);
    traceOrder.push(traceId);

    while (traceOrder.length > MAX_TRACES) {
      const oldest = traceOrder.shift()!;
      traceStore.delete(oldest);
    }
  }

  const spans = traceStore.get(traceId)!;
  if (spans.length < MAX_SPANS_PER_TRACE) {
    spans.push(span);
  }

  return span;
}

export function endSpan(span: TraceSpan, status: "ok" | "error" = "ok"): void {
  span.endedAt = performance.now();
  span.durationMs = Math.round(span.endedAt - span.startedAt);
  span.status = status;
}

export function getTraceTimeline(traceId: string): {
  traceId: string;
  spans: TraceSpan[];
  totalDurationMs: number;
  spanCount: number;
  errorCount: number;
  startedAt: number;
  endedAt: number;
} | null {
  const spans = traceStore.get(traceId);
  if (!spans || spans.length === 0) return null;

  const sorted = [...spans].sort((a, b) => a.startedAt - b.startedAt);
  const startedAt = sorted[0].startedAt;
  const endedAt = Math.max(...sorted.map((s) => s.endedAt ?? s.startedAt));
  const errorCount = sorted.filter((s) => s.status === "error").length;

  return {
    traceId,
    spans: sorted,
    totalDurationMs: Math.round(endedAt - startedAt),
    spanCount: sorted.length,
    errorCount,
    startedAt,
    endedAt,
  };
}

export function getAllTraceIds(): string[] {
  return [...traceOrder];
}

export function getRecentTraces(limit = 50): Array<{
  traceId: string;
  spanCount: number;
  totalDurationMs: number;
  hasErrors: boolean;
}> {
  const result: Array<{
    traceId: string;
    spanCount: number;
    totalDurationMs: number;
    hasErrors: boolean;
  }> = [];

  const ids = traceOrder.slice(-limit).reverse();
  for (const id of ids) {
    const timeline = getTraceTimeline(id);
    if (timeline) {
      result.push({
        traceId: id,
        spanCount: timeline.spanCount,
        totalDurationMs: timeline.totalDurationMs,
        hasErrors: timeline.errorCount > 0,
      });
    }
  }
  return result;
}

let _tracingInstalled = false;

export function installDistributedTracing(): () => void {
  if (_tracingInstalled) return () => {};
  _tracingInstalled = true;

  const unsub = platformBus.onAll((event: PlatformEvent) => {
    const traceId =
      event.traceId ??
      event.correlationId ??
      generateTraceId("bus");

    const span = startSpan(traceId, `bus:${event.type}`, event.source, null, {
      eventType: event.type,
      payload: typeof event.payload === "object" ? "object" : event.payload,
    });
    endSpan(span, "ok");
  });

  return () => {
    _tracingInstalled = false;
    unsub();
  };
}

export function clearTraces(): void {
  traceStore.clear();
  traceOrder.length = 0;
}
