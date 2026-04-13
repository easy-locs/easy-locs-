/**
 * fraud-detection — Client-side heuristic fraud signal scorer.
 * Produces a risk score (0–100) and flag list used for UI warnings
 * and pre-screening before server-side enforcement.
 * Server-side gating handled by Edge Functions on the aml_events table.
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
