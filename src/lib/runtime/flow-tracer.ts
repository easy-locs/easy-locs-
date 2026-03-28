/**
 * flow-tracer — Atomic runtime unit: traces every flow step with structured logs.
 * Single responsibility: flow lifecycle tracking (start → step → end/fail).
 */

export type FlowStatus = "running" | "success" | "failed" | "timeout" | "retrying";

export interface FlowStep {
  name: string;
  status: FlowStatus;
  startedAt: number;
  endedAt?: number;
  latencyMs?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface FlowTrace {
  flowId: string;
  flowName: string;
  domain: string;
  status: FlowStatus;
  steps: FlowStep[];
  startedAt: number;
  endedAt?: number;
  totalLatencyMs?: number;
  retryCount: number;
  lastError?: string;
}

const MAX_TRACES = 200;
let traces: FlowTrace[] = [];
const listeners = new Set<() => void>();

function notify() { listeners.forEach(fn => fn()); }

function uid(): string {
  return `fl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function startFlow(domain: string, flowName: string): FlowTrace {
  const trace: FlowTrace = {
    flowId: uid(), flowName, domain,
    status: "running", steps: [],
    startedAt: Date.now(), retryCount: 0,
  };
  traces = [trace, ...traces].slice(0, MAX_TRACES);
  console.log(`[FLOW][${domain}][${flowName}] started`, { flowId: trace.flowId });
  notify();
  return trace;
}

export function addStep(trace: FlowTrace, stepName: string): FlowStep {
  const step: FlowStep = { name: stepName, status: "running", startedAt: Date.now() };
  trace.steps.push(step);
  console.log(`[FLOW][${trace.domain}][${trace.flowName}] step:${stepName}`, { flowId: trace.flowId });
  return step;
}

export function completeStep(trace: FlowTrace, step: FlowStep, meta?: Record<string, unknown>) {
  step.endedAt = Date.now();
  step.latencyMs = step.endedAt - step.startedAt;
  step.status = "success";
  step.metadata = meta;
  notify();
}

export function failStep(trace: FlowTrace, step: FlowStep, error: string) {
  step.endedAt = Date.now();
  step.latencyMs = step.endedAt - step.startedAt;
  step.status = "failed";
  step.error = error;
  trace.lastError = error;
  console.error(`[FLOW][${trace.domain}][${trace.flowName}] step:${step.name} FAILED`, { error, flowId: trace.flowId });
  notify();
}

export function endFlow(trace: FlowTrace, status: "success" | "failed" = "success") {
  trace.endedAt = Date.now();
  trace.totalLatencyMs = trace.endedAt - trace.startedAt;
  trace.status = status;
  console.log(`[FLOW][${trace.domain}][${trace.flowName}] ${status} in ${trace.totalLatencyMs}ms`, { flowId: trace.flowId });
  notify();
}

export function markRetry(trace: FlowTrace) {
  trace.retryCount++;
  trace.status = "retrying";
  notify();
}

export function getTraces(): FlowTrace[] { return [...traces]; }
export function clearTraces() { traces = []; notify(); }
export function subscribeTraces(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
