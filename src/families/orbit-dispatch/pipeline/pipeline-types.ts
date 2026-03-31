/**
 * Pipeline Types — Strict phase definitions for the Orbit Action Pipeline.
 * Every executor must implement: intent → canonical → optimistic → transport → reconcile
 * No phase may call another phase's logic. No shortcuts.
 */

/** Phase markers for tracing and debugging */
export type PipelinePhase = "intent" | "canonical" | "optimistic" | "transport" | "reconcile" | "preview" | "instant_insert" | "background_transport";

/** Canonical result returned by every executor */
export interface ExecutorResult {
  ok: boolean;
  messageId?: string;
  sessionId?: string;
  error?: string;
  phase?: PipelinePhase;
}

/** Canonical send context — resolved ONCE by the dispatcher, passed to executor */
export interface ResolvedContext {
  conversationId: string;
  senderUserId: string;
  senderOrbitId: string;
  receiverOrbitId: string | null;
  orgId: string | null;
}

/** Phase trace for observability */
export interface PipelineTrace {
  executorName: string;
  startedAt: number;
  phases: Array<{ phase: PipelinePhase; startedAt: number; endedAt?: number }>;
  completedAt?: number;
  error?: string;
}

export function createTrace(name: string): PipelineTrace {
  return {
    executorName: name,
    startedAt: Date.now(),
    phases: [],
  };
}

export function enterPhase(trace: PipelineTrace, phase: PipelinePhase): void {
  trace.phases.push({ phase, startedAt: Date.now() });
}

export function exitPhase(trace: PipelineTrace): void {
  const last = trace.phases[trace.phases.length - 1];
  if (last) last.endedAt = Date.now();
}

export function completeExecutorTrace(trace: PipelineTrace): void {
  trace.completedAt = Date.now();
  if (import.meta.env.DEV) {
    const total = trace.completedAt - trace.startedAt;
    const phaseSummary = trace.phases
      .map((p) => `${p.phase}:${(p.endedAt || Date.now()) - p.startedAt}ms`)
      .join(" → ");
    console.debug(`[Pipeline:${trace.executorName}] ${total}ms — ${phaseSummary}`);
  }
}

export function failExecutorTrace(trace: PipelineTrace, error: string): void {
  trace.completedAt = Date.now();
  trace.error = error;
  if (import.meta.env.DEV) {
    console.warn(`[Pipeline:${trace.executorName}] FAILED at ${trace.phases[trace.phases.length - 1]?.phase}: ${error}`);
  }
}
