import { transferBetweenWallets } from "@/lib/wallet/wallet-core";
import { reconcileTransaction } from "@/lib/finance/reconcile";

export async function settleOrderPayment(params: {
  workspaceId?: string;
  buyerWalletId: string;
  merchantWalletId: string;
  platformWalletId?: string;
  amount: number;
  feePct?: number;
  currency?: string;
  orderId: string;
}) {
  const currency = params.currency ?? "AED";
  const feePct = params.feePct ?? 0;
  const feeAmount = Number((params.amount * feePct).toFixed(2));
  const merchantAmount = Number((params.amount - feeAmount).toFixed(2));

  if (merchantAmount > 0) {
    await transferBetweenWallets({
      workspaceId: params.workspaceId,
      fromWalletId: params.buyerWalletId,
      toWalletId: params.merchantWalletId,
      amount: merchantAmount,
      currency,
      transferType: "payment",
      referenceType: "order",
      referenceId: params.orderId,
      metadata: { leg: "merchant_settlement" },
    });
  }

  if (feeAmount > 0 && params.platformWalletId) {
    await transferBetweenWallets({
      workspaceId: params.workspaceId,
      fromWalletId: params.buyerWalletId,
      toWalletId: params.platformWalletId,
      amount: feeAmount,
      currency,
      transferType: "fee",
      referenceType: "order",
      referenceId: params.orderId,
      metadata: { leg: "platform_fee" },
    });
  }

  await reconcileTransaction({
    workspaceId: params.workspaceId,
    entityType: "order",
    entityId: params.orderId,
    expected: params.amount,
    actual: params.amount,
    currency,
    notes: "Order payment settled",
  });

  return { feeAmount, merchantAmount };
}
