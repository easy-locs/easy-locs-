/**
 * WalletVerifier — re-reads the wallet(s) post-mutation and confirms the
 * expected end state. The orchestrator's TaskVerificationService rejects any
 * adapter without a registered verifier (task transitions to `blocked` with
 * `error_code = NO_VERIFIER`), so verifier presence is non-negotiable.
 */

import type { ExecutionTask } from "../../types.ts";
import {
  buildDiff,
  type TaskVerifier,
  type VerifierResult,
} from "../../verifier-registry.ts";
import type { WalletRepository, WalletRecord } from "./wallet-repository.ts";
import { WALLET_DOMAIN, WALLET_TASK_TYPES } from "./types.ts";

export interface ExpectedSingleWallet {
  kind: "single";
  id: string;
  /** Required: expected balance_minor (or `null` to skip the balance check). */
  balance_minor: number | null;
  /** Required: expected status. */
  status: "active" | "frozen";
}

export interface ExpectedTransfer {
  kind: "transfer";
  sourceId: string;
  targetId: string;
  source_balance_minor: number;
  target_balance_minor: number;
}

export type ExpectedWalletState = ExpectedSingleWallet | ExpectedTransfer;

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

function obsForSingle(observed: WalletRecord | null, includeBalance: boolean) {
  if (!observed) return null;
  return includeBalance
    ? { id: observed.id, status: observed.status, balance_minor: observed.balance_minor }
    : { id: observed.id, status: observed.status };
}

export async function verifyExpectedWalletState(
  repo: WalletRepository,
  expected: ExpectedWalletState,
): Promise<AdapterVerificationResult> {
  try {
    if (expected.kind === "single") {
      const observed = await repo.findById(expected.id);
      const includeBalance = expected.balance_minor !== null;
      const obs = obsForSingle(observed, includeBalance);
      const exp = includeBalance
        ? { id: expected.id, status: expected.status, balance_minor: expected.balance_minor }
        : { id: expected.id, status: expected.status };
      const diff = buildDiff(exp as Record<string, unknown>, obs);
      if (diff.length === 0 && observed !== null) return { ok: true, observed: obs ?? {} };
      return {
        ok: false,
        errorCode: "VERIFICATION_MISMATCH",
        message:
          observed === null
            ? `wallet ${expected.id} not found post-mutation`
            : `wallet ${expected.id} state diverged from expected (${diff.length} field(s))`,
        expected: exp as Record<string, unknown>,
        observed: obs,
        diff,
      };
    }
    const [src, tgt] = await Promise.all([
      repo.findById(expected.sourceId),
      repo.findById(expected.targetId),
    ]);
    const obs = {
      source: src ? { id: src.id, balance_minor: src.balance_minor } : null,
      target: tgt ? { id: tgt.id, balance_minor: tgt.balance_minor } : null,
    };
    const exp = {
      source: { id: expected.sourceId, balance_minor: expected.source_balance_minor },
      target: { id: expected.targetId, balance_minor: expected.target_balance_minor },
    };
    const diff = buildDiff(exp as Record<string, unknown>, obs as Record<string, unknown>);
    if (diff.length === 0 && src && tgt) return { ok: true, observed: obs };
    return {
      ok: false,
      errorCode: "VERIFICATION_MISMATCH",
      message: `transfer ${expected.sourceId}→${expected.targetId} state diverged from expected`,
      expected: exp as Record<string, unknown>,
      observed: obs as Record<string, unknown>,
      diff,
    };
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
}

export function createWalletVerifier(repo: WalletRepository, taskType: string): TaskVerifier {
  return {
    domain: WALLET_DOMAIN,
    taskType,
    async verify(task: ExecutionTask, executionResult: Record<string, unknown>): Promise<VerifierResult> {
      const expected = (executionResult?.expected as ExpectedWalletState | undefined) ?? null;
      if (!expected) {
        return {
          ok: false,
          expected: { expected: "<from execute>" },
          actual: null,
          mismatchPath: "expected",
          details: { reason: "missing expected state in executionResult" },
        };
      }
      const result = await verifyExpectedWalletState(repo, expected);
      if (result.ok) return { ok: true, details: { observed: result.observed } };
      const first = result.diff[0];
      return {
        ok: false,
        expected: first ? first.expected : result.expected,
        actual: first ? first.observed : result.observed,
        mismatchPath: first ? first.field : taskType,
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

export { WALLET_TASK_TYPES };
