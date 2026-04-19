export interface DiscountInput {
  originalAmount: number;
  /** Amount to subtract; zero or negative is treated as no discount. */
  discountAmount: number;
}

/**
 * Subtract a discount from an original amount, clamping the result to zero.
 * Rounds to two decimal places to avoid floating-point drift.
 */
export function computeDiscountedAmount({ originalAmount, discountAmount }: DiscountInput): number {
  const result = originalAmount - (discountAmount > 0 ? discountAmount : 0);
  return Math.round(Math.max(0, result) * 100) / 100;
}
