/**
 * alert-policies — Auto-alert rules for fraud, hot zones, payout backlogs.
 */
import { createAdminAlert } from "@/lib/admin/create-admin-alert";

export async function alertHighRiskUser(params: {
  userId: string;
  riskScore: number;
}) {
  if (params.riskScore < 80) return { ok: true, skipped: true };

  return createAdminAlert({
    alertType: "high_risk_user",
    severity: "high",
    title: "High risk rider detected",
    body: `User ${params.userId} reached risk score ${params.riskScore}`,
    contextType: "user",
    contextId: params.userId,
    metadata: { risk_score: params.riskScore },
  });
}

export async function alertHotZone(params: {
  zoneKey: string;
  surgeMultiplier: number;
  activeRequests: number;
  activeDrivers: number;
}) {
  if (params.surgeMultiplier <= 1.8) return { ok: true, skipped: true };

  return createAdminAlert({
    alertType: "hot_zone",
    severity: "critical",
    title: "Critical demand zone",
    body: `${params.zoneKey} at ${params.surgeMultiplier.toFixed(2)}x surge`,
    contextType: "zone",
    contextId: null,
    metadata: {
      zone_key: params.zoneKey,
      surge: params.surgeMultiplier,
      active_requests: params.activeRequests,
      active_drivers: params.activeDrivers,
    },
  });
}

export async function alertPayoutBacklog(params: {
  pendingCount: number;
}) {
  if (params.pendingCount < 20) return { ok: true, skipped: true };

  return createAdminAlert({
    alertType: "payout_backlog",
    severity: "high",
    title: "Payout backlog growing",
    body: `${params.pendingCount} payouts pending`,
    contextType: "driver_payout",
    metadata: { pending_count: params.pendingCount },
  });
}
