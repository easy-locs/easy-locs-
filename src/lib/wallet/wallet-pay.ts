/**
 * wallet-pay.ts — High-level wallet payment helper.
 */
import { authorizeWalletPayment, captureWalletPayment } from "@/lib/wallet/wallet-engine";

export async function payOrderWithWallet(input: {
  orderId: string;
  customerWalletId: string;
  pin: string;
  amount: number;
  currency?: string;
}) {
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
