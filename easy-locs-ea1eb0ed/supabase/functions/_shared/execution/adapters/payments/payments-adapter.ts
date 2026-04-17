/**
 * PaymentsAdapter — task #926, L7 P1 (payments + wallet phase).
 *
 * Three task types share one adapter implementation:
 *   - FINANCIAL_CHARGE   (CRITICAL, requires_approval=true unless policy-approved)
 *   - FINANCIAL_REFUND   (CRITICAL, requires_approval=true unless policy-approved)
 *   - FINANCIAL_PAYOUT   (CRITICAL, dual_admin approval policy)
 *
 * The adapter never mutates `system.execution_tasks` directly — it returns an
 * AdapterResult and lets ExecutionOrchestratorV2 own status, events, locks
 * and idempotency.
 *
 * Pipeline executed inside `execute()`:
 *   1. Validate payload (schema gate).
 *   2. Snapshot previous_state (for rollback).
 *   3. Mutate row via the existing payments persistence path.
 *   4. Verify via PaymentsVerifier; mismatch ⇒ failed + diff.
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
  PAYMENTS_DOMAIN,
  PAYMENTS_ERROR_CODES,
  PAYMENTS_TASK_TYPES,
  validateChargePayload,
  validateRefundPayload,
  validatePayoutPayload,
  type PaymentSnapshot,
  type PaymentsTaskType,
} from "./types.ts";
import {
  hashPayload,
  paymentsIdempotencyKey,
  paymentsLockKey,
} from "./policy.ts";
import type { PaymentsRepository, PaymentRecord } from "./payments-repository.ts";
import {
  expectedStateForTaskType,
  verifyExpectedPaymentState,
} from "./payments-verifier.ts";

export interface PaymentsDomainEvent {
  name:
    | "domain.payments.charge_succeeded"
    | "domain.payments.refund_succeeded"
    | "domain.payments.payout_succeeded";
  entityId: string;
  taskId: string;
  occurredAt: string;
  correlationId: string | null;
  amount_minor: number;
  currency: string;
  previous_state: PaymentSnapshot | null;
  observed: Record<string, unknown> | null;
}

export interface PaymentsDomainEventEmitter {
  emit(event: PaymentsDomainEvent): Promise<void> | void;
}

export interface PaymentsAdapterDeps {
  repo: PaymentsRepository;
  events: PaymentsDomainEventEmitter;
  /** When false, the adapter rejects every dispatch with ADAPTER_DISABLED. */
  enabled?: () => boolean;
  now?: () => Date;
}

function snapshot(record: PaymentRecord): PaymentSnapshot {
  return {
    id: record.id,
    status: record.status,
    amount_minor: record.amount_minor,
    currency: record.currency,
    provider: record.provider,
    provider_reference: record.provider_reference,
    updated_at: record.updated_at,
  };
}

function pickValidator(taskType: PaymentsTaskType) {
  if (taskType === PAYMENTS_TASK_TYPES.CHARGE) return validateChargePayload;
  if (taskType === PAYMENTS_TASK_TYPES.REFUND) return validateRefundPayload;
  return validatePayoutPayload;
}

function entityIdFromPayload(taskType: PaymentsTaskType, payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const o = payload as Record<string, unknown>;
  if (taskType === PAYMENTS_TASK_TYPES.PAYOUT) {
    return typeof o.payoutId === "string" ? o.payoutId : null;
  }
  return typeof o.paymentId === "string" ? o.paymentId : null;
}

function eventName(taskType: PaymentsTaskType): PaymentsDomainEvent["name"] {
  if (taskType === PAYMENTS_TASK_TYPES.CHARGE) return "domain.payments.charge_succeeded";
  if (taskType === PAYMENTS_TASK_TYPES.REFUND) return "domain.payments.refund_succeeded";
  return "domain.payments.payout_succeeded";
}

function targetStatus(taskType: PaymentsTaskType): string {
  if (taskType === PAYMENTS_TASK_TYPES.CHARGE) return "succeeded";
  if (taskType === PAYMENTS_TASK_TYPES.REFUND) return "refunded";
  return "paid";
}

function readEntity(
  repo: PaymentsRepository,
  taskType: PaymentsTaskType,
  id: string,
): Promise<PaymentRecord | null> {
  return taskType === PAYMENTS_TASK_TYPES.PAYOUT
    ? repo.findPayoutById(id)
    : repo.findPaymentById(id);
}

function writeEntity(
  repo: PaymentsRepository,
  taskType: PaymentsTaskType,
  id: string,
  status: string,
): Promise<PaymentRecord | null> {
  return taskType === PAYMENTS_TASK_TYPES.PAYOUT
    ? repo.setPayoutStatus(id, status)
    : repo.setPaymentStatus(id, status);
}

function restoreEntity(
  repo: PaymentsRepository,
  taskType: PaymentsTaskType,
  snap: PaymentSnapshot,
): Promise<PaymentRecord | null> {
  return taskType === PAYMENTS_TASK_TYPES.PAYOUT
    ? repo.restorePayoutSnapshot(snap)
    : repo.restorePaymentSnapshot(snap);
}

function buildAdapter(
  taskType: PaymentsTaskType,
  deps: PaymentsAdapterDeps,
): DomainAdapter {
  const now = deps.now ?? (() => new Date());
  const validator = pickValidator(taskType);
  const isPayout = taskType === PAYMENTS_TASK_TYPES.PAYOUT;
  const slug = taskType.toLowerCase().replace(/_/g, ".");

  return {
    domain: PAYMENTS_DOMAIN,
    taskType,
    agent: {
      slug: `payments.${isPayout ? "payout" : taskType === PAYMENTS_TASK_TYPES.REFUND ? "refund" : "charge"}`,
      version: "1.0.0",
      kind: "business.adapter",
      displayName: `Payments ${slug} Agent`,
      ownerTeam: "payments",
      policyProfile: isPayout ? "critical-dual-admin" : "critical-single-admin",
      quotas: { max_runs_per_min: 30, max_runs_per_day: 2000 },
      metadata: {
        description: `CRITICAL ${slug} mutation routed through governed adapter (L7 P1).`,
        rollback_strategy: "manual",
        verifier: `payments.${slug}`,
        feature_flag: "agent.payments.enabled",
      },
    },

    // Payments rollback is `manual` because reversing a real-world money
    // movement requires operator approval (a refund is not the same as
    // "undo" — it generates a new ledger row). The orchestrator still
    // captures the snapshot so a manual rollback can replay it.
    rollback_strategy: "manual",

    async snapshotProvider(ctx: ExecutionContext): Promise<PaymentSnapshot | null> {
      const v = validator(ctx.task.payload);
      if (!v.ok || !v.data) return null;
      const id = entityIdFromPayload(taskType, v.data);
      if (!id) return null;
      const prior = await readEntity(deps.repo, taskType, id);
      return prior ? snapshot(prior) : null;
    },

    async rollback(
      _ctx: RollbackContext,
      invocation: RollbackInvocation<PaymentSnapshot, Record<string, unknown>>,
    ): Promise<RollbackResult> {
      const ts = () => now().toISOString();
      const snap: PaymentSnapshot | null =
        invocation.previousState ??
        ((invocation.output?.previous_state as PaymentSnapshot | undefined) ?? null);
      if (!snap || !snap.id) {
        return {
          success: false,
          errorCode: PAYMENTS_ERROR_CODES.MUTATION_FAILED,
          errorMessage: "rollback: no snapshot available to restore",
          logs: [`[${ts()}] rollback.no_snapshot`],
        };
      }
      try {
        const restored = await restoreEntity(deps.repo, taskType, snap);
        if (!restored) {
          return {
            success: false,
            errorCode: PAYMENTS_ERROR_CODES.PAYMENT_NOT_FOUND,
            errorMessage: `rollback: ${isPayout ? "payout" : "payment"} ${snap.id} not found`,
            logs: [`[${ts()}] rollback.not_found`],
          };
        }
        return {
          success: true,
          output: { entityId: snap.id, restored: snapshot(restored), trigger: invocation.trigger },
          logs: [`[${ts()}] rollback.ok status=${restored.status}`],
        };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return {
          success: false,
          errorCode: PAYMENTS_ERROR_CODES.MUTATION_FAILED,
          errorMessage: `rollback failed: ${msg}`,
          logs: [`[${ts()}] rollback.threw ${msg}`],
        };
      }
    },

    getLockKey(task: ExecutionTask): string {
      const id = task.entity_id ?? entityIdFromPayload(taskType, task.payload) ?? "unknown";
      return paymentsLockKey(taskType, id);
    },

    getIdempotencyKey(task: ExecutionTask): string | null {
      const fromTask = (task.idempotency_key ?? "").trim();
      if (fromTask) return fromTask;
      const id = task.entity_id ?? entityIdFromPayload(taskType, task.payload);
      if (!id) return null;
      const explicit = (task.payload as Record<string, unknown>)?.payload_hash as string | undefined;
      const hash = explicit && explicit.trim() !== "" ? explicit : hashPayload(task.payload ?? {});
      return paymentsIdempotencyKey(taskType, id, hash);
    },

    async execute(ctx: ExecutionContext): Promise<AdapterResult> {
      const logs: string[] = [];
      const actionsTaken: string[] = [];
      const ts = () => now().toISOString();

      // Feature-flag gate: when disabled, refuse loudly. Per the L7 charter
      // ("No silent fallback") we never quietly degrade to a direct path.
      if (deps.enabled && !deps.enabled()) {
        return {
          success: false,
          errorCode: PAYMENTS_ERROR_CODES.ADAPTER_DISABLED,
          errorMessage: "agent.payments.enabled is false; payments adapter is disabled",
          logs: [`[${ts()}] adapter.disabled`],
        };
      }

      // Step 1: validate
      const v = validator(ctx.task.payload);
      if (!v.ok || !v.data) {
        return {
          success: false,
          errorCode: PAYMENTS_ERROR_CODES.INVALID_PAYLOAD,
          errorMessage: v.reason ?? "payload validation failed",
          logs: [`[${ts()}] validate.failed: ${v.reason}`],
        };
      }
      const payload = v.data as Record<string, unknown>;
      const entityId = (payload.paymentId as string | undefined) ?? (payload.payoutId as string | undefined);
      if (!entityId) {
        return {
          success: false,
          errorCode: PAYMENTS_ERROR_CODES.INVALID_PAYLOAD,
          errorMessage: "payload missing entity id",
          logs: [`[${ts()}] validate.no_entity`],
        };
      }
      logs.push(`[${ts()}] validate.ok entity=${entityId}`);

      // Step 2: snapshot
      let prior: PaymentRecord | null;
      try {
        prior = await readEntity(deps.repo, taskType, entityId);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return {
          success: false,
          errorCode: PAYMENTS_ERROR_CODES.MUTATION_FAILED,
          errorMessage: `prior-read failed: ${msg}`,
          logs: [...logs, `[${ts()}] snapshot.failed: ${msg}`],
        };
      }
      if (!prior) {
        return {
          success: false,
          errorCode: PAYMENTS_ERROR_CODES.PAYMENT_NOT_FOUND,
          errorMessage: `${isPayout ? "payout" : "payment"} ${entityId} not found`,
          logs: [...logs, `[${ts()}] snapshot.not_found`],
        };
      }
      const previous_state = snapshot(prior);
      actionsTaken.push("snapshot_previous_state");
      logs.push(`[${ts()}] snapshot.ok prev_status=${previous_state.status}`);

      // Step 3: mutate
      const target = targetStatus(taskType);
      let updated: PaymentRecord | null;
      try {
        updated = await writeEntity(deps.repo, taskType, entityId, target);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return {
          success: false,
          errorCode: PAYMENTS_ERROR_CODES.MUTATION_FAILED,
          errorMessage: msg,
          output: { previous_state },
          logs: [...logs, `[${ts()}] mutate.failed: ${msg}`],
        };
      }
      if (!updated) {
        return {
          success: false,
          errorCode: PAYMENTS_ERROR_CODES.MUTATION_FAILED,
          errorMessage: `setStatus returned no row for ${entityId}`,
          output: { previous_state },
          logs: [...logs, `[${ts()}] mutate.no_row`],
        };
      }
      actionsTaken.push(`set_status:${target}`);
      logs.push(`[${ts()}] mutate.ok new_status=${updated.status}`);

      // Step 4: adapter-side verification
      const expected = expectedStateForTaskType(taskType, entityId);
      const verification = await verifyExpectedPaymentState(deps.repo, expected);
      if (!verification.ok) {
        logs.push(`[${ts()}] verify.mismatch ${verification.message}`);
        return {
          success: false,
          errorCode: PAYMENTS_ERROR_CODES.VERIFICATION_MISMATCH,
          errorMessage: verification.message,
          output: {
            previous_state,
            expected: verification.expected,
            observed: verification.observed,
            diff: verification.diff,
          },
          logs,
          actionsTaken,
        };
      }
      logs.push(`[${ts()}] verify.ok`);

      // Step 5: emit canonical domain event
      const event: PaymentsDomainEvent = {
        name: eventName(taskType),
        entityId,
        taskId: ctx.task.id,
        occurredAt: ts(),
        correlationId: ctx.task.correlation_id,
        amount_minor: (payload.amount_minor as number) ?? 0,
        currency: (payload.currency as string) ?? "",
        previous_state,
        observed: verification.observed,
      };
      try {
        await deps.events.emit(event);
        actionsTaken.push(event.name);
        logs.push(`[${ts()}] event.emitted ${event.name}`);
      } catch (e) {
        logs.push(`[${ts()}] event.emit_failed ${e instanceof Error ? e.message : String(e)}`);
      }

      return {
        success: true,
        output: {
          entityId,
          previous_state,
          observed: verification.observed,
          target_status: target,
        },
        logs,
        actionsTaken,
      };
    },
  };
}

export function createPaymentsChargeAdapter(deps: PaymentsAdapterDeps): DomainAdapter {
  return buildAdapter(PAYMENTS_TASK_TYPES.CHARGE, deps);
}

export function createPaymentsRefundAdapter(deps: PaymentsAdapterDeps): DomainAdapter {
  return buildAdapter(PAYMENTS_TASK_TYPES.REFUND, deps);
}

export function createPaymentsPayoutAdapter(deps: PaymentsAdapterDeps): DomainAdapter {
  return buildAdapter(PAYMENTS_TASK_TYPES.PAYOUT, deps);
}
