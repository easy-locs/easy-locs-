/**
 * fraud-detection — AI fraud signal detection engine.
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
