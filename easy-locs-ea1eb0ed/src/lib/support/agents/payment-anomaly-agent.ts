import { db } from "@/services/db";
import { platformBus } from "@/lib/shared/platform-bus";

const ANALYSIS_WINDOW_HOURS = 24;
const SUSPICIOUS_REFUND_THRESHOLD = 3;
const SUSPICIOUS_AMOUNT_THRESHOLD = 1000;

interface PaymentAnomaly {
  type: "multiple_refunds" | "high_value_dispute" | "rapid_transactions" | "chargeback_pattern";
  user_id: string;
  shop_id: string | null;
  details: string;
  severity: "medium" | "high" | "critical";
  evidence: Record<string, unknown>;
}

export async function runPaymentAnomalyAgent(): Promise<{
  anomaliesDetected: number;
}> {
  const cutoff = new Date(Date.now() - ANALYSIS_WINDOW_HOURS * 3600000).toISOString();
  const anomalies: PaymentAnomaly[] = [];

  const refundAnomalies = await detectMultipleRefunds(cutoff);
  anomalies.push(...refundAnomalies);

  const highValueAnomalies = await detectHighValueDisputes(cutoff);
  anomalies.push(...highValueAnomalies);

  for (const anomaly of anomalies) {
    await db("shop_quality_events").insert({
      shop_id: anomaly.shop_id ?? "00000000-0000-0000-0000-000000000000",
      event_type: anomaly.type === "multiple_refunds" || anomaly.type === "chargeback_pattern"
        ? "fraud_indicator"
        : "payment_anomaly",
      severity: anomaly.severity,
      metadata: {
        ...anomaly.evidence,
        anomaly_type: anomaly.type,
        user_id: anomaly.user_id,
        detected_at: new Date().toISOString(),
      },
    });

    platformBus.emit("support:payment_anomaly_detected", {
      type: anomaly.type,
      userId: anomaly.user_id,
      shopId: anomaly.shop_id,
      severity: anomaly.severity,
      details: anomaly.details,
    }, "system");
  }

  return { anomaliesDetected: anomalies.length };
}

async function detectMultipleRefunds(since: string): Promise<PaymentAnomaly[]> {
  const { data: refundSessions } = await db("support_sessions")
    .select("user_id, shop_id")
    .eq("issue_category", "refund_request")
    .gte("created_at", since);

  if (!refundSessions) return [];

  const userRefunds: Record<string, { count: number; shops: Set<string> }> = {};

  for (const s of refundSessions) {
    const uid = s.user_id as string;
    if (!userRefunds[uid]) userRefunds[uid] = { count: 0, shops: new Set() };
    userRefunds[uid].count++;
    if (s.shop_id) userRefunds[uid].shops.add(s.shop_id as string);
  }

  const anomalies: PaymentAnomaly[] = [];

  for (const [userId, data] of Object.entries(userRefunds)) {
    if (data.count >= SUSPICIOUS_REFUND_THRESHOLD) {
      anomalies.push({
        type: "multiple_refunds",
        user_id: userId,
        shop_id: data.shops.size === 1 ? [...data.shops][0] : null,
        details: `User requested ${data.count} refunds in ${ANALYSIS_WINDOW_HOURS}h across ${data.shops.size} shop(s)`,
        severity: data.count >= 5 ? "critical" : "high",
        evidence: {
          refund_count: data.count,
          shop_count: data.shops.size,
          window_hours: ANALYSIS_WINDOW_HOURS,
        },
      });
    }
  }

  return anomalies;
}

async function detectHighValueDisputes(since: string): Promise<PaymentAnomaly[]> {
  const { data: sessions } = await db("support_sessions")
    .select("user_id, shop_id, metadata")
    .in("issue_category", ["refund_request", "payment_issue"])
    .gte("created_at", since);

  if (!sessions) return [];

  const anomalies: PaymentAnomaly[] = [];

  for (const s of sessions) {
    const meta = s.metadata as Record<string, unknown> | null;
    const amount = (meta?.amount as number) ?? 0;

    if (amount >= SUSPICIOUS_AMOUNT_THRESHOLD) {
      anomalies.push({
        type: "high_value_dispute",
        user_id: s.user_id as string,
        shop_id: s.shop_id as string | null,
        details: `High-value dispute: ${amount} — requires admin review`,
        severity: amount >= 5000 ? "critical" : "high",
        evidence: { amount, threshold: SUSPICIOUS_AMOUNT_THRESHOLD },
      });
    }
  }

  return anomalies;
}
