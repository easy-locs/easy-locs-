/**
 * Bespoke bulk-pipeline content adapters (task #945).
 *
 * Each entry corresponds to a §4 content surface called out in the P4
 * phase plan:
 *
 *   content.food   — food-normalizer, food-audit, food-publish,
 *                     food-visual-clean, food-visibility-gate,
 *                     food-menu-builder, food-rescrape-monitor,
 *                     deliveroo-dubai-food
 *   content.search — sync-meilisearch-cron, search.index.trigger,
 *                     search-global, ranking-batch-runner
 *   content.shop   — shop-import-pipeline, shop-import-processor,
 *                     shop-monitor-agent, shop-transfer-protocol
 *   content.media  — media-processor, video-processor, social-preview,
 *                     extract-article
 *
 * All four bulk adapters share the same shape; they differ only in
 * `domain`, `agent.slug`, and the runner registry they consult. They
 * register against the canonical `NON_SENSITIVE_BULK_UPDATE` task type
 * (MEDIUM, approval-gated by `MEDIUM_TASK_APPROVAL_POLICY`).
 *
 * Rollback strategy is `manual` — bulk pipelines mutate many rows and
 * the inverse-of-pipeline is generally a separately-authored
 * compensating run, not a single-row snapshot restore. The `rollback`
 * handler hands off to a registered compensating runner when one
 * exists; when none is registered it returns success=false so the row
 * stays in `rollback_failed` until a human resolves it (no silent
 * success).
 */

import type {
  AdapterResult,
  DomainAdapter,
  ExecutionContext,
  ExecutionTask,
  RollbackContext,
  RollbackInvocation,
  RollbackResult,
} from "../../types.ts";
import {
  CONTENT_DOMAINS,
  CONTENT_ERROR_CODES,
  CONTENT_TASK_TYPES,
  validateBulkRunPayload,
  type ContentBulkRunPayload,
  type ContentDomain,
} from "./types.ts";
import {
  contentBulkIdempotencyKey,
  contentBulkLockKey,
  hashContentPayload,
} from "./policy.ts";

/** Result a bulk runner returns to the adapter. */
export interface BulkRunnerResult {
  /** Caller-readable summary written to engine_run_logs. */
  summary: string;
  /** Number of rows the runner touched. */
  rowsAffected: number;
  /** Optional structured stats forwarded into AdapterResult.output. */
  stats?: Record<string, unknown>;
  /**
   * Optional verification reading. The bulk verifier compares the
   * runner's `expected` claim against `observed`; non-equal pairs
   * surface as VERIFICATION_MISMATCH.
   */
  expected?: Record<string, unknown>;
  observed?: Record<string, unknown>;
}

export interface BulkRunner {
  run(params: Record<string, unknown>, opts: { rowBudget?: number }): Promise<BulkRunnerResult>;
  /**
   * Optional inverse runner. When omitted the adapter's rollback
   * handler returns `NO_COMPENSATING_RUN` so the row sticks in
   * `rollback_failed` and a human inspects it.
   */
  compensate?(
    params: Record<string, unknown>,
    forwardOutput: Record<string, unknown> | null,
  ): Promise<BulkRunnerResult>;
}

export type BulkRunnerRegistry = Record<string, BulkRunner>;

export interface ContentBulkAdapterOptions {
  domain: ContentDomain;
  /** Display-friendly name used in logs and the agent record. */
  displayName: string;
  /** Free-form description for system.agents.metadata. */
  description: string;
  /** Pipeline → runner map. The adapter routes by `payload.pipeline`. */
  runners: BulkRunnerRegistry;
  /** Default row budget when the caller doesn't pass `payload.row_budget`. */
  defaultRowBudget?: number;
  now?: () => Date;
}

const NO_COMPENSATING_RUN = "NO_COMPENSATING_RUN";

export function createContentBulkAdapter(
  opts: ContentBulkAdapterOptions,
): DomainAdapter<null, Record<string, unknown>> {
  const now = opts.now ?? (() => new Date());
  const ts = () => now().toISOString();
  const slug = opts.domain;

  return {
    domain: opts.domain,
    taskType: CONTENT_TASK_TYPES.BULK_RUN,
    agent: {
      slug,
      version: "1.0.0",
      kind: "business.adapter",
      displayName: opts.displayName,
      ownerTeam: "content",
      policyProfile: "medium-approval",
      quotas: { max_runs_per_min: 30, max_runs_per_day: 5_000 },
      metadata: {
        description: opts.description,
        rollback_strategy: "manual",
        verifier: `${slug}.bulk`,
        canonical_task_type: CONTENT_TASK_TYPES.BULK_RUN,
        registered_pipelines: Object.keys(opts.runners).sort(),
      },
    },
    rollback_strategy: "manual",

    getLockKey(task: ExecutionTask): string {
      const v = validateBulkRunPayload(task.payload);
      const pipeline = v.data?.pipeline ?? task.entity_id ?? "unknown";
      return contentBulkLockKey(opts.domain, pipeline);
    },

    getIdempotencyKey(task: ExecutionTask): string | null {
      const fromTask = (task.idempotency_key ?? "").trim();
      if (fromTask) return fromTask;
      const v = validateBulkRunPayload(task.payload);
      if (!v.ok || !v.data) return null;
      const hash = v.data.payload_hash && v.data.payload_hash.trim() !== ""
        ? v.data.payload_hash
        : hashContentPayload(task.payload ?? {});
      return contentBulkIdempotencyKey(opts.domain, v.data.pipeline, hash);
    },

    async snapshotProvider(): Promise<null> {
      // Bulk pipelines do not have a single-entity snapshot. Compensation
      // is handled by a registered inverse runner instead.
      return null;
    },

    async rollback(
      _ctx: RollbackContext,
      invocation: RollbackInvocation<null, Record<string, unknown>>,
    ): Promise<RollbackResult> {
      const fwd = (invocation.output ?? {}) as Record<string, unknown>;
      const pipeline = (fwd.pipeline as string | undefined) ?? "";
      if (!pipeline) {
        return {
          success: false,
          errorCode: NO_COMPENSATING_RUN,
          errorMessage: "rollback: forward output missing `pipeline`",
          logs: [`[${ts()}] rollback.no_pipeline`],
        };
      }
      const runner = opts.runners[pipeline];
      if (!runner?.compensate) {
        return {
          success: false,
          errorCode: NO_COMPENSATING_RUN,
          errorMessage:
            `pipeline "${pipeline}" has no registered compensating runner; ` +
            `manual reconciliation required`,
          logs: [`[${ts()}] rollback.no_compensator pipeline=${pipeline}`],
        };
      }
      try {
        const r = await runner.compensate(
          (fwd.params as Record<string, unknown> | undefined) ?? {},
          fwd,
        );
        return {
          success: true,
          output: { pipeline, ...(r.stats ?? {}), summary: r.summary, rowsAffected: r.rowsAffected },
          logs: [`[${ts()}] rollback.ok pipeline=${pipeline} rows=${r.rowsAffected}`],
        };
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        return {
          success: false,
          errorCode: CONTENT_ERROR_CODES.PIPELINE_FAILED,
          errorMessage: `compensating runner threw: ${message}`,
          logs: [`[${ts()}] rollback.threw ${message}`],
        };
      }
    },

    async execute(ctx: ExecutionContext): Promise<AdapterResult> {
      const logs: string[] = [];
      const actionsTaken: string[] = [];

      const v = validateBulkRunPayload(ctx.task.payload);
      if (!v.ok || !v.data) {
        return {
          success: false,
          errorCode: CONTENT_ERROR_CODES.INVALID_PAYLOAD,
          errorMessage: v.reason ?? "payload validation failed",
          logs: [`[${ts()}] validate.failed: ${v.reason}`],
        };
      }
      const p: ContentBulkRunPayload = v.data;
      const runner = opts.runners[p.pipeline];
      if (!runner) {
        return {
          success: false,
          errorCode: CONTENT_ERROR_CODES.INVALID_PAYLOAD,
          errorMessage:
            `pipeline "${p.pipeline}" is not registered for ${opts.domain}; ` +
            `known pipelines: ${Object.keys(opts.runners).sort().join(", ") || "(none)"}`,
          logs: [`[${ts()}] validate.unknown_pipeline ${p.pipeline}`],
        };
      }
      logs.push(`[${ts()}] validate.ok domain=${opts.domain} pipeline=${p.pipeline}`);

      let result: BulkRunnerResult;
      try {
        result = await runner.run(p.params ?? {}, {
          rowBudget: p.row_budget ?? opts.defaultRowBudget,
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        return {
          success: false,
          errorCode: CONTENT_ERROR_CODES.PIPELINE_FAILED,
          errorMessage: message,
          logs: [...logs, `[${ts()}] run.failed ${message}`],
        };
      }
      actionsTaken.push(`run:${p.pipeline}`);
      logs.push(`[${ts()}] run.ok rows=${result.rowsAffected}`);

      // Adapter-side verification: when the runner emitted an
      // expected/observed pair, compare them eagerly.
      if (result.expected && result.observed) {
        for (const [k, expectedVal] of Object.entries(result.expected)) {
          if (JSON.stringify(result.observed[k]) !== JSON.stringify(expectedVal)) {
            return {
              success: false,
              errorCode: CONTENT_ERROR_CODES.VERIFICATION_MISMATCH,
              errorMessage: `pipeline "${p.pipeline}" verification diverged on field "${k}"`,
              output: {
                pipeline: p.pipeline,
                params: p.params ?? {},
                stats: result.stats ?? {},
                expected: result.expected,
                observed: result.observed,
                diff: [{ field: k, expected: expectedVal, observed: result.observed[k] }],
              },
              logs: [...logs, `[${ts()}] verify.field_diff ${k}`],
              actionsTaken,
            };
          }
        }
      }
      logs.push(`[${ts()}] verify.ok`);

      return {
        success: true,
        output: {
          pipeline: p.pipeline,
          params: p.params ?? {},
          summary: result.summary,
          rowsAffected: result.rowsAffected,
          stats: result.stats ?? {},
          expected: result.expected ?? null,
          observed: result.observed ?? null,
        },
        logs,
        actionsTaken,
      };
    },
  };
}

export { CONTENT_DOMAINS };
