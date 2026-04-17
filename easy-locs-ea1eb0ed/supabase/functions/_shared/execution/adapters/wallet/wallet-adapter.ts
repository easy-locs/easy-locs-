/**
 * WalletAdapter — task #926, L7 P1 (payments + wallet phase).
 *
 * Four task types share one adapter implementation:
 *   - WALLET_CREDIT    (CRITICAL, single_admin)
 *   - WALLET_DEBIT     (CRITICAL, single_admin)
 *   - WALLET_TRANSFER  (CRITICAL, dual_admin — two-leg ledger move)
 *   - WALLET_FREEZE    (CRITICAL, single_admin — sets wallet status)
 *
 * The adapter never mutates `system.execution_tasks` directly.
 *
 * Pipeline:
 *   1. Validate payload.
 *   2. Snapshot affected wallet(s).
 *   3. Apply ledger entry / status change via the repository (single
 *      atomic call per wallet leg).
 *   4. Verify with `verifyExpectedWalletState`; mismatch ⇒ failed + diff.
 *   5. Emit canonical domain event.
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
  WALLET_DOMAIN,
  WALLET_ERROR_CODES,
  WALLET_TASK_TYPES,
  validateCreditDebitPayload,
  validateTransferPayload,
  validateFreezePayload,
  type WalletLedgerSnapshot,
  type WalletSnapshot,
  type WalletTaskType,
} from "./types.ts";
import {
  hashPayload,
  transferLockKey,
  walletIdempotencyKey,
  walletLockKey,
} from "./policy.ts";
import type { WalletRepository, WalletRecord } from "./wallet-repository.ts";
import {
  verifyExpectedWalletState,
  type ExpectedWalletState,
} from "./wallet-verifier.ts";

export interface WalletDomainEvent {
  name:
    | "domain.wallet.credited"
    | "domain.wallet.debited"
    | "domain.wallet.transferred"
    | "domain.wallet.frozen"
    | "domain.wallet.unfrozen";
  walletId: string;
  counterpartyId?: string;
  amount_minor: number;
  currency: string;
  taskId: string;
  occurredAt: string;
  correlationId: string | null;
  previous_state: WalletSnapshot | WalletLedgerSnapshot | null;
  observed: Record<string, unknown> | null;
}

export interface WalletDomainEventEmitter {
  emit(event: WalletDomainEvent): Promise<void> | void;
}

export interface WalletAdapterDeps {
  repo: WalletRepository;
  events: WalletDomainEventEmitter;
  enabled?: () => boolean;
  now?: () => Date;
}

function snapshot(rec: WalletRecord): WalletSnapshot {
  return {
    id: rec.id,
    owner_id: rec.owner_id,
    balance_minor: rec.balance_minor,
    currency: rec.currency,
    status: rec.status,
    updated_at: rec.updated_at,
  };
}

function eventName(taskType: WalletTaskType, action?: "freeze" | "unfreeze"): WalletDomainEvent["name"] {
  if (taskType === WALLET_TASK_TYPES.CREDIT) return "domain.wallet.credited";
  if (taskType === WALLET_TASK_TYPES.DEBIT) return "domain.wallet.debited";
  if (taskType === WALLET_TASK_TYPES.TRANSFER) return "domain.wallet.transferred";
  return action === "unfreeze" ? "domain.wallet.unfrozen" : "domain.wallet.frozen";
}

function buildAdapter(taskType: WalletTaskType, deps: WalletAdapterDeps): DomainAdapter {
  const now = deps.now ?? (() => new Date());
  const isTransfer = taskType === WALLET_TASK_TYPES.TRANSFER;
  const isFreeze = taskType === WALLET_TASK_TYPES.FREEZE;
  const isCreditOrDebit = taskType === WALLET_TASK_TYPES.CREDIT || taskType === WALLET_TASK_TYPES.DEBIT;

  return {
    domain: WALLET_DOMAIN,
    taskType,
    agent: {
      slug: `wallet.${taskType.toLowerCase().replace("wallet_", "")}`,
      version: "1.0.0",
      kind: "business.adapter",
      displayName: `Wallet ${taskType.replace("WALLET_", "").toLowerCase()} Agent`,
      ownerTeam: "wallet",
      policyProfile: isTransfer ? "critical-dual-admin" : "critical-single-admin",
      quotas: { max_runs_per_min: 60, max_runs_per_day: 5000 },
      metadata: {
        description: `CRITICAL ${taskType} mutation routed through governed adapter (L7 P1).`,
        rollback_strategy: "manual",
        verifier: `wallet.${taskType.toLowerCase()}`,
        feature_flag: "agent.wallet.enabled",
      },
    },

    rollback_strategy: "manual",

    async snapshotProvider(ctx: ExecutionContext): Promise<WalletSnapshot | WalletLedgerSnapshot | null> {
      const payload = ctx.task.payload as Record<string, unknown>;
      if (isTransfer) {
        const v = validateTransferPayload(payload);
        if (!v.ok || !v.data) return null;
        const [src, tgt] = await Promise.all([
          deps.repo.findById(v.data.sourceWalletId),
          deps.repo.findById(v.data.targetWalletId),
        ]);
        return { source: src ? snapshot(src) : null, target: tgt ? snapshot(tgt) : null };
      }
      const id = (payload.walletId as string | undefined) ?? "";
      if (!id) return null;
      const prior = await deps.repo.findById(id);
      return prior ? snapshot(prior) : null;
    },

    async rollback(
      _ctx: RollbackContext,
      invocation: RollbackInvocation<WalletSnapshot | WalletLedgerSnapshot, Record<string, unknown>>,
    ): Promise<RollbackResult> {
      const ts = () => now().toISOString();
      const snap = invocation.previousState;
      if (!snap) {
        return {
          success: false,
          errorCode: WALLET_ERROR_CODES.MUTATION_FAILED,
          errorMessage: "rollback: no snapshot available",
          logs: [`[${ts()}] rollback.no_snapshot`],
        };
      }
      try {
        if (isTransfer) {
          const pair = snap as WalletLedgerSnapshot;
          const out: Record<string, unknown> = {};
          if (pair.source) out.source = await deps.repo.restoreSnapshot(pair.source);
          if (pair.target) out.target = await deps.repo.restoreSnapshot(pair.target);
          return { success: true, output: out, logs: [`[${ts()}] rollback.ok transfer`] };
        }
        const single = snap as WalletSnapshot;
        if (!single.id) {
          return {
            success: false,
            errorCode: WALLET_ERROR_CODES.MUTATION_FAILED,
            errorMessage: "rollback: snapshot missing id",
            logs: [`[${ts()}] rollback.no_id`],
          };
        }
        const restored = await deps.repo.restoreSnapshot(single);
        if (!restored) {
          return {
            success: false,
            errorCode: WALLET_ERROR_CODES.WALLET_NOT_FOUND,
            errorMessage: `rollback: wallet ${single.id} not found`,
            logs: [`[${ts()}] rollback.not_found`],
          };
        }
        return {
          success: true,
          output: { walletId: single.id, restored: snapshot(restored) },
          logs: [`[${ts()}] rollback.ok`],
        };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return {
          success: false,
          errorCode: WALLET_ERROR_CODES.MUTATION_FAILED,
          errorMessage: `rollback failed: ${msg}`,
          logs: [`[${ts()}] rollback.threw ${msg}`],
        };
      }
    },

    getLockKey(task: ExecutionTask): string {
      const p = task.payload as Record<string, unknown>;
      if (isTransfer) {
        const s = (p.sourceWalletId as string | undefined) ?? task.entity_id ?? "unknown";
        const t = (p.targetWalletId as string | undefined) ?? "unknown";
        return transferLockKey(s, t);
      }
      const id = (p.walletId as string | undefined) ?? task.entity_id ?? "unknown";
      return walletLockKey(id);
    },

    getIdempotencyKey(task: ExecutionTask): string | null {
      const fromTask = (task.idempotency_key ?? "").trim();
      if (fromTask) return fromTask;
      const p = task.payload as Record<string, unknown>;
      const id = isTransfer
        ? `${(p.sourceWalletId as string | undefined) ?? ""}->${(p.targetWalletId as string | undefined) ?? ""}`
        : ((p.walletId as string | undefined) ?? task.entity_id ?? "");
      if (!id) return null;
      const explicit = p.payload_hash as string | undefined;
      const hash = explicit && explicit.trim() !== "" ? explicit : hashPayload(task.payload ?? {});
      return walletIdempotencyKey(taskType, id, hash);
    },

    async execute(ctx: ExecutionContext): Promise<AdapterResult> {
      const logs: string[] = [];
      const actionsTaken: string[] = [];
      const ts = () => now().toISOString();

      if (deps.enabled && !deps.enabled()) {
        return {
          success: false,
          errorCode: WALLET_ERROR_CODES.ADAPTER_DISABLED,
          errorMessage: "agent.wallet.enabled is false; wallet adapter is disabled",
          logs: [`[${ts()}] adapter.disabled`],
        };
      }

      try {
        // ─── TRANSFER ───────────────────────────────────────────────
        if (isTransfer) {
          const v = validateTransferPayload(ctx.task.payload);
          if (!v.ok || !v.data) {
            return {
              success: false,
              errorCode: WALLET_ERROR_CODES.INVALID_PAYLOAD,
              errorMessage: v.reason ?? "payload validation failed",
              logs: [`[${ts()}] validate.failed: ${v.reason}`],
            };
          }
          const p = v.data;
          const [src, tgt] = await Promise.all([
            deps.repo.findById(p.sourceWalletId),
            deps.repo.findById(p.targetWalletId),
          ]);
          if (!src || !tgt) {
            return {
              success: false,
              errorCode: WALLET_ERROR_CODES.WALLET_NOT_FOUND,
              errorMessage: `wallet not found (src=${!!src} tgt=${!!tgt})`,
              logs: [`[${ts()}] read.missing`],
            };
          }
          if ((src.balance_minor ?? 0) < p.amount_minor) {
            return {
              success: false,
              errorCode: WALLET_ERROR_CODES.INSUFFICIENT_FUNDS,
              errorMessage: `source wallet ${p.sourceWalletId} insufficient`,
              logs: [`[${ts()}] insufficient`],
              output: { previous_state: { source: snapshot(src), target: snapshot(tgt) } },
            };
          }
          const previous_state = { source: snapshot(src), target: snapshot(tgt) };
          actionsTaken.push("snapshot_previous_state");

          // Two-leg ledger move with shared correlation id so the
          // ledger-derivation projection can pair them.
          const correlationId = `transfer:${ctx.task.id}`;
          const debited = await deps.repo.applyLedgerEntry({
            walletId: p.sourceWalletId,
            delta_minor: -p.amount_minor,
            reason: p.reason,
            reference: p.reference,
            initiatedBy: p.initiatedBy,
            correlationId,
          });
          const credited = await deps.repo.applyLedgerEntry({
            walletId: p.targetWalletId,
            delta_minor: p.amount_minor,
            reason: p.reason,
            reference: p.reference,
            initiatedBy: p.initiatedBy,
            correlationId,
          });
          if (!debited || !credited) {
            return {
              success: false,
              errorCode: WALLET_ERROR_CODES.MUTATION_FAILED,
              errorMessage: "transfer ledger write returned no row",
              output: { previous_state },
              logs: [...logs, `[${ts()}] mutate.no_row`],
            };
          }
          actionsTaken.push("transfer:debit", "transfer:credit");
          const expected: ExpectedWalletState = {
            kind: "transfer",
            sourceId: p.sourceWalletId,
            targetId: p.targetWalletId,
            source_balance_minor: (src.balance_minor ?? 0) - p.amount_minor,
            target_balance_minor: (tgt.balance_minor ?? 0) + p.amount_minor,
          };
          const verification = await verifyExpectedWalletState(deps.repo, expected);
          if (!verification.ok) {
            return {
              success: false,
              errorCode: WALLET_ERROR_CODES.VERIFICATION_MISMATCH,
              errorMessage: verification.message,
              output: { previous_state, expected, observed: verification.observed, diff: verification.diff },
              logs,
              actionsTaken,
            };
          }
          const event: WalletDomainEvent = {
            name: eventName(taskType),
            walletId: p.sourceWalletId,
            counterpartyId: p.targetWalletId,
            amount_minor: p.amount_minor,
            currency: p.currency,
            taskId: ctx.task.id,
            occurredAt: ts(),
            correlationId: ctx.task.correlation_id,
            previous_state,
            observed: verification.observed,
          };
          try { await deps.events.emit(event); actionsTaken.push(event.name); } catch (e) {
            logs.push(`[${ts()}] event.emit_failed ${e instanceof Error ? e.message : String(e)}`);
          }
          return {
            success: true,
            output: { previous_state, expected, observed: verification.observed },
            logs,
            actionsTaken,
          };
        }

        // ─── FREEZE / UNFREEZE ──────────────────────────────────────
        if (isFreeze) {
          const v = validateFreezePayload(ctx.task.payload);
          if (!v.ok || !v.data) {
            return {
              success: false,
              errorCode: WALLET_ERROR_CODES.INVALID_PAYLOAD,
              errorMessage: v.reason ?? "payload validation failed",
              logs: [`[${ts()}] validate.failed: ${v.reason}`],
            };
          }
          const p = v.data;
          const prior = await deps.repo.findById(p.walletId);
          if (!prior) {
            return {
              success: false,
              errorCode: WALLET_ERROR_CODES.WALLET_NOT_FOUND,
              errorMessage: `wallet ${p.walletId} not found`,
              logs: [`[${ts()}] read.missing`],
            };
          }
          const previous_state = snapshot(prior);
          actionsTaken.push("snapshot_previous_state");
          const nextStatus: "active" | "frozen" = p.action === "freeze" ? "frozen" : "active";
          const updated = await deps.repo.setStatus(p.walletId, nextStatus);
          if (!updated) {
            return {
              success: false,
              errorCode: WALLET_ERROR_CODES.MUTATION_FAILED,
              errorMessage: `freeze update returned no row for ${p.walletId}`,
              output: { previous_state },
              logs: [...logs, `[${ts()}] mutate.no_row`],
            };
          }
          const expected: ExpectedWalletState = {
            kind: "single",
            id: p.walletId,
            balance_minor: null,
            status: nextStatus,
          };
          const verification = await verifyExpectedWalletState(deps.repo, expected);
          if (!verification.ok) {
            return {
              success: false,
              errorCode: WALLET_ERROR_CODES.VERIFICATION_MISMATCH,
              errorMessage: verification.message,
              output: { previous_state, expected, observed: verification.observed, diff: verification.diff },
              logs,
              actionsTaken,
            };
          }
          const event: WalletDomainEvent = {
            name: eventName(taskType, p.action),
            walletId: p.walletId,
            amount_minor: 0,
            currency: prior.currency ?? "",
            taskId: ctx.task.id,
            occurredAt: ts(),
            correlationId: ctx.task.correlation_id,
            previous_state,
            observed: verification.observed,
          };
          try { await deps.events.emit(event); actionsTaken.push(event.name); } catch (e) {
            logs.push(`[${ts()}] event.emit_failed ${e instanceof Error ? e.message : String(e)}`);
          }
          return { success: true, output: { previous_state, expected, observed: verification.observed }, logs, actionsTaken };
        }

        // ─── CREDIT / DEBIT ─────────────────────────────────────────
        if (isCreditOrDebit) {
          const v = validateCreditDebitPayload(ctx.task.payload);
          if (!v.ok || !v.data) {
            return {
              success: false,
              errorCode: WALLET_ERROR_CODES.INVALID_PAYLOAD,
              errorMessage: v.reason ?? "payload validation failed",
              logs: [`[${ts()}] validate.failed: ${v.reason}`],
            };
          }
          const p = v.data;
          const prior = await deps.repo.findById(p.walletId);
          if (!prior) {
            return {
              success: false,
              errorCode: WALLET_ERROR_CODES.WALLET_NOT_FOUND,
              errorMessage: `wallet ${p.walletId} not found`,
              logs: [`[${ts()}] read.missing`],
            };
          }
          if (prior.status === "frozen") {
            return {
              success: false,
              errorCode: WALLET_ERROR_CODES.WALLET_FROZEN,
              errorMessage: `wallet ${p.walletId} is frozen`,
              logs: [`[${ts()}] frozen`],
            };
          }
          const previous_state = snapshot(prior);
          actionsTaken.push("snapshot_previous_state");
          const delta = taskType === WALLET_TASK_TYPES.CREDIT ? p.amount_minor : -p.amount_minor;
          if ((prior.balance_minor ?? 0) + delta < 0) {
            return {
              success: false,
              errorCode: WALLET_ERROR_CODES.INSUFFICIENT_FUNDS,
              errorMessage: `wallet ${p.walletId} insufficient`,
              output: { previous_state },
              logs: [`[${ts()}] insufficient`],
            };
          }
          const updated = await deps.repo.applyLedgerEntry({
            walletId: p.walletId,
            delta_minor: delta,
            reason: p.reason,
            reference: p.reference,
            initiatedBy: p.initiatedBy,
            correlationId: `${taskType.toLowerCase()}:${ctx.task.id}`,
          });
          if (!updated) {
            return {
              success: false,
              errorCode: WALLET_ERROR_CODES.MUTATION_FAILED,
              errorMessage: `ledger write returned no row for ${p.walletId}`,
              output: { previous_state },
              logs: [...logs, `[${ts()}] mutate.no_row`],
            };
          }
          actionsTaken.push(`ledger:${delta > 0 ? "credit" : "debit"}:${Math.abs(delta)}`);
          const expected: ExpectedWalletState = {
            kind: "single",
            id: p.walletId,
            balance_minor: (prior.balance_minor ?? 0) + delta,
            status: "active",
          };
          const verification = await verifyExpectedWalletState(deps.repo, expected);
          if (!verification.ok) {
            return {
              success: false,
              errorCode: WALLET_ERROR_CODES.VERIFICATION_MISMATCH,
              errorMessage: verification.message,
              output: { previous_state, expected, observed: verification.observed, diff: verification.diff },
              logs,
              actionsTaken,
            };
          }
          const event: WalletDomainEvent = {
            name: eventName(taskType),
            walletId: p.walletId,
            amount_minor: p.amount_minor,
            currency: p.currency,
            taskId: ctx.task.id,
            occurredAt: ts(),
            correlationId: ctx.task.correlation_id,
            previous_state,
            observed: verification.observed,
          };
          try { await deps.events.emit(event); actionsTaken.push(event.name); } catch (e) {
            logs.push(`[${ts()}] event.emit_failed ${e instanceof Error ? e.message : String(e)}`);
          }
          return { success: true, output: { previous_state, expected, observed: verification.observed }, logs, actionsTaken };
        }

        return {
          success: false,
          errorCode: WALLET_ERROR_CODES.INVALID_PAYLOAD,
          errorMessage: `unsupported wallet task type: ${taskType}`,
          logs: [`[${ts()}] unsupported`],
        };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return {
          success: false,
          errorCode: WALLET_ERROR_CODES.MUTATION_FAILED,
          errorMessage: msg,
          logs: [...logs, `[${ts()}] threw: ${msg}`],
          actionsTaken,
        };
      }
    },
  };
}

export function createWalletCreditAdapter(deps: WalletAdapterDeps): DomainAdapter {
  return buildAdapter(WALLET_TASK_TYPES.CREDIT, deps);
}
export function createWalletDebitAdapter(deps: WalletAdapterDeps): DomainAdapter {
  return buildAdapter(WALLET_TASK_TYPES.DEBIT, deps);
}
export function createWalletTransferAdapter(deps: WalletAdapterDeps): DomainAdapter {
  return buildAdapter(WALLET_TASK_TYPES.TRANSFER, deps);
}
export function createWalletFreezeAdapter(deps: WalletAdapterDeps): DomainAdapter {
  return buildAdapter(WALLET_TASK_TYPES.FREEZE, deps);
}
