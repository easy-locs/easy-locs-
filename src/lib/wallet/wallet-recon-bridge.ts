/**
 * Bridge between wallet transfers and financial reconciliation.
 */
import { reconcileTransaction } from "@/lib/finance/reconcile";
import { transferBetweenWallets } from "@/lib/wallet/wallet-core";

export async function transferWithReconciliation(params: {
  workspaceId?: string;
  fromWalletId: string;
  toWalletId: string;
  amount: number;
  currency: string;
  referenceType?: string;
  referenceId?: string;
}) {
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
