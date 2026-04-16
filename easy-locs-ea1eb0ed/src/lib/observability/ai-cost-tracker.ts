/**
 * AI latency + cost tracker.
 *
 * Records each AI/LLM call (provider, model, token counts, latency, cost)
 * and exposes rolling aggregations for the observability dashboard.
 * Feeds RED metrics and structuredLogger so alerting rules apply uniformly.
 */

import { structuredLogger } from "./structured-logger";
import { recordRed } from "./red-metrics";

export interface AiCallSample {
  provider: string;
  model: string;
  operation: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  latency_ms: number;
  success: boolean;
  error_code?: string;
  timestamp: number;
}

const BUFFER: AiCallSample[] = [];
const MAX_BUFFER = 2000;

/** Reference pricing per 1K tokens (USD). Caller can override via options. */
export const DEFAULT_PRICING: Record<string, { input: number; output: number }> = {
  "gpt-4o": { input: 0.0025, output: 0.01 },
  "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
  "gpt-4-turbo": { input: 0.01, output: 0.03 },
  "claude-3-5-sonnet": { input: 0.003, output: 0.015 },
  "claude-3-opus": { input: 0.015, output: 0.075 },
  "claude-3-haiku": { input: 0.00025, output: 0.00125 },
  "gemini-1.5-pro": { input: 0.00125, output: 0.005 },
  "gemini-1.5-flash": { input: 0.000075, output: 0.0003 },
};

export function estimateCost(model: string, input_tokens: number, output_tokens: number): number {
  const pricing = DEFAULT_PRICING[model];
  if (!pricing) return 0;
  return (input_tokens / 1000) * pricing.input + (output_tokens / 1000) * pricing.output;
}

export function recordAiCall(sample: Omit<AiCallSample, "timestamp" | "cost_usd"> & {
  timestamp?: number;
  cost_usd?: number;
}): void {
  const cost = sample.cost_usd ?? estimateCost(sample.model, sample.input_tokens, sample.output_tokens);
  const entry: AiCallSample = {
    ...sample,
    cost_usd: cost,
    timestamp: sample.timestamp ?? Date.now(),
  };
  BUFFER.push(entry);
  if (BUFFER.length > MAX_BUFFER) BUFFER.shift();

  recordRed({
    domain: "intelligence",
    action: `${entry.provider}.${entry.operation}`,
    route: entry.model,
    duration_ms: entry.latency_ms,
    error: !entry.success,
  });

  structuredLogger.info("intelligence", `ai.${entry.operation}`, `AI call via ${entry.model}`, {
    duration_ms: entry.latency_ms,
    result: entry.success ? "success" : "failure",
    external_provider: entry.provider,
    error_code: entry.error_code,
    payload_summary: {
      model: entry.model,
      input_tokens: entry.input_tokens,
      output_tokens: entry.output_tokens,
      cost_usd: Number(cost.toFixed(6)),
    },
  });
}

export interface AiCostSnapshot {
  window_ms: number;
  total_calls: number;
  total_errors: number;
  total_cost_usd: number;
  total_input_tokens: number;
  total_output_tokens: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  by_model: Record<string, {
    calls: number;
    errors: number;
    cost_usd: number;
    avg_latency_ms: number;
    p95_latency_ms: number;
  }>;
  by_operation: Record<string, { calls: number; errors: number; cost_usd: number }>;
}

function p95(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.floor((sorted.length - 1) * 0.95);
  return sorted[idx];
}

export function aiCostSnapshot(windowMs = 60 * 60_000): AiCostSnapshot {
  const since = Date.now() - windowMs;
  const samples = BUFFER.filter((s) => s.timestamp >= since);

  const byModel = new Map<string, AiCallSample[]>();
  const byOp: Record<string, { calls: number; errors: number; cost_usd: number }> = {};
  let totalCost = 0;
  let totalIn = 0;
  let totalOut = 0;
  let errors = 0;
  const latencies: number[] = [];

  for (const s of samples) {
    totalCost += s.cost_usd;
    totalIn += s.input_tokens;
    totalOut += s.output_tokens;
    latencies.push(s.latency_ms);
    if (!s.success) errors++;
    const mList = byModel.get(s.model);
    if (mList) mList.push(s);
    else byModel.set(s.model, [s]);
    const op = byOp[s.operation] ?? { calls: 0, errors: 0, cost_usd: 0 };
    op.calls++;
    if (!s.success) op.errors++;
    op.cost_usd += s.cost_usd;
    byOp[s.operation] = op;
  }

  const by_model: AiCostSnapshot["by_model"] = {};
  for (const [model, list] of byModel) {
    const lat = list.map((s) => s.latency_ms);
    by_model[model] = {
      calls: list.length,
      errors: list.filter((s) => !s.success).length,
      cost_usd: list.reduce((sum, s) => sum + s.cost_usd, 0),
      avg_latency_ms: Math.round(lat.reduce((a, b) => a + b, 0) / lat.length),
      p95_latency_ms: Math.round(p95(lat)),
    };
  }

  return {
    window_ms: windowMs,
    total_calls: samples.length,
    total_errors: errors,
    total_cost_usd: Number(totalCost.toFixed(6)),
    total_input_tokens: totalIn,
    total_output_tokens: totalOut,
    avg_latency_ms: latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0,
    p95_latency_ms: Math.round(p95(latencies)),
    by_model,
    by_operation: byOp,
  };
}

export async function instrumentAiCall<T>(
  meta: {
    provider: string;
    model: string;
    operation: string;
    input_tokens: number;
  },
  fn: () => Promise<{ result: T; output_tokens: number }>,
): Promise<T> {
  const started = performance.now();
  try {
    const { result, output_tokens } = await fn();
    recordAiCall({
      provider: meta.provider,
      model: meta.model,
      operation: meta.operation,
      input_tokens: meta.input_tokens,
      output_tokens,
      latency_ms: Math.round(performance.now() - started),
      success: true,
    });
    return result;
  } catch (err: unknown) {
    const code = err instanceof Error ? (err as Error & { code?: string }).code : undefined;
    recordAiCall({
      provider: meta.provider,
      model: meta.model,
      operation: meta.operation,
      input_tokens: meta.input_tokens,
      output_tokens: 0,
      latency_ms: Math.round(performance.now() - started),
      success: false,
      error_code: code,
    });
    throw err;
  }
}

export function getAiBuffer(): readonly AiCallSample[] {
  return BUFFER;
}

export function clearAiBuffer(): void {
  BUFFER.length = 0;
}
