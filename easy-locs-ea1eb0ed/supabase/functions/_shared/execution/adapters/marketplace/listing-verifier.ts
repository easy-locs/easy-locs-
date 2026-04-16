/**
 * MarketplaceListingVerifier — re-reads the listing post-mutation and
 * confirms the expected end state.
 *
 * This module exposes two surfaces:
 *
 *   1. `createMarketplaceListingVerifier(repo, taskType)` returns a
 *      `TaskVerifier` registered on the global `VerifierRegistry`. It is
 *      consumed by the orchestrator's `TaskVerificationService` (task #753)
 *      after the adapter reports success.
 *
 *   2. `verifyExpectedListingState(repo, expected)` is a plain async
 *      function used by the marketplace adapter to perform its own
 *      adapter-side verification and produce a structured field diff for
 *      the `VERIFICATION_MISMATCH` AdapterResult (task #754). The two
 *      paths are belt-and-suspenders: the adapter fails fast on mismatch
 *      with a rich diff, and the orchestrator's verification gate provides
 *      a centralised second check.
 */

import type { ExecutionTask } from "../../types.ts";
import {
  buildDiff,
  type TaskVerifier,
  type VerifierResult,
} from "../../verifier-registry.ts";
import type { ListingRepository } from "./listing-repository.ts";
import { MARKETPLACE_DOMAIN, MARKETPLACE_TASK_TYPES } from "./types.ts";

export interface ExpectedListingState {
  id: string;
  status: "active" | "paused";
  /** Optional extra fields to assert (e.g. is_published true/false). */
  is_published?: boolean;
}

/** Result of the adapter-side verification helper used inside execute(). */
export type AdapterVerificationResult =
  | { ok: true; observed: Record<string, unknown> }
  | {
      ok: false;
      errorCode: "VERIFICATION_MISMATCH" | "VERIFICATION_LOOKUP_FAILED";
      message: string;
      expected: Record<string, unknown>;
      observed: Record<string, unknown> | null;
      diff: Array<{ field: string; expected: unknown; observed: unknown }>;
    };

export async function verifyExpectedListingState(
  repo: ListingRepository,
  expected: ExpectedListingState,
): Promise<AdapterVerificationResult> {
  let observed;
  try {
    observed = await repo.findById(expected.id);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      errorCode: "VERIFICATION_LOOKUP_FAILED",
      message,
      expected: expected as unknown as Record<string, unknown>,
      observed: null,
      diff: [],
    };
  }
  const observedRecord: Record<string, unknown> | null = observed
    ? {
        id: observed.id,
        status: observed.status,
        ...(expected.is_published !== undefined
          ? { is_published: observed.is_published }
          : {}),
      }
    : null;
  const diff = buildDiff(expected as unknown as Record<string, unknown>, observedRecord);
  if (diff.length === 0 && observed !== null) {
    return { ok: true, observed: observedRecord ?? {} };
  }
  return {
    ok: false,
    errorCode: "VERIFICATION_MISMATCH",
    message:
      observed === null
        ? `Listing ${expected.id} not found post-mutation`
        : `Listing ${expected.id} state diverged from expected (${diff.length} field(s))`,
    expected: expected as unknown as Record<string, unknown>,
    observed: observedRecord,
    diff,
  };
}

/**
 * Registry-compatible TaskVerifier. The orchestrator passes the adapter's
 * `executionResult` (which carries `target_status` + `listingId`); we derive
 * the expected end state from there and report a `VerifierResult` shaped for
 * `TaskVerificationService`.
 */
export function createMarketplaceListingVerifier(
  repo: ListingRepository,
  taskType: string,
): TaskVerifier {
  return {
    domain: MARKETPLACE_DOMAIN,
    taskType,
    async verify(task: ExecutionTask, executionResult: Record<string, unknown>): Promise<VerifierResult> {
      const listingId =
        (executionResult?.listingId as string | undefined) ??
        task.entity_id ??
        ((task.payload as Record<string, unknown> | null)?.listingId as string | undefined);
      if (!listingId) {
        return {
          ok: false,
          expected: { listingId: "<from task>" },
          actual: null,
          mismatchPath: "listingId",
          details: { reason: "missing listingId in executionResult and task" },
        };
      }
      const expected = expectedStateForTaskType(taskType, listingId);
      const adapterResult = await verifyExpectedListingState(repo, expected);
      if (adapterResult.ok) {
        return { ok: true, details: { observed: adapterResult.observed } };
      }
      // Surface the first diverging field as mismatchPath; carry the full
      // diff in `details` so TaskVerificationService can persist it.
      const first = adapterResult.diff[0];
      return {
        ok: false,
        expected: first ? first.expected : adapterResult.expected,
        actual: first ? first.observed : adapterResult.observed,
        mismatchPath: first ? first.field : "listing",
        details: {
          message: adapterResult.message,
          errorCode: adapterResult.errorCode,
          diff: adapterResult.diff,
          observed: adapterResult.observed,
        },
      };
    },
  };
}

export function expectedStateForTaskType(taskType: string, listingId: string): ExpectedListingState {
  if (taskType.toUpperCase() === MARKETPLACE_TASK_TYPES.PUBLISH) {
    return { id: listingId, status: "active", is_published: true };
  }
  return { id: listingId, status: "paused", is_published: false };
}

// Re-exported for callers that don't want to import ExecutionTask explicitly.
export type { ExecutionTask };
