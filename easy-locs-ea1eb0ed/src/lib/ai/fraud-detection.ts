/**
 * fraud-detection — Client-side heuristic fraud signal scorer.
 * STATUS: Rule-based placeholder. Not integrated into the transaction pipeline.
 * TODO: Move to server-side Edge Function or DB trigger on aml_events table
 * for real-time fraud gating on wallet transfers.
 */

export function detectFraudSignals(params: {
  cancelRate: number;
  avgTripTime: number;
  gpsJumps?: boolean;
  multipleAccounts?: boolean;
}) {
  let score = 0;
  const flags: string[] = [];

  if (params.cancelRate > 0.4) {
    score += 30;
    flags.push("high_cancel_rate");
  }

  if (params.avgTripTime < 2) {
    score += 25;
    flags.push("suspicious_short_trips");
  }

  if (params.gpsJumps) {
    score += 40;
    flags.push("gps_spoofing");
  }

  if (params.multipleAccounts) {
    score += 50;
    flags.push("multi_account_abuse");
  }

  return {
    riskScore: Math.min(100, score),
    flags,
  };
}
