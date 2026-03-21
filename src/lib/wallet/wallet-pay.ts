/**
 * DEPRECATED — Legacy wallet-pay helper.
 * REPLACED_BY: executeSecureTransfer() from transactionChallenge.ts for P2P,
 *              wallet-engine.ts for commerce/order flows.
 * TO_REMOVE after all callers migrated.
 */
import { authorizeWalletPayment, captureWalletPayment } from "@/lib/wallet/wallet-engine";

/** @deprecated Use executeSecureTransfer() for P2P or wallet-engine for commerce */
export async function payOrderWithWallet(input: {
  orderId: string;
  customerWalletId: string;
  pin: string;
  amount: number;
  currency?: string;
}) {
  console.warn("[DEPRECATED] payOrderWithWallet — use wallet-engine or executeSecureTransfer()");
  const auth = await authorizeWalletPayment({
    orderId: input.orderId,
    customerWalletId: input.customerWalletId,
    amount: input.amount,
    pin: input.pin,
    currency: input.currency,
  });
  await captureWalletPayment({ orderId: input.orderId });
  return auth;
}
