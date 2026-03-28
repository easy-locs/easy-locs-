/**
 * search.output.debug_trace — Runtime search execution trace.
 * Captures pipeline step timings + decisions for observability.
 * No side effects. Consumers can log or store the trace.
 */

export interface PipelineStep {
  name: string;
  durationMs: number;
  inputCount?: number;
  outputCount?: number;
  metadata?: Record<string, unknown>;
}

export interface SearchDebugTrace {
  traceId: string;
  startedAt: string;
  totalMs: number;
  steps: PipelineStep[];
  warnings: string[];
}

let _traceCounter = 0;

export function createTrace(): SearchDebugTrace {
  _traceCounter++;
  return {
    traceId: `search-${Date.now()}-${_traceCounter}`,
    startedAt: new Date().toISOString(),
    totalMs: 0,
    steps: [],
    warnings: [],
  };
}

export function addStep(
  trace: SearchDebugTrace,
  name: string,
  startMs: number,
  inputCount?: number,
  outputCount?: number,
  metadata?: Record<string, unknown>
): void {
  trace.steps.push({
    name,
    durationMs: performance.now() - startMs,
    inputCount,
    outputCount,
    metadata,
  });
}

export function finalizeTrace(trace: SearchDebugTrace, pipelineStartMs: number): SearchDebugTrace {
  trace.totalMs = performance.now() - pipelineStartMs;
  return trace;
}

export function addWarning(trace: SearchDebugTrace, warning: string): void {
  trace.warnings.push(warning);
}
