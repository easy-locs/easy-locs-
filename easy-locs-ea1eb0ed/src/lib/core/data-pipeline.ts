import { platformBus } from "@/lib/shared/platform-bus";

export interface PipelineContext<T = unknown> {
  input: T;
  normalized: T;
  validated: boolean;
  errors: string[];
  warnings: string[];
  source: string;
  correlationId: string;
  timestamp: number;
  metadata: Record<string, unknown>;
}

export type PipelineStep<TIn, TOut> = (
  ctx: PipelineContext<TIn>
) => PipelineContext<TOut> | Promise<PipelineContext<TOut>>;

export type NormalizeFn<T> = (input: T) => T;
export type ValidateFn<T> = (input: T) => { valid: boolean; errors: string[]; warnings?: string[] };
export type StoreFn<T> = (input: T, ctx: PipelineContext<T>) => Promise<{ ok: boolean; error?: string }>;
export type ExposeFn<T, R> = (input: T, ctx: PipelineContext<T>) => R;

export interface PipelineConfig<TInput, TOutput = TInput> {
  name: string;
  normalize: NormalizeFn<TInput>;
  validate: ValidateFn<TInput>;
  store?: StoreFn<TInput>;
  expose: ExposeFn<TInput, TOutput>;
  onError?: (ctx: PipelineContext<TInput>, error: unknown) => void;
}

export interface PipelineResult<T> {
  ok: boolean;
  data: T | null;
  errors: string[];
  warnings: string[];
  durationMs: number;
  correlationId: string;
}

let _correlationCounter = 0;

function generateCorrelationId(pipelineName: string): string {
  _correlationCounter += 1;
  return `${pipelineName}-${Date.now()}-${_correlationCounter}`;
}

export function createPipeline<TInput, TOutput = TInput>(
  config: PipelineConfig<TInput, TOutput>
) {
  return async function run(
    input: TInput,
    source: string = "unknown",
    meta: Record<string, unknown> = {}
  ): Promise<PipelineResult<TOutput>> {
    const startMs = performance.now();
    const correlationId = generateCorrelationId(config.name);

    const ctx: PipelineContext<TInput> = {
      input,
      normalized: input,
      validated: false,
      errors: [],
      warnings: [],
      source,
      correlationId,
      timestamp: Date.now(),
      metadata: { ...meta },
    };

    try {
      ctx.normalized = config.normalize(ctx.input);

      const validation = config.validate(ctx.normalized);
      ctx.validated = validation.valid;
      ctx.errors = validation.errors;
      if (validation.warnings) ctx.warnings = validation.warnings;

      if (!ctx.validated) {
        return {
          ok: false,
          data: null,
          errors: ctx.errors,
          warnings: ctx.warnings,
          durationMs: performance.now() - startMs,
          correlationId,
        };
      }

      if (config.store) {
        const storeResult = await config.store(ctx.normalized, ctx);
        if (!storeResult.ok) {
          ctx.errors.push(storeResult.error || "Store failed");
          return {
            ok: false,
            data: null,
            errors: ctx.errors,
            warnings: ctx.warnings,
            durationMs: performance.now() - startMs,
            correlationId,
          };
        }
      }

      const output = config.expose(ctx.normalized, ctx);

      platformBus.emit(
        "system:pipeline_completed",
        {
          pipeline: config.name,
          correlationId,
          durationMs: performance.now() - startMs,
          source,
          warnings: ctx.warnings.length,
        },
        "system"
      );

      return {
        ok: true,
        data: output,
        errors: [],
        warnings: ctx.warnings,
        durationMs: performance.now() - startMs,
        correlationId,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Pipeline error";
      ctx.errors.push(message);

      config.onError?.(ctx, error);

      platformBus.emit(
        "system:pipeline_error",
        {
          pipeline: config.name,
          correlationId,
          error: message,
          source,
        },
        "system"
      );

      return {
        ok: false,
        data: null,
        errors: ctx.errors,
        warnings: ctx.warnings,
        durationMs: performance.now() - startMs,
        correlationId,
      };
    }
  };
}

export function composeNormalizers<T>(...fns: NormalizeFn<T>[]): NormalizeFn<T> {
  return (input: T) => fns.reduce((acc, fn) => fn(acc), input);
}

export function composeValidators<T>(...fns: ValidateFn<T>[]): ValidateFn<T> {
  return (input: T) => {
    const allErrors: string[] = [];
    const allWarnings: string[] = [];
    for (const fn of fns) {
      const result = fn(input);
      allErrors.push(...result.errors);
      if (result.warnings) allWarnings.push(...result.warnings);
    }
    return {
      valid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
    };
  };
}

export const trimString = (s: string | null | undefined): string =>
  (s || "").trim();

export const normalizePhone = (phone: string): string => {
  const digits = phone.replace(/[^\d+]/g, "");
  return digits.startsWith("+") ? digits : `+${digits}`;
};

export const normalizeEmail = (email: string): string =>
  email.trim().toLowerCase();

export const normalizeCountryCode = (code: string): string =>
  code.trim().toUpperCase().slice(0, 2);
