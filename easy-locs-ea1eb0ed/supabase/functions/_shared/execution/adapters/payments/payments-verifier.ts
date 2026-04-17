/**
 * PaymentsVerifier — re-reads the payment/payout post-mutation and confirms
 * the expected end state. Mirrors the marketplace verifier shape so the
 * orchestrator's TaskVerificationService (#753) treats this adapter
 * identically.
 *
 * Per agent-migration-inventory.md §8(1): "a missing verifier transitions
 * the task to `blocked` with `error_code = NO_VERIFIER`, so verifier
 * presence is non-negotiable — there is no opt-out path."
 */

import type { ExecutionTask } from "../../types.ts";
import {
  buildDiff,
  type TaskVerifier,
  type VerifierResult,
} from "../../verifier-registry.ts";
import type { PaymentsRepository, PaymentRecord } from "./payments-repository.ts";
import { PAYMENTS_DOMAIN, PAYMENTS_TASK_TYPES } from "./types.ts";

export interface ExpectedPaymentState {
  id: string;
  /** target row status post-mutation. */
  status: string;
  kind: "payment" | "payout";
}

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

export async function verifyExpectedPaymentState(
  repo: PaymentsRepository,
  expected: ExpectedPaymentState,
): Promise<AdapterVerificationResult> {
  let observed: PaymentRecord | null;
  try {
    observed = expected.kind === "payment"
      ? await repo.findPaymentById(expected.id)
      : await repo.findPayoutById(expected.id);
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
    ? { id: observed.id, status: observed.status }
    : null;
  const diff = buildDiff(
    { id: expected.id, status: expected.status },
    observedRecord,
  );
  if (diff.length === 0 && observed !== null) {
    return { ok: true, observed: observedRecord ?? {} };
  }
  return {
    ok: false,
    errorCode: "VERIFICATION_MISMATCH",
    message:
      observed === null
        ? `${expected.kind} ${expected.id} not found post-mutation`
        : `${expected.kind} ${expected.id} state diverged from expected (${diff.length} field(s))`,
    expected: expected as unknown as Record<string, unknown>,
    observed: observedRecord,
    diff,
  };
}

export function expectedStateForTaskType(
  taskType: string,
  entityId: string,
): ExpectedPaymentState {
  const t = taskType.toUpperCase();
  if (t === PAYMENTS_TASK_TYPES.CHARGE) {
    return { id: entityId, status: "succeeded", kind: "payment" };
  }
  if (t === PAYMENTS_TASK_TYPES.REFUND) {
    return { id: entityId, status: "refunded", kind: "payment" };
  }
  // PAYOUT
  return { id: entityId, status: "paid", kind: "payout" };
}

export function createPaymentsVerifier(
  repo: PaymentsRepository,
  taskType: string,
): TaskVerifier {
  return {
    domain: PAYMENTS_DOMAIN,
    taskType,
    async verify(task: ExecutionTask, executionResult: Record<string, unknown>): Promise<VerifierResult> {
      const entityId =
        (executionResult?.entityId as string | undefined) ??
        (executionResult?.paymentId as string | undefined) ??
        (executionResult?.payoutId as string | undefined) ??
        task.entity_id ??
        ((task.payload as Record<string, unknown> | null)?.paymentId as string | undefined) ??
        ((task.payload as Record<string, unknown> | null)?.payoutId as string | undefined);
      if (!entityId) {
        return {
          ok: false,
          expected: { entityId: "<from task>" },
          actual: null,
          mismatchPath: "entityId",
          details: { reason: "missing entityId in executionResult and task" },
        };
      }
      const expected = expectedStateForTaskType(taskType, entityId);
      const result = await verifyExpectedPaymentState(repo, expected);
      if (result.ok) {
        return { ok: true, details: { observed: result.observed } };
      }
      const first = result.diff[0];
      return {
        ok: false,
        expected: first ? first.expected : result.expected,
        actual: first ? first.observed : result.observed,
        mismatchPath: first ? first.field : expected.kind,
        details: {
          message: result.message,
          errorCode: result.errorCode,
          diff: result.diff,
          observed: result.observed,
        },
      };
    },
  };
}
