/**
 * MICRON: validatePaymentInput — Validates a payment command before processing.
 */
import type { CurrencyCode } from "@/domains/shared/canonical-types";
import { isValidAmount, isValidCurrency } from "../atoms/is-final-payment-status.atom";

export interface PaymentInput {
  userId: string;
  amount: number;
  currency: string;
}

export type ValidationResult = { ok: true } | { ok: false; reason: string };

export function validatePaymentInput(input: PaymentInput): ValidationResult {
  if (!input.userId) return { ok: false, reason: "Missing userId" };
  if (!isValidAmount(input.amount)) return { ok: false, reason: "Invalid amount" };
  if (!isValidCurrency(input.currency)) return { ok: false, reason: `Unsupported currency: ${input.currency}` };
  return { ok: true };
}
