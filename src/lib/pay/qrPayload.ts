/**
 * qrPayload — Normalized QR payment payload format.
 * Single source of truth for QR encode/decode across the app.
 */
export type PaymentQrPayload = {
  type: "wallet_pay";
  version: 1;
  recipientUserId?: string | null;
  recipientOrbitId?: string | null;
  recipientEmail?: string | null;
  amount?: number | null;
  currency?: string | null;
  note?: string | null;
};

export function buildPaymentQrPayload(input: {
  recipientUserId?: string | null;
  recipientOrbitId?: string | null;
  recipientEmail?: string | null;
  amount?: number | null;
  currency?: string | null;
  note?: string | null;
}): string {
  const payload: PaymentQrPayload = {
    type: "wallet_pay",
    version: 1,
    recipientUserId: input.recipientUserId ?? null,
    recipientOrbitId: input.recipientOrbitId ?? null,
    recipientEmail: input.recipientEmail ?? null,
    amount: input.amount ?? null,
    currency: input.currency ?? "AED",
    note: input.note ?? null,
  };
  return JSON.stringify(payload);
}

export function parsePaymentQrPayload(raw: string): PaymentQrPayload | null {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.type !== "wallet_pay" || parsed.version !== 1) return null;
    return parsed as PaymentQrPayload;
  } catch {
    return null;
  }
}
