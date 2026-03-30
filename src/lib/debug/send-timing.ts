/**
 * send-timing — WhatsApp-grade instrumentation for send latency.
 * Tracks: tap → optimistic render → DB insert → realtime ACK → final UI.
 * For calls: tap → RPC → call_logs → signal → ringing → connected.
 */

export interface SendTimingTrace {
  id: string;
  type: "text" | "media" | "voice" | "location" | "call";
  t0_tap: number;
  t1_optimistic?: number;
  t2_db_insert?: number;
  t3_realtime_ack?: number;
  t4_final_render?: number;
  // Call-specific
  t_rpc?: number;
  t_call_logs?: number;
  t_signal_sent?: number;
  t_ringing?: number;
  t_connected?: number;
  // Derived
  error?: string;
  status: "pending" | "completed" | "failed";
}

const traces = new Map<string, SendTimingTrace>();
const MAX_TRACES = 100;

let traceCounter = 0;

export function startTrace(type: SendTimingTrace["type"]): string {
  const id = `trace_${++traceCounter}_${Date.now()}`;
  const trace: SendTimingTrace = {
    id,
    type,
    t0_tap: performance.now(),
    status: "pending",
  };
  traces.set(id, trace);

  // Evict old traces
  if (traces.size > MAX_TRACES) {
    const firstKey = traces.keys().next().value;
    if (firstKey) traces.delete(firstKey);
  }

  return id;
}

export function markTrace(
  traceId: string,
  checkpoint: keyof Omit<SendTimingTrace, "id" | "type" | "status" | "error">,
) {
  const trace = traces.get(traceId);
  if (!trace) return;
  (trace as any)[checkpoint] = performance.now();
}

export function completeTrace(traceId: string) {
  const trace = traces.get(traceId);
  if (!trace) return;
  trace.t4_final_render = performance.now();
  trace.status = "completed";
  logTrace(trace);
}

export function failTrace(traceId: string, error: string) {
  const trace = traces.get(traceId);
  if (!trace) return;
  trace.error = error;
  trace.status = "failed";
  logTrace(trace);
}

export function getTrace(traceId: string) {
  return traces.get(traceId) ?? null;
}

export function getAllTraces(): SendTimingTrace[] {
  return Array.from(traces.values()).reverse();
}

function logTrace(trace: SendTimingTrace) {
  const t0 = trace.t0_tap;
  const deltas: Record<string, string> = {};

  if (trace.t1_optimistic != null) deltas["tap→render"] = `${(trace.t1_optimistic - t0).toFixed(1)}ms`;
  if (trace.t2_db_insert != null) deltas["tap→DB"] = `${(trace.t2_db_insert - t0).toFixed(1)}ms`;
  if (trace.t3_realtime_ack != null) deltas["tap→realtime"] = `${(trace.t3_realtime_ack - t0).toFixed(1)}ms`;
  if (trace.t4_final_render != null) deltas["tap→final"] = `${(trace.t4_final_render - t0).toFixed(1)}ms`;

  // Call-specific
  if (trace.t_rpc != null) deltas["tap→RPC"] = `${(trace.t_rpc - t0).toFixed(1)}ms`;
  if (trace.t_call_logs != null) deltas["tap→call_logs"] = `${(trace.t_call_logs - t0).toFixed(1)}ms`;
  if (trace.t_signal_sent != null) deltas["tap→signal"] = `${(trace.t_signal_sent - t0).toFixed(1)}ms`;
  if (trace.t_ringing != null) deltas["tap→ringing"] = `${(trace.t_ringing - t0).toFixed(1)}ms`;
  if (trace.t_connected != null) deltas["tap→connected"] = `${(trace.t_connected - t0).toFixed(1)}ms`;

  console.log(
    `%c[SendTiming] ${trace.type} ${trace.status}`,
    trace.status === "completed" ? "color: #4ade80" : "color: #f87171",
    deltas,
  );
}
