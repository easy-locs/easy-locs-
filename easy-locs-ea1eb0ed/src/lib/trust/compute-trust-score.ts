/**
 * Trust score computation engine.
 */
export function computeTrustScore(params: {
  disputesCount?: number;
  cancellationsCount?: number;
  completedOrdersCount?: number;
  completedRidesCount?: number;
  successfulPaymentsCount?: number;
  moderationFlags?: number;
}) {
  const disputes = params.disputesCount ?? 0;
  const cancels = params.cancellationsCount ?? 0;
  const orders = params.completedOrdersCount ?? 0;
  const rides = params.completedRidesCount ?? 0;
  const payments = params.successfulPaymentsCount ?? 0;
  const flags = params.moderationFlags ?? 0;

  let trust = 50;
  trust += Math.min(20, orders * 0.2);
  trust += Math.min(15, rides * 0.25);
  trust += Math.min(10, payments * 0.15);
  trust -= Math.min(20, disputes * 4);
  trust -= Math.min(15, cancels * 1.5);
  trust -= Math.min(30, flags * 8);

  const bounded = Math.max(0, Math.min(100, Math.round(trust)));

  return {
    trustScore: bounded,
    safetyScore: Math.max(0, Math.min(100, bounded - flags * 5)),
    reliabilityScore: Math.max(0, Math.min(100, bounded - cancels * 2)),
  };
}
