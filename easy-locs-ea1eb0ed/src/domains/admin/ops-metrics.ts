/**
 * Ops Metrics — Aggregator for the realtime operations dashboard.
 *
 * Consumes raw snapshots (rides, deliveries, payments, orbit transport stats)
 * and produces the KPI set displayed on the ops dashboard:
 *   - live rides by status, median wait, acceptance rate
 *   - delivery queue depth / late rate
 *   - payment success rate / webhook retries
 *   - orbit p95 latency / reconnect rate
 */

export interface RideSnapshot {
  status: string;
  createdAt: string;
  acceptedAt?: string | null;
  completedAt?: string | null;
  price: number;
  currency: string;
}

export interface DeliverySnapshot {
  status: string;
  etaMinutes?: number;
  slaMinutes?: number;
  createdAt: string;
}

export interface PaymentSnapshot {
  status: "succeeded" | "pending" | "failed" | "refunded";
  amount: number;
  currency: string;
  retries?: number;
  webhookAttempts?: number;
}

export interface OrbitTransportSample {
  p95DeliveryMs: number;
  reconnectCount: number;
  windowSeconds: number;
}

export interface OpsDashboardData {
  rides: {
    total: number;
    byStatus: Record<string, number>;
    medianWaitSeconds: number;
    acceptanceRate: number;
    grossByCurrency: Record<string, number>;
  };
  deliveries: {
    total: number;
    inProgress: number;
    lateRate: number;
  };
  payments: {
    total: number;
    successRate: number;
    failureCount: number;
    webhookRetrySum: number;
    grossByCurrency: Record<string, number>;
  };
  orbit: {
    p95DeliveryMs: number;
    reconnectsPerMinute: number;
  };
  generatedAt: string;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function aggregateOpsDashboard(input: {
  rides: RideSnapshot[];
  deliveries: DeliverySnapshot[];
  payments: PaymentSnapshot[];
  orbit: OrbitTransportSample;
}): OpsDashboardData {
  const byStatus: Record<string, number> = {};
  const waitSecs: number[] = [];
  let accepted = 0;
  let requested = 0;
  const ridesGross: Record<string, number> = {};

  for (const r of input.rides) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    requested += 1;
    if (r.acceptedAt) {
      accepted += 1;
      const w = (new Date(r.acceptedAt).getTime() - new Date(r.createdAt).getTime()) / 1000;
      if (Number.isFinite(w) && w >= 0) waitSecs.push(w);
    }
    if (r.status === "completed") {
      ridesGross[r.currency] = round2((ridesGross[r.currency] ?? 0) + r.price);
    }
  }

  let lateCount = 0;
  let inProgressDel = 0;
  for (const d of input.deliveries) {
    if (d.status !== "delivered" && d.status !== "cancelled") inProgressDel += 1;
    if (d.etaMinutes !== undefined && d.slaMinutes !== undefined && d.etaMinutes > d.slaMinutes) {
      lateCount += 1;
    }
  }

  let paySuccess = 0;
  let payFailed = 0;
  let webhookRetrySum = 0;
  const paymentGross: Record<string, number> = {};
  for (const p of input.payments) {
    if (p.status === "succeeded") {
      paySuccess += 1;
      paymentGross[p.currency] = round2((paymentGross[p.currency] ?? 0) + p.amount);
    } else if (p.status === "failed") {
      payFailed += 1;
    }
    webhookRetrySum += p.webhookAttempts ?? 0;
  }

  const reconnectsPerMinute = input.orbit.windowSeconds > 0
    ? round2((input.orbit.reconnectCount / input.orbit.windowSeconds) * 60)
    : 0;

  return {
    rides: {
      total: input.rides.length,
      byStatus,
      medianWaitSeconds: round2(median(waitSecs)),
      acceptanceRate: requested > 0 ? round2(accepted / requested) : 0,
      grossByCurrency: ridesGross,
    },
    deliveries: {
      total: input.deliveries.length,
      inProgress: inProgressDel,
      lateRate: input.deliveries.length > 0 ? round2(lateCount / input.deliveries.length) : 0,
    },
    payments: {
      total: input.payments.length,
      successRate: input.payments.length > 0 ? round2(paySuccess / input.payments.length) : 0,
      failureCount: payFailed,
      webhookRetrySum,
      grossByCurrency: paymentGross,
    },
    orbit: {
      p95DeliveryMs: input.orbit.p95DeliveryMs,
      reconnectsPerMinute,
    },
    generatedAt: new Date().toISOString(),
  };
}
