/**
 * DEPRECATED — Legacy bridge between wallet transfers and financial reconciliation.
 * REPLACED_BY: atomic_wallet_transfer RPC handles all transfer logic atomically.
 * TO_REMOVE after all callers are migrated.
 */
import { reconcileTransaction } from "@/lib/finance/reconcile";
import { transferBetweenWallets } from "@/lib/wallet/wallet-core";

/** @deprecated Use executeSecureTransfer() from transactionChallenge.ts instead */
export async function transferWithReconciliation(params: {
  workspaceId?: string;
  fromWalletId: string;
  toWalletId: string;
  amount: number;
  currency: string;
  referenceType?: string;
  referenceId?: string;
}) {
  console.warn("[DEPRECATED] transferWithReconciliation — use executeSecureTransfer() instead");
  const transfer = await transferBetweenWallets({
    workspaceId: params.workspaceId,
    fromWalletId: params.fromWalletId,
    toWalletId: params.toWalletId,
    amount: params.amount,
    currency: params.currency,
    transferType: "internal",
    referenceType: params.referenceType,
    referenceId: params.referenceId,
  });

  await reconcileTransaction({
    workspaceId: params.workspaceId,
    entityType: "wallet_transfer",
    entityId: transfer.id,
    expected: params.amount,
    actual: params.amount,
    currency: params.currency,
    notes: "Auto reconciled from wallet transfer",
  });

  return transfer;
}
