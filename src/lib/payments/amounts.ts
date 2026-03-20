export function computeDiscountedAmount(params: {
  originalAmount: number;
  discountAmount?: number | null;
}) {
  const original = Number(params.originalAmount || 0);
  const discount = Number(params.discountAmount || 0);
  return Math.max(0, original - discount);
}
