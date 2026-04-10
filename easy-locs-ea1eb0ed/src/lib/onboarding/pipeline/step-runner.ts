/**
 * Step Runner — Resumable, retryable, observable step execution wrapper.
 * Every pipeline step runs through this. No exceptions.
 */
import type { StepState, StepStatus } from "./contracts";

const LOG = "[pipeline]";

export interface StepContext {
  runId: string;
  stepIndex: number;
  maxRetries: number;
  /** If true, a failure here does not kill the pipeline */
  softFail: boolean;
}

export interface StepOutput<T> {
  state: StepState;
  data: T | null;
}

/**
 * Execute a single pipeline step with full observability.
 * Supports retry, soft-fail, and structured logging.
 */
export async function executeStep<TIn, TOut>(
  name: string,
  input: TIn,
  ctx: StepContext,
  fn: (input: TIn) => Promise<TOut>,
): Promise<StepOutput<TOut>> {
  const inputSummary = summarize(input);
  let lastError: string | null = null;
  let retryCount = 0;

  for (let attempt = 0; attempt <= ctx.maxRetries; attempt++) {
    const startedAt = new Date().toISOString();
    const t0 = performance.now();

    console.log(`${LOG} ▶ [${ctx.runId.slice(0, 8)}] ${name} attempt=${attempt} input=${inputSummary}`);

    try {
      const data = await fn(input);
      const durationMs = Math.round(performance.now() - t0);
      const outputSummary = summarize(data);

      console.log(`${LOG} ✓ [${ctx.runId.slice(0, 8)}] ${name} ${durationMs}ms output=${outputSummary}`);

      return {
        state: {
          name,
          status: "success",
          startedAt,
          completedAt: new Date().toISOString(),
          durationMs,
          inputSummary,
          outputSummary,
          error: null,
          retryCount,
        },
        data,
      };
    } catch (e) {
      const durationMs = Math.round(performance.now() - t0);
      lastError = e instanceof Error ? e.message : String(e);
      retryCount = attempt;

      console.error(`${LOG} ✗ [${ctx.runId.slice(0, 8)}] ${name} attempt=${attempt} ${durationMs}ms error=${lastError}`);

      if (attempt < ctx.maxRetries) {
        // Exponential backoff: 500ms, 1s, 2s...
        await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)));
      }
    }
  }

  // All retries exhausted
  const finalStatus: StepStatus = ctx.softFail ? "failed" : "failed";
  const state: StepState = {
    name,
    status: finalStatus,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    durationMs: 0,
    inputSummary,
    outputSummary: "",
    error: lastError,
    retryCount,
  };

  if (!ctx.softFail) {
    return { state, data: null };
  }

  // Soft fail: return null data but don't throw
  console.warn(`${LOG} ⚠ [${ctx.runId.slice(0, 8)}] ${name} soft-failed, pipeline continues`);
  return { state, data: null };
}

/** Execute a sync step (pure functions) */
export function executeStepSync<TIn, TOut>(
  name: string,
  input: TIn,
  runId: string,
  fn: (input: TIn) => TOut,
): StepOutput<TOut> {
  const inputSummary = summarize(input);
  const startedAt = new Date().toISOString();
  const t0 = performance.now();

  console.log(`${LOG} ▶ [${runId.slice(0, 8)}] ${name} input=${inputSummary}`);

  try {
    const data = fn(input);
    const durationMs = Math.round(performance.now() - t0);
    const outputSummary = summarize(data);

    console.log(`${LOG} ✓ [${runId.slice(0, 8)}] ${name} ${durationMs}ms output=${outputSummary}`);

    return {
      state: {
        name,
        status: "success",
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs,
        inputSummary,
        outputSummary,
        error: null,
        retryCount: 0,
      },
      data,
    };
  } catch (e) {
    const durationMs = Math.round(performance.now() - t0);
    const error = e instanceof Error ? e.message : String(e);
    console.error(`${LOG} ✗ [${runId.slice(0, 8)}] ${name} ${durationMs}ms error=${error}`);

    return {
      state: {
        name,
        status: "failed",
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs,
        inputSummary,
        outputSummary: "",
        error,
        retryCount: 0,
      },
      data: null,
    };
  }
}

function summarize(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return value.length > 80 ? value.slice(0, 80) + "…" : value;
  if (Array.isArray(value)) return `[${value.length} items]`;
  if (typeof value === "object") {
    const keys = Object.keys(value);
    return `{${keys.slice(0, 5).join(",")}}${keys.length > 5 ? `…+${keys.length - 5}` : ""}`;
  }
  return String(value);
}
