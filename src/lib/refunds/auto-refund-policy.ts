/**
 * Auto-refund policy — determines if a refund should be auto-approved.
 */
export function shouldAutoApproveRefund(params: {
  contextType: string;
  amount: number;
  reason?: string;
  riskScore?: number;
}) {
  const { contextType, amount, reason, riskScore = 0 } = params;

  if (riskScore > 70) return false;
  if (contextType === "ride" && amount <= 20) return true;
  if (reason === "driver_no_show" && amount <= 30) return true;
  if (reason === "duplicate_charge") return true;

  return false;
}
