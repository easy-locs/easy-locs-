/**
 * Contacts adapters — sync + upsert (task #945).
 *
 * Both share `taskType = NON_SENSITIVE_BULK_UPDATE` (MEDIUM,
 * approval-gated) but live under distinct sub-domains so the
 * (domain, task_type) routing key stays unique:
 *
 *   contacts.sync   — pull from upstream provider into local store
 *   contacts.upsert — bulk-write rows the caller already prepared
 *
 * Rollback strategy is `manual` for both: an inverse sync requires a
 * dedicated compensating runner; an inverse upsert requires the caller
 * to know which rows pre-existed. The handler returns success=false
 * with `NO_COMPENSATING_RUN` when no compensator is available so the
 * row sits in `rollback_failed` until a human resolves it.
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
  CONTACTS_DOMAINS,
  CONTACTS_ERROR_CODES,
  CONTACTS_TASK_TYPE,
  validateSyncPayload,
  validateUpsertPayload,
  type ContactsSyncPayload,
  type ContactsUpsertPayload,
} from "./types.ts";
import {
  contactsIdempotencyKey,
  contactsSyncLockKey,
  contactsUpsertLockKey,
  hashContactsPayload,
} from "./policy.ts";
import type { ContactsRepository } from "./contacts-repository.ts";

export interface ContactsSyncRunnerResult {
  summary: string;
  rowsAffected: number;
  /** When provided, the upsert is funnelled through `repo.upsertMany`. */
  upsert?: { table: string; rows: Array<Record<string, unknown>>; onConflict?: string };
  /** Optional structured stats forwarded to AdapterResult.output. */
  stats?: Record<string, unknown>;
}

export interface ContactsSyncRunner {
  run(params: Record<string, unknown>, opts: { rowBudget?: number }): Promise<ContactsSyncRunnerResult>;
  compensate?(
    params: Record<string, unknown>,
    forwardOutput: Record<string, unknown> | null,
  ): Promise<ContactsSyncRunnerResult>;
}

export type ContactsSyncRunnerRegistry = Record<string, ContactsSyncRunner>;

const NO_COMPENSATING_RUN = "NO_COMPENSATING_RUN";

export interface ContactsSyncAdapterDeps {
  repo: ContactsRepository;
  runners: ContactsSyncRunnerRegistry;
  defaultRowBudget?: number;
  now?: () => Date;
}

export function createContactsSyncAdapter(
  deps: ContactsSyncAdapterDeps,
): DomainAdapter<null, Record<string, unknown>> {
  const now = deps.now ?? (() => new Date());
  const ts = () => now().toISOString();

  return {
    domain: CONTACTS_DOMAINS.SYNC,
    taskType: CONTACTS_TASK_TYPE,
    agent: {
      slug: CONTACTS_DOMAINS.SYNC,
      version: "1.0.0",
      kind: "business.adapter",
      displayName: "Contacts · Sync",
      ownerTeam: "contacts",
      policyProfile: "medium-approval",
      quotas: { max_runs_per_min: 30, max_runs_per_day: 5_000 },
      metadata: {
        description:
          "Pulls contacts from an upstream provider (DLD, UAE scrape, " +
          "auto-onboarding cron, prayer subscriptions, address resolver, " +
          "tenant-signup, social graph, etc.). Approval-gated.",
        rollback_strategy: "manual",
        verifier: "contacts.sync",
        canonical_task_type: CONTACTS_TASK_TYPE,
        registered_providers: Object.keys(deps.runners).sort(),
      },
    },
    rollback_strategy: "manual",

    getLockKey(task: ExecutionTask): string {
      const v = validateSyncPayload(task.payload);
      return contactsSyncLockKey(v.data?.provider ?? task.entity_id ?? "unknown");
    },
    getIdempotencyKey(task: ExecutionTask): string | null {
      const fromTask = (task.idempotency_key ?? "").trim();
      if (fromTask) return fromTask;
      const v = validateSyncPayload(task.payload);
      if (!v.ok || !v.data) return null;
      const hash = v.data.payload_hash && v.data.payload_hash.trim() !== ""
        ? v.data.payload_hash
        : hashContactsPayload(task.payload ?? {});
      return contactsIdempotencyKey(CONTACTS_DOMAINS.SYNC, v.data.provider, hash);
    },

    async snapshotProvider(): Promise<null> { return null; },

    async rollback(
      _ctx: RollbackContext,
      invocation: RollbackInvocation<null, Record<string, unknown>>,
    ): Promise<RollbackResult> {
      const fwd = (invocation.output ?? {}) as Record<string, unknown>;
      const provider = (fwd.provider as string | undefined) ?? "";
      const runner = provider ? deps.runners[provider] : undefined;
      if (!runner?.compensate) {
        return {
          success: false,
          errorCode: NO_COMPENSATING_RUN,
          errorMessage:
            `provider "${provider}" has no registered compensating runner; ` +
            `manual reconciliation required`,
          logs: [`[${ts()}] rollback.no_compensator provider=${provider}`],
        };
      }
      try {
        const r = await runner.compensate(
          (fwd.params as Record<string, unknown> | undefined) ?? {},
          fwd,
        );
        return {
          success: true,
          output: { provider, rowsAffected: r.rowsAffected, summary: r.summary, ...(r.stats ?? {}) },
          logs: [`[${ts()}] rollback.ok provider=${provider} rows=${r.rowsAffected}`],
        };
      } catch (e) {
        return {
          success: false,
          errorCode: CONTACTS_ERROR_CODES.SYNC_FAILED,
          errorMessage: e instanceof Error ? e.message : String(e),
          logs: [`[${ts()}] rollback.threw`],
        };
      }
    },

    async execute(ctx: ExecutionContext): Promise<AdapterResult> {
      const logs: string[] = [];
      const actionsTaken: string[] = [];

      const v = validateSyncPayload(ctx.task.payload);
      if (!v.ok || !v.data) {
        return {
          success: false,
          errorCode: CONTACTS_ERROR_CODES.INVALID_PAYLOAD,
          errorMessage: v.reason ?? "payload validation failed",
          logs: [`[${ts()}] validate.failed`],
        };
      }
      const p: ContactsSyncPayload = v.data;
      const runner = deps.runners[p.provider];
      if (!runner) {
        return {
          success: false,
          errorCode: CONTACTS_ERROR_CODES.PROVIDER_NOT_REGISTERED,
          errorMessage:
            `provider "${p.provider}" is not registered; known: ` +
            (Object.keys(deps.runners).sort().join(", ") || "(none)"),
          logs: [`[${ts()}] validate.unknown_provider`],
        };
      }
      logs.push(`[${ts()}] validate.ok provider=${p.provider}`);

      let r: ContactsSyncRunnerResult;
      try {
        r = await runner.run(p.params ?? {}, { rowBudget: p.row_budget ?? deps.defaultRowBudget });
      } catch (e) {
        return {
          success: false,
          errorCode: CONTACTS_ERROR_CODES.SYNC_FAILED,
          errorMessage: e instanceof Error ? e.message : String(e),
          logs: [...logs, `[${ts()}] run.threw`],
        };
      }
      actionsTaken.push(`run:${p.provider}`);
      let upsertedRows = 0;
      if (r.upsert) {
        try {
          upsertedRows = await deps.repo.upsertMany(r.upsert.table, r.upsert.rows, r.upsert.onConflict);
          actionsTaken.push(`upsert:${r.upsert.table}:${upsertedRows}`);
        } catch (e) {
          return {
            success: false,
            errorCode: CONTACTS_ERROR_CODES.UPSERT_FAILED,
            errorMessage: e instanceof Error ? e.message : String(e),
            logs: [...logs, `[${ts()}] upsert.failed`],
          };
        }
      }
      logs.push(`[${ts()}] run.ok rows=${r.rowsAffected} upserted=${upsertedRows}`);

      return {
        success: true,
        output: {
          provider: p.provider,
          params: p.params ?? {},
          summary: r.summary,
          rowsAffected: r.rowsAffected,
          upsertedRows,
          stats: r.stats ?? {},
        },
        logs,
        actionsTaken,
      };
    },
  };
}

// ── Upsert adapter ──────────────────────────────────────────────────────

export interface ContactsUpsertAdapterDeps {
  repo: ContactsRepository;
  /** Optional registered compensating handlers keyed by `source`. */
  compensators?: Record<
    string,
    (
      params: { table: string; source: string },
      forwardOutput: Record<string, unknown> | null,
    ) => Promise<{ rowsAffected: number; summary: string }>
  >;
  now?: () => Date;
}

export function createContactsUpsertAdapter(
  deps: ContactsUpsertAdapterDeps,
): DomainAdapter<null, Record<string, unknown>> {
  const now = deps.now ?? (() => new Date());
  const ts = () => now().toISOString();

  return {
    domain: CONTACTS_DOMAINS.UPSERT,
    taskType: CONTACTS_TASK_TYPE,
    agent: {
      slug: CONTACTS_DOMAINS.UPSERT,
      version: "1.0.0",
      kind: "business.adapter",
      displayName: "Contacts · Upsert",
      ownerTeam: "contacts",
      policyProfile: "medium-approval",
      quotas: { max_runs_per_min: 60, max_runs_per_day: 20_000 },
      metadata: {
        description:
          "Bulk upsert of caller-prepared contact rows from a known source " +
          "(tenant-signup, auto-onboarding cron, scrapers, etc.). Approval-gated.",
        rollback_strategy: "manual",
        verifier: "contacts.upsert",
        canonical_task_type: CONTACTS_TASK_TYPE,
      },
    },
    rollback_strategy: "manual",

    getLockKey(task: ExecutionTask): string {
      const v = validateUpsertPayload(task.payload);
      return contactsUpsertLockKey(
        v.data?.table ?? task.entity_type ?? "unknown",
        v.data?.source ?? task.entity_id ?? "unknown",
      );
    },
    getIdempotencyKey(task: ExecutionTask): string | null {
      const fromTask = (task.idempotency_key ?? "").trim();
      if (fromTask) return fromTask;
      const v = validateUpsertPayload(task.payload);
      if (!v.ok || !v.data) return null;
      const hash = v.data.payload_hash && v.data.payload_hash.trim() !== ""
        ? v.data.payload_hash
        : hashContactsPayload(task.payload ?? {});
      return contactsIdempotencyKey(
        CONTACTS_DOMAINS.UPSERT,
        `${v.data.table}::${v.data.source}`,
        hash,
      );
    },

    async snapshotProvider(): Promise<null> { return null; },

    async rollback(
      _ctx: RollbackContext,
      invocation: RollbackInvocation<null, Record<string, unknown>>,
    ): Promise<RollbackResult> {
      const fwd = (invocation.output ?? {}) as Record<string, unknown>;
      const source = (fwd.source as string | undefined) ?? "";
      const table = (fwd.table as string | undefined) ?? "";
      const handler = source ? deps.compensators?.[source] : undefined;
      if (!handler) {
        return {
          success: false,
          errorCode: NO_COMPENSATING_RUN,
          errorMessage:
            `source "${source}" has no registered compensator; manual ` +
            `reconciliation required for table "${table}"`,
          logs: [`[${ts()}] rollback.no_compensator source=${source}`],
        };
      }
      try {
        const r = await handler({ table, source }, fwd);
        return {
          success: true,
          output: { table, source, rowsAffected: r.rowsAffected, summary: r.summary },
          logs: [`[${ts()}] rollback.ok rows=${r.rowsAffected}`],
        };
      } catch (e) {
        return {
          success: false,
          errorCode: CONTACTS_ERROR_CODES.UPSERT_FAILED,
          errorMessage: e instanceof Error ? e.message : String(e),
          logs: [`[${ts()}] rollback.threw`],
        };
      }
    },

    async execute(ctx: ExecutionContext): Promise<AdapterResult> {
      const logs: string[] = [];
      const actionsTaken: string[] = [];

      const v = validateUpsertPayload(ctx.task.payload);
      if (!v.ok || !v.data) {
        return {
          success: false,
          errorCode: CONTACTS_ERROR_CODES.INVALID_PAYLOAD,
          errorMessage: v.reason ?? "payload validation failed",
          logs: [`[${ts()}] validate.failed`],
        };
      }
      const p: ContactsUpsertPayload = v.data;
      logs.push(`[${ts()}] validate.ok table=${p.table} source=${p.source} rows=${p.rows.length}`);

      let upsertedRows = 0;
      try {
        upsertedRows = await deps.repo.upsertMany(p.table, p.rows, p.conflict_key);
      } catch (e) {
        return {
          success: false,
          errorCode: CONTACTS_ERROR_CODES.UPSERT_FAILED,
          errorMessage: e instanceof Error ? e.message : String(e),
          logs: [...logs, `[${ts()}] upsert.failed`],
        };
      }
      actionsTaken.push(`upsert:${p.table}:${upsertedRows}`);
      logs.push(`[${ts()}] upsert.ok rows=${upsertedRows}`);

      // Adapter-side verification: count rows tagged with this source.
      // The verifier uses the same column when present; absence of the
      // column is tolerated (count returns 0 → still success).
      const expectedAtLeast = p.rows.length;
      let observedCount = 0;
      try {
        observedCount = await deps.repo.countWhere(p.table, "source", p.source);
      } catch (e) {
        logs.push(`[${ts()}] verify.count_failed ${e instanceof Error ? e.message : String(e)}`);
      }

      return {
        success: true,
        output: {
          table: p.table,
          source: p.source,
          conflict_key: p.conflict_key ?? null,
          rowCountInBatch: p.rows.length,
          upsertedRows,
          observedCount,
          expectedAtLeast,
        },
        logs,
        actionsTaken,
      };
    },
  };
}
