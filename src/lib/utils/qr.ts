export function buildMockQrPaymentString(input: {
  walletId: string;
  amount: number;
  currency: string;
  reference: string;
}) {
  return JSON.stringify({
    type: "wallet_qr_payment",
    walletId: input.walletId,
    amount: input.amount,
    currency: input.currency,
    reference: input.reference,
    createdAt: new Date().toISOString(),
  });
}
