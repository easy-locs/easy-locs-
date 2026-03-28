/**
 * Pipeline Logger — Full observability for every micro-engine step.
 * Logs input, output, duration, errors. Enables end-to-end tracing.
 */
import type { PipelineTrace } from "./pipeline.types";

const LOG_PREFIX = "[pipeline]";

export function logStepStart(stepName: string, input?: unknown) {
  const summary = input ? JSON.stringify(input).slice(0, 200) : "n/a";
  console.log(`${LOG_PREFIX} ▶ ${stepName} | input: ${summary}`);
}

export function logStepEnd(stepName: string, durationMs: number, output?: unknown) {
  const summary = output ? JSON.stringify(output).slice(0, 200) : "n/a";
  console.log(`${LOG_PREFIX} ✓ ${stepName} | ${durationMs}ms | output: ${summary}`);
}

export function logStepError(stepName: string, durationMs: number, error: unknown) {
  const msg = error instanceof Error ? error.message : String(error);
  console.error(`${LOG_PREFIX} ✗ ${stepName} | ${durationMs}ms | error: ${msg}`);
}

export function logPipelineTrace(trace: PipelineTrace) {
  console.log(
    `${LOG_PREFIX} === TRACE ${trace.pipelineId} === total: ${trace.totalDurationMs}ms, steps: ${trace.steps.length}`,
  );
  for (const step of trace.steps) {
    const icon = step.success ? "✓" : "✗";
    console.log(`  ${icon} ${step.name}: ${step.durationMs}ms${step.error ? ` (${step.error})` : ""}`);
  }
}

/** Wraps any async step with timing + logging + error capture */
export async function runStep<T>(
  stepName: string,
  input: unknown,
  fn: () => Promise<T>,
): Promise<{ data: T; durationMs: number; success: boolean; error?: string }> {
  logStepStart(stepName, input);
  const t0 = performance.now();
  try {
    const data = await fn();
    const durationMs = Math.round(performance.now() - t0);
    logStepEnd(stepName, durationMs, data);
    return { data, durationMs, success: true };
  } catch (e) {
    const durationMs = Math.round(performance.now() - t0);
    const error = e instanceof Error ? e.message : String(e);
    logStepError(stepName, durationMs, e);
    throw e;
  }
}

/** Wraps a sync step with timing + logging */
export function runStepSync<T>(
  stepName: string,
  input: unknown,
  fn: () => T,
): { data: T; durationMs: number } {
  logStepStart(stepName, input);
  const t0 = performance.now();
  const data = fn();
  const durationMs = Math.round(performance.now() - t0);
  logStepEnd(stepName, durationMs, data);
  return { data, durationMs };
}
