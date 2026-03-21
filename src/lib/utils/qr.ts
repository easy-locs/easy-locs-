/**
 * DEPRECATED — Legacy mock QR payment string builder.
 * REPLACED_BY: qr.payUser() / qr.payShop() from src/lib/qr-engine.ts
 * TO_REMOVE: This file should be deleted once all callers are migrated.
 */
import { encodeQr, qr } from "@/lib/qr-engine";

/**
 * @deprecated Use qr.payUser() from qr-engine.ts instead.
 * This generates a legacy wallet_qr_payment format which is unsafe.
 * Kept only for backward compat — new code MUST use canonical QR.
 */
export function buildMockQrPaymentString(input: {
  walletId: string;
  amount: number;
  currency: string;
  reference: string;
}) {
  console.warn("[DEPRECATED] buildMockQrPaymentString — use qr.payUser() from qr-engine.ts");
  // Generate canonical format instead of legacy format
  return encodeQr(qr.payUser(input.walletId, { amount: input.amount, currency: input.currency }));
}
