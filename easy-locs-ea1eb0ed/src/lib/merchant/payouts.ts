/**
 * Merchant payouts — calculate net payout after platform fees.
 */

export interface PayoutSummary {
  gross: number;
  platformFee: number;
  net: number;
  feeRate: number;
  currency: string;
  orderCount: number;
}

export function calculateMerchantPayout(
  orders: Array<{ total_amount: number | string; currency?: string }>,
  feeRate = 0.05
): PayoutSummary {
  const gross = orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  const platformFee = Number((gross * feeRate).toFixed(2));
  const net = Number((gross - platformFee).toFixed(2));

  return {
    gross: Number(gross.toFixed(2)),
    platformFee,
    net,
    feeRate,
    currency: orders[0]?.currency || "AED",
    orderCount: orders.length,
  };
}
