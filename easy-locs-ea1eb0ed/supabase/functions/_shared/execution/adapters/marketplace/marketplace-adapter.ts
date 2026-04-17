/**
 * MarketplaceAdapter — Phase-2 pilot adapter (task #754).
 *
 * Two task_types share a single adapter implementation:
 *   - MARKETPLACE.LISTING.PUBLISH    (MEDIUM, requires_approval=true)
 *   - MARKETPLACE.LISTING.UNPUBLISH  (MEDIUM, SAFE_BY_POLICY)
 *
 * The adapter never mutates `system.execution_tasks` directly; it returns an
 * AdapterResult and lets ExecutionOrchestratorV2 own status, events, locks
 * and idempotency.
 *
 * Pipeline executed inside `execute()`:
 *   1. Validate payload (schema gate).
 *   2. KYC gate (publish only).
 *   3. Snapshot previous_state (for future rollback).
 *   4. Mutate listing via the existing marketplace persistence path
 *      (property_listings_v2). No new direct UI→DB path is added.
 *   5. Verify via MarketplaceListingVerifier; mismatch ⇒ failed + diff.
 *   6. Emit canonical domain event (listing_published / listing_unpublished).
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
  MARKETPLACE_DOMAIN,
  MARKETPLACE_ERROR_CODES,
  MARKETPLACE_TASK_TYPES,
  validatePublishPayload,
  validateUnpublishPayload,
  type ListingSnapshot,
  type MarketplaceTaskType,
} from "./types.ts";
import {
  hashPayload,
  marketplaceIdempotencyKey,
  marketplaceListingLockKey,
} from "./policy.ts";
import type { ListingRepository } from "./listing-repository.ts";
import type { KycCheck } from "./kyc-gate.ts";
import {
  expectedStateForTaskType,
  verifyExpectedListingState,
} from "./listing-verifier.ts";

export interface DomainEvent {
  name: "domain.marketplace.listing_published" | "domain.marketplace.listing_unpublished";
  listingId: string;
  ownerId?: string;
  occurredAt: string;
  taskId: string;
  correlationId?: string | null;
  previous_state: ListingSnapshot | null;
  observed: Record<string, unknown> | null;
}

export interface DomainEventEmitter {
  emit(event: DomainEvent): Promise<void> | void;
}

export interface MarketplaceAdapterDeps {
  repo: ListingRepository;
  kyc: KycCheck;
  events: DomainEventEmitter;
  /**
   * Optional in-adapter verifier override. Default reads the listing back via
   * the same `repo` and computes a field diff. The orchestrator runs its own
   * registry-backed verifier afterwards via TaskVerificationService.
   */
  verify?: typeof verifyExpectedListingState;
  now?: () => Date;
}

function pickValidator(taskType: MarketplaceTaskType) {
  return taskType === MARKETPLACE_TASK_TYPES.PUBLISH
    ? validatePublishPayload
    : validateUnpublishPayload;
}

function targetStatus(taskType: MarketplaceTaskType): "active" | "paused" {
  return taskType === MARKETPLACE_TASK_TYPES.PUBLISH ? "active" : "paused";
}

function eventName(taskType: MarketplaceTaskType): DomainEvent["name"] {
  return taskType === MARKETPLACE_TASK_TYPES.PUBLISH
    ? "domain.marketplace.listing_published"
    : "domain.marketplace.listing_unpublished";
}

function snapshot(record: { id: string; status: string | null; is_published?: boolean | null; visibility_mode?: string | null }): ListingSnapshot {
  return {
    id: record.id,
    status: record.status,
    is_published: record.is_published ?? null,
    visibility_mode: record.visibility_mode ?? null,
  };
}

function buildAdapter(
  taskType: MarketplaceTaskType,
  deps: MarketplaceAdapterDeps,
): DomainAdapter {
  const now = deps.now ?? (() => new Date());
  const validator = pickValidator(taskType);
  const verifyState = deps.verify ?? verifyExpectedListingState;
  const isPublish = taskType === MARKETPLACE_TASK_TYPES.PUBLISH;

  return {
    domain: MARKETPLACE_DOMAIN,
    taskType,
    agent: {
      slug: isPublish ? "marketplace.publish" : "marketplace.unpublish",
      version: "1.0.0",
      kind: "business.adapter",
      displayName: isPublish
        ? "Marketplace Publish Agent"
        : "Marketplace Unpublish Agent",
      ownerTeam: "marketplace",
      policyProfile: isPublish ? "medium-approval" : "medium-default",
      quotas: { max_runs_per_min: 60, max_runs_per_day: 5000 },
      metadata: {
        description: isPublish
          ? "Publishes a property listing (status active) with KYC + verifier gates."
          : "Unpublishes a property listing (status paused).",
        rollback_strategy: "auto",
        verifier: "marketplace.listing",
      },
    },

    // ── Sovereign Agent Control · L3 (#811): rollback contract ──────────
    rollback_strategy: "auto",
    /**
     * Snapshot the listing row before mutation. The orchestrator persists
     * the result on `execution_tasks.previous_state` and feeds it back to
     * `rollback()` on failure (auto OR manual).
     */
    async snapshotProvider(ctx: ExecutionContext): Promise<ListingSnapshot | null> {
      const v = validator(ctx.task.payload);
      if (!v.ok || !v.data) return null;
      const prior = await deps.repo.findById(v.data.listingId);
      return prior ? snapshot(prior) : null;
    },
    /**
     * Inverse of execute: restore the listing row to its pre-mutation
     * snapshot. Idempotent — the orchestrator may retry. Falls back to
     * the snapshot embedded in the forward output (legacy path) when the
     * caller has not supplied `previousState` directly.
     */
    async rollback(
      _ctx: RollbackContext,
      invocation: RollbackInvocation<ListingSnapshot, Record<string, unknown>>,
    ): Promise<RollbackResult> {
      const ts = () => now().toISOString();
      const logs: string[] = [];
      const snap: ListingSnapshot | null =
        invocation.previousState ??
        ((invocation.output?.previous_state as ListingSnapshot | undefined) ?? null);

      if (!snap || !snap.id) {
        return {
          success: false,
          errorCode: MARKETPLACE_ERROR_CODES.MUTATION_FAILED,
          errorMessage: "rollback: no snapshot available to restore",
          logs: [`[${ts()}] rollback.no_snapshot`],
        };
      }

      try {
        const restored = await deps.repo.restoreSnapshot(snap);
        if (!restored) {
          return {
            success: false,
            errorCode: MARKETPLACE_ERROR_CODES.LISTING_NOT_FOUND,
            errorMessage: `rollback: listing ${snap.id} not found`,
            logs: [`[${ts()}] rollback.not_found`],
          };
        }
        logs.push(
          `[${ts()}] rollback.ok restored_status=${restored.status} ` +
            `is_published=${restored.is_published}`,
        );
        return {
          success: true,
          output: {
            listingId: snap.id,
            restored: snapshot(restored),
            from_status: invocation.output?.target_status ?? null,
            trigger: invocation.trigger,
          },
          logs,
        };
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        return {
          success: false,
          errorCode: MARKETPLACE_ERROR_CODES.MUTATION_FAILED,
          errorMessage: `rollback failed: ${message}`,
          logs: [`[${ts()}] rollback.threw ${message}`],
        };
      }
    },

    getLockKey(task: ExecutionTask): string {
      const id =
        task.entity_id ??
        ((task.payload as Record<string, unknown>)?.listingId as string | undefined) ??
        "unknown";
      return marketplaceListingLockKey(id);
    },

    getIdempotencyKey(task: ExecutionTask): string | null {
      // Honour the dispatcher-supplied key when present.
      const fromTask = (task.idempotency_key ?? "").trim();
      if (fromTask) return fromTask;
      const listingId =
        task.entity_id ??
        ((task.payload as Record<string, unknown>)?.listingId as string | undefined);
      if (!listingId) return null;
      const explicitHash = (task.payload as Record<string, unknown>)?.payload_hash as
        | string
        | undefined;
      const hash = explicitHash && explicitHash.trim() !== ""
        ? explicitHash
        : hashPayload(task.payload ?? {});
      return marketplaceIdempotencyKey(taskType, listingId, hash);
    },

    async execute(ctx: ExecutionContext): Promise<AdapterResult> {
      const logs: string[] = [];
      const actionsTaken: string[] = [];
      const ts = () => now().toISOString();

      // Step 1: validate payload
      const v = validator(ctx.task.payload);
      if (!v.ok || !v.data) {
        return {
          success: false,
          errorCode: MARKETPLACE_ERROR_CODES.INVALID_PAYLOAD,
          errorMessage: v.reason ?? "payload validation failed",
          logs: [`[${ts()}] validate.failed: ${v.reason}`],
        };
      }
      const payload = v.data;
      logs.push(`[${ts()}] validate.ok listingId=${payload.listingId}`);

      // Step 2: KYC gate (publish only)
      if (taskType === MARKETPLACE_TASK_TYPES.PUBLISH) {
        const kycReason = await deps.kyc.ensureCanPublish(payload.ownerId!);
        if (kycReason) {
          logs.push(`[${ts()}] kyc.blocked: ${kycReason}`);
          return {
            success: false,
            errorCode: MARKETPLACE_ERROR_CODES.KYC_BLOCKED,
            errorMessage: kycReason,
            output: { blocked: true, kyc: kycReason },
            logs,
          };
        }
        logs.push(`[${ts()}] kyc.ok`);
      }

      // Step 3: snapshot previous state
      let prior;
      try {
        prior = await deps.repo.findById(payload.listingId);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        return {
          success: false,
          errorCode: MARKETPLACE_ERROR_CODES.MUTATION_FAILED,
          errorMessage: `prior-read failed: ${message}`,
          logs: [...logs, `[${ts()}] snapshot.failed: ${message}`],
        };
      }
      if (!prior) {
        return {
          success: false,
          errorCode: MARKETPLACE_ERROR_CODES.LISTING_NOT_FOUND,
          errorMessage: `Listing ${payload.listingId} not found`,
          logs: [...logs, `[${ts()}] snapshot.not_found`],
        };
      }
      const previous_state = snapshot(prior);
      actionsTaken.push("snapshot_previous_state");
      logs.push(`[${ts()}] snapshot.ok prev_status=${previous_state.status}`);

      // Step 4: mutate
      const target = targetStatus(taskType);
      let updated;
      try {
        updated = await deps.repo.setStatus(payload.listingId, target);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        return {
          success: false,
          errorCode: MARKETPLACE_ERROR_CODES.MUTATION_FAILED,
          errorMessage: message,
          output: { previous_state },
          logs: [...logs, `[${ts()}] mutate.failed: ${message}`],
        };
      }
      if (!updated) {
        return {
          success: false,
          errorCode: MARKETPLACE_ERROR_CODES.MUTATION_FAILED,
          errorMessage: `setStatus returned no row for ${payload.listingId}`,
          output: { previous_state },
          logs: [...logs, `[${ts()}] mutate.no_row`],
        };
      }
      actionsTaken.push(`set_status:${target}`);
      logs.push(`[${ts()}] mutate.ok new_status=${updated.status}`);

      // Step 5: adapter-side verification (orchestrator runs its own
      // registry-backed verifier afterwards via TaskVerificationService).
      const expected = expectedStateForTaskType(taskType, payload.listingId);
      const verification = await verifyState(deps.repo, expected);
      if (!verification.ok) {
        logs.push(`[${ts()}] verify.mismatch ${verification.message}`);
        return {
          success: false,
          errorCode: MARKETPLACE_ERROR_CODES.VERIFICATION_MISMATCH,
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

      // Step 6: emit canonical domain event
      const event: DomainEvent = {
        name: eventName(taskType),
        listingId: payload.listingId,
        ownerId: payload.ownerId,
        occurredAt: ts(),
        taskId: ctx.task.id,
        correlationId: ctx.task.correlation_id,
        previous_state,
        observed: verification.observed,
      };
      try {
        await deps.events.emit(event);
        actionsTaken.push(event.name);
        logs.push(`[${ts()}] event.emitted ${event.name}`);
      } catch (e) {
        // Event emission errors do NOT roll the mutation back; surface in logs
        // but the adapter run still succeeds (orchestrator captures sinkErrors
        // for its own canonical events; domain events are best-effort here and
        // re-derivable from the persisted listing state).
        logs.push(`[${ts()}] event.emit_failed ${e instanceof Error ? e.message : String(e)}`);
      }

      return {
        success: true,
        output: {
          listingId: payload.listingId,
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

export function createMarketplacePublishAdapter(deps: MarketplaceAdapterDeps): DomainAdapter {
  return buildAdapter(MARKETPLACE_TASK_TYPES.PUBLISH, deps);
}

export function createMarketplaceUnpublishAdapter(deps: MarketplaceAdapterDeps): DomainAdapter {
  return buildAdapter(MARKETPLACE_TASK_TYPES.UNPUBLISH, deps);
}
