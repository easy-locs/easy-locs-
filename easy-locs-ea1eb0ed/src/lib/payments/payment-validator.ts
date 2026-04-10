/**
 * payment-validator — Atomic unit: validate payment inputs before processing.
 * Single responsibility: input validation only, no DB calls.
 */

const trace = (step: string, phase: "input" | "output" | "error", payload?: Record<string, unknown>) => {
  const logger = phase === "error" ? console.error : console.log;
  logger(`[PAYMENTS][${step}] ${phase}:`, payload ?? {});
};

export interface PaymentValidation {
  valid: boolean;
  errors: string[];
}

const SUPPORTED_CURRENCIES = ["EUR", "USD", "GBP", "MAD", "AED", "XOF", "XAF"];
const MIN_AMOUNT = 0.5;
const MAX_AMOUNT = 50000;

export function validatePaymentInput(params: {
  amount: number;
  currency: string;
  userId?: string;
  recipientId?: string;
}): PaymentValidation {
  trace("validate", "input", params);
  const errors: string[] = [];

  if (!params.amount || params.amount < MIN_AMOUNT) {
    errors.push(`Amount must be at least ${MIN_AMOUNT}`);
  }
  if (params.amount > MAX_AMOUNT) {
    errors.push(`Amount exceeds maximum ${MAX_AMOUNT}`);
  }
  if (!SUPPORTED_CURRENCIES.includes(params.currency)) {
    errors.push(`Unsupported currency: ${params.currency}`);
  }
  if (params.userId && params.recipientId && params.userId === params.recipientId) {
    errors.push("Cannot pay yourself");
  }

  const result = { valid: errors.length === 0, errors };
  trace("validate", "output", result);
  return result;
}
