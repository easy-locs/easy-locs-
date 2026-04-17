import { db } from "@/services/db";
import { platformBus } from "@/lib/shared/platform-bus";
import type { ShopQualityScore } from "../support-types";

import { cFrom, cRpc } from "@/lib/execution/content-mutation";
const ANALYSIS_WINDOW_DAYS = 30;
const POOR_RESPONSE_THRESHOLD = 0.5;
const HIGH_COMPLAINT_THRESHOLD = 0.15;
const HIGH_REFUND_THRESHOLD = 0.1;
const FRAUD_FLAG_THRESHOLD = 3;

export async function runShopMonitorAgent(): Promise<{
  shopsAnalyzed: number;
  alertsRaised: number;
}> {
  let alertsRaised = 0;

  const cutoff = new Date(Date.now() - ANALYSIS_WINDOW_DAYS * 86400000).toISOString();

  const { data: activeShops } = await cFrom("support_sessions")
    .select("shop_id")
    .not("shop_id", "is", null)
    .gte("created_at", cutoff)
    .then((res: { data: Array<{ shop_id: string }> | null }) => ({
      data: [...new Set((res.data ?? []).map((s) => s.shop_id))],
    }));

  const shopIds = activeShops ?? [];

  for (const shopId of shopIds) {
    const score = await computeShopQualityScore(shopId, cutoff);

    await cFrom("shop_quality_scores").upsert({
      shop_id: shopId,
      response_rate: score.response_rate,
      avg_response_time_minutes: score.avg_response_time_minutes,
      complaint_rate: score.complaint_rate,
      refund_rate: score.refund_rate,
      fraud_flags: score.fraud_flags,
      overall_score: score.overall_score,
      last_updated: new Date().toISOString(),
    }, { onConflict: "shop_id" });

    if (score.overall_score < 0.3) {
      platformBus.emit("support:shop_quality_alert", {
        shopId,
        score: score.overall_score,
        reason: "Overall quality below threshold",
        metrics: score,
      }, "system");
      alertsRaised++;
    }

    if (score.fraud_flags >= FRAUD_FLAG_THRESHOLD) {
      platformBus.emit("support:shop_fraud_alert", {
        shopId,
        fraudFlags: score.fraud_flags,
      }, "system");
      alertsRaised++;
    }
  }

  return { shopsAnalyzed: shopIds.length, alertsRaised };
}

async function computeShopQualityScore(
  shopId: string,
  since: string,
): Promise<ShopQualityScore> {
  const { data: sessions } = await cFrom("support_sessions")
    .select("*")
    .eq("shop_id", shopId)
    .gte("created_at", since);

  const allSessions = sessions ?? [];
  const totalSessions = allSessions.length;

  if (totalSessions === 0) {
    return {
      shop_id: shopId,
      response_rate: 1,
      avg_response_time_minutes: 0,
      complaint_rate: 0,
      refund_rate: 0,
      fraud_flags: 0,
      overall_score: 1,
      last_updated: new Date().toISOString(),
    };
  }

  const responded = allSessions.filter(
    (s: Record<string, unknown>) => s.shop_response_at != null,
  ).length;
  const responseRate = responded / totalSessions;

  const responseTimes = allSessions
    .filter(
      (s: Record<string, unknown>) =>
        s.shop_response_at != null && s.created_at != null,
    )
    .map(
      (s: Record<string, unknown>) =>
        (new Date(s.shop_response_at as string).getTime() -
          new Date(s.created_at as string).getTime()) /
        60000,
    );
  const avgResponseTime =
    responseTimes.length > 0
      ? responseTimes.reduce((a: number, b: number) => a + b, 0) / responseTimes.length
      : 0;

  const complaints = allSessions.filter(
    (s: Record<string, unknown>) =>
      s.issue_category === "shop_complaint" || s.issue_category === "quality_complaint",
  ).length;
  const complaintRate = complaints / totalSessions;

  const refunds = allSessions.filter(
    (s: Record<string, unknown>) => s.issue_category === "refund_request",
  ).length;
  const refundRate = refunds / totalSessions;

  const { count: fraudCount } = await cFrom("shop_quality_events")
    .select("*", { count: "exact", head: true })
    .eq("shop_id", shopId)
    .eq("event_type", "fraud_indicator")
    .gte("created_at", since);

  const fraudFlags = fraudCount ?? 0;

  let overallScore = 1.0;
  if (responseRate < POOR_RESPONSE_THRESHOLD) overallScore -= 0.3;
  else if (responseRate < 0.8) overallScore -= 0.15;

  if (complaintRate > HIGH_COMPLAINT_THRESHOLD) overallScore -= 0.25;
  if (refundRate > HIGH_REFUND_THRESHOLD) overallScore -= 0.2;
  if (fraudFlags >= FRAUD_FLAG_THRESHOLD) overallScore -= 0.3;
  if (avgResponseTime > 60) overallScore -= 0.1;

  overallScore = Math.max(0, Math.min(1, overallScore));

  return {
    shop_id: shopId,
    response_rate: responseRate,
    avg_response_time_minutes: avgResponseTime,
    complaint_rate: complaintRate,
    refund_rate: refundRate,
    fraud_flags: fraudFlags,
    overall_score: overallScore,
    last_updated: new Date().toISOString(),
  };
}
