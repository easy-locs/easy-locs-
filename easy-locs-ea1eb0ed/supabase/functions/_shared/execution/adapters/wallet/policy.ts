/**
 * WalletAdapter — risk + approval policy resolver (task #926, L7 P1).
 *
 * All four governed wallet task types are CRITICAL by classification
 * (`WALLET_*` prefix). They reach `pending_review` unless an explicit
 * pre-approved policy profile says otherwise. L7 does not author new
 * policy profiles — it consumes existing ones.
 */

import { WALLET_TASK_TYPES, type WalletTaskType } from "./types.ts";

export interface WalletPolicy {
  riskLevel: "CRITICAL";
  requires_approval: boolean;
  approval_policy: "single_admin" | "dual_admin";
  safeByPolicy: boolean;
}

export function resolveWalletPolicy(taskType: string): WalletPolicy | null {
  const t = taskType.toUpperCase() as WalletTaskType;
  if (t === WALLET_TASK_TYPES.CREDIT || t === WALLET_TASK_TYPES.DEBIT || t === WALLET_TASK_TYPES.FREEZE) {
    return {
      riskLevel: "CRITICAL",
      requires_approval: true,
      approval_policy: "single_admin",
      safeByPolicy: false,
    };
  }
  if (t === WALLET_TASK_TYPES.TRANSFER) {
    return {
      riskLevel: "CRITICAL",
      requires_approval: true,
      // Transfers move balance between two wallets and require dual approval.
      approval_policy: "dual_admin",
      safeByPolicy: false,
    };
  }
  return null;
}

/**
 * Per-wallet exclusive lock. Transfers compose two locks via the orchestrator
 * by sorting source+target so concurrent A→B and B→A serialise.
 */
export function walletLockKey(walletId: string): string {
  return `wallet:${walletId}`;
}

export function transferLockKey(sourceId: string, targetId: string): string {
  const [a, b] = sourceId < targetId ? [sourceId, targetId] : [targetId, sourceId];
  return `wallet:transfer:${a}:${b}`;
}

export function walletIdempotencyKey(
  taskType: string,
  walletId: string,
  payloadHash: string,
): string {
  return `${taskType.toUpperCase()}::${walletId}::${payloadHash}`;
}

export function hashPayload(input: unknown): string {
  const s = typeof input === "string" ? input : JSON.stringify(input ?? "");
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}
