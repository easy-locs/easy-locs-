/**
 * MOLECULE: createPaymentIntentDraft — Assembles a validated payment intent draft.
 */
import { validatePaymentInput, type PaymentInput } from "../microns/validate-payment-input.micron";
import { createCorrelationId } from "@/domains/shared/atoms/create-correlation-id.atom";
import type { PaymentStatus, CurrencyCode } from "@/domains/shared/canonical-types";

export interface PaymentIntentDraft {
  userId: string;
  amount: number;
  currency: CurrencyCode;
  correlationId: string;
  status: PaymentStatus;
}

export function createPaymentIntentDraft(input: PaymentInput): PaymentIntentDraft {
  const validation = validatePaymentInput(input);
  if (!validation.ok) throw new Error(validation.reason);

  return {
    userId: input.userId,
    amount: input.amount,
    currency: input.currency as CurrencyCode,
    correlationId: createCorrelationId(),
    status: "created",
  };
}
