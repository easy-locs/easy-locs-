/**
 * Data Pipeline Engine — PASS68 Block AY
 * ETL patterns, data aggregation, reporting pipelines, scheduled transforms.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type PipelineStatus = "idle" | "running" | "completed" | "failed" | "cancelled";

export interface PipelineStep<TIn = any, TOut = any> {
  id: string;
  label: string;
  transform: (input: TIn, ctx: PipelineContext) => Promise<TOut> | TOut;
  /** Optional validation before transform */
  validate?: (input: TIn) => boolean;
  /** If true, failure skips this step instead of aborting */
  optional?: boolean;
}

export interface PipelineContext {
  pipelineId: string;
  runId: string;
  startedAt: number;
  metadata: Record<string, unknown>;
  /** Accumulated metrics per step */
  metrics: StepMetric[];
  /** Signal to cancel */
  cancelled: boolean;
}

export interface StepMetric {
  stepId: string;
  durationMs: number;
  inputCount?: number;
  outputCount?: number;
  skipped: boolean;
  error?: string;
}

export interface PipelineResult<T = any> {
  status: PipelineStatus;
  output: T | null;
  metrics: StepMetric[];
  totalDurationMs: number;
  error?: string;
}

// ─── Pipeline Builder ────────────────────────────────────────────────────────

export class DataPipeline<TInitial = any> {
  private steps: PipelineStep[] = [];
  readonly id: string;

  constructor(id: string) {
    this.id = id;
  }

  /** Add a transform step */
  step<TIn, TOut>(
    id: string,
    label: string,
    transform: PipelineStep<TIn, TOut>["transform"],
    opts?: { validate?: PipelineStep<TIn, TOut>["validate"]; optional?: boolean }
  ): DataPipeline<TInitial> {
    this.steps.push({ id, label, transform, validate: opts?.validate, optional: opts?.optional });
    return this;
  }

  /** Execute the pipeline with initial input */
  async run(input: TInitial, metadata: Record<string, unknown> = {}): Promise<PipelineResult> {
    const ctx: PipelineContext = {
      pipelineId: this.id,
      runId: crypto.randomUUID(),
      startedAt: Date.now(),
      metadata,
      metrics: [],
      cancelled: false,
    };

    let current: any = input;

    for (const s of this.steps) {
      if (ctx.cancelled) {
        return this.result("cancelled", null, ctx);
      }

      const t0 = Date.now();
      try {
        // Validate
        if (s.validate && !s.validate(current)) {
          if (s.optional) {
            ctx.metrics.push({ stepId: s.id, durationMs: 0, skipped: true });
            continue;
          }
          throw new Error(`Validation failed at step "${s.id}"`);
        }

        const inputCount = Array.isArray(current) ? current.length : undefined;
        current = await s.transform(current, ctx);
        const outputCount = Array.isArray(current) ? current.length : undefined;

        ctx.metrics.push({ stepId: s.id, durationMs: Date.now() - t0, inputCount, outputCount, skipped: false });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        ctx.metrics.push({ stepId: s.id, durationMs: Date.now() - t0, skipped: false, error: errMsg });

        if (s.optional) continue;
        return this.result("failed", null, ctx, errMsg);
      }
    }

    return this.result("completed", current, ctx);
  }

  /** Cancel a running pipeline via context */
  createCancellable(input: TInitial, metadata: Record<string, unknown> = {}) {
    let cancelFn: () => void = () => {};
    const promise = new Promise<PipelineResult>((resolve) => {
      const ctx: PipelineContext = {
        pipelineId: this.id,
        runId: crypto.randomUUID(),
        startedAt: Date.now(),
        metadata,
        metrics: [],
        cancelled: false,
      };
      cancelFn = () => { ctx.cancelled = true; };

      (async () => {
        let current: any = input;
        for (const s of this.steps) {
          if (ctx.cancelled) return resolve(this.result("cancelled", null, ctx));
          const t0 = Date.now();
          try {
            if (s.validate && !s.validate(current)) {
              if (s.optional) { ctx.metrics.push({ stepId: s.id, durationMs: 0, skipped: true }); continue; }
              throw new Error(`Validation failed at step "${s.id}"`);
            }
            current = await s.transform(current, ctx);
            ctx.metrics.push({ stepId: s.id, durationMs: Date.now() - t0, skipped: false });
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            ctx.metrics.push({ stepId: s.id, durationMs: Date.now() - t0, skipped: false, error: errMsg });
            if (s.optional) continue;
            return resolve(this.result("failed", null, ctx, errMsg));
          }
        }
        resolve(this.result("completed", current, ctx));
      })();
    });

    return { promise, cancel: cancelFn };
  }

  private result(status: PipelineStatus, output: any, ctx: PipelineContext, error?: string): PipelineResult {
    return { status, output, metrics: ctx.metrics, totalDurationMs: Date.now() - ctx.startedAt, error };
  }
}

// ─── Aggregation Helpers ─────────────────────────────────────────────────────

export interface AggregateResult<K extends string = string> {
  key: K;
  count: number;
  sum: number;
  avg: number;
  min: number;
  max: number;
}

/** Group and aggregate numeric data */
export function aggregate<T>(
  data: T[],
  keyFn: (item: T) => string,
  valueFn: (item: T) => number
): AggregateResult[] {
  const groups = new Map<string, number[]>();

  for (const item of data) {
    const key = keyFn(item);
    const val = valueFn(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(val);
  }

  return Array.from(groups.entries()).map(([key, values]) => ({
    key,
    count: values.length,
    sum: values.reduce((a, b) => a + b, 0),
    avg: values.reduce((a, b) => a + b, 0) / values.length,
    min: Math.min(...values),
    max: Math.max(...values),
  }));
}

/** Time-bucket aggregation (group by day/week/month) */
export function timeBucket<T>(
  data: T[],
  dateFn: (item: T) => Date | string,
  valueFn: (item: T) => number,
  bucket: "day" | "week" | "month" = "month"
): AggregateResult[] {
  return aggregate(data, (item) => {
    const d = typeof dateFn(item) === "string" ? new Date(dateFn(item) as string) : dateFn(item) as Date;
    switch (bucket) {
      case "day": return d.toISOString().slice(0, 10);
      case "week": {
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d);
        monday.setDate(diff);
        return monday.toISOString().slice(0, 10);
      }
      case "month": return d.toISOString().slice(0, 7);
    }
  }, valueFn);
}

// ─── Transform Utilities ─────────────────────────────────────────────────────

/** Deduplicate by key function */
export function deduplicate<T>(data: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  return data.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Batch array into chunks */
export function batch<T>(data: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < data.length; i += size) {
    batches.push(data.slice(i, i + size));
  }
  return batches;
}

/** Flatten nested arrays */
export function flatten<T>(data: T[][]): T[] {
  return data.reduce((acc, arr) => acc.concat(arr), []);
}

/** Map with concurrency limit */
export async function mapConcurrent<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  concurrency: number = 5
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let idx = 0;

  const worker = async () => {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i], i);
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

// ─── Reporting Pipeline Presets ──────────────────────────────────────────────

/** Create a standard reporting pipeline: filter → transform → aggregate → format */
export function createReportPipeline<T>(config: {
  id: string;
  filter?: (item: T) => boolean;
  transform?: (item: T) => T;
  keyFn: (item: T) => string;
  valueFn: (item: T) => number;
  formatResult?: (agg: AggregateResult[]) => any;
}): DataPipeline<T[]> {
  const pipeline = new DataPipeline<T[]>(config.id);

  if (config.filter) {
    pipeline.step("filter", "Filter data", (data) => data.filter(config.filter!));
  }

  if (config.transform) {
    pipeline.step("transform", "Transform data", (data) => (data as T[]).map(config.transform!));
  }

  pipeline.step("aggregate", "Aggregate data", (data) =>
    aggregate(data as T[], config.keyFn, config.valueFn)
  );

  if (config.formatResult) {
    pipeline.step("format", "Format results", (data) => config.formatResult!(data as AggregateResult[]));
  }

  return pipeline;
}

// ─── Data Quality ────────────────────────────────────────────────────────────

export interface DataQualityReport {
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  qualityScore: number;
  issues: Array<{ field: string; issue: string; count: number }>;
}

/** Assess data quality for a dataset */
export function assessDataQuality<T extends Record<string, any>>(
  data: T[],
  requiredFields: string[]
): DataQualityReport {
  const issues = new Map<string, number>();
  let invalid = 0;

  for (const record of data) {
    let recordValid = true;
    for (const field of requiredFields) {
      const val = record[field];
      if (val === null || val === undefined || val === "") {
        const key = `${field}:missing`;
        issues.set(key, (issues.get(key) || 0) + 1);
        recordValid = false;
      }
    }
    if (!recordValid) invalid++;
  }

  return {
    totalRecords: data.length,
    validRecords: data.length - invalid,
    invalidRecords: invalid,
    qualityScore: data.length > 0 ? Math.round(((data.length - invalid) / data.length) * 100) : 100,
    issues: Array.from(issues.entries()).map(([key, count]) => {
      const [field, issue] = key.split(":");
      return { field, issue, count };
    }),
  };
}
