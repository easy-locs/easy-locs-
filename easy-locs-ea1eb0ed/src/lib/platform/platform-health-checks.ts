/**
 * PLATFORM HEALTH CHECKS
 * Periodic health verification for geo, wallet/QR, leads, and backend reconnect.
 */

import { db } from "@/services/db";
import { useGeoStore } from "@/lib/geo/geo-store";
import { geoService } from "@/lib/geo/geo-service";

export interface HealthCheckResult {
  module: string;
  healthy: boolean;
  detail: string;
  action?: string;
}

// ── Geo Health ──────────────────────────────────────────────

export function checkGeoHealth(): HealthCheckResult {
  const geo = useGeoStore.getState();

  if ((geo.permission as string) === "denied") {
    return { module: "geo", healthy: false, detail: "Permission denied by user", action: "none" };
  }

  if (!geo.point && !geo.loading && (geo.permission as string) !== "denied") {
    // Geo is not tracking and has no point — auto retry
    geoService.forceRetry();
    return { module: "geo", healthy: false, detail: "No position, triggered retry", action: "retry" };
  }

  if (geo.point) {
    const age = Date.now() - geo.point.timestamp;
    if (age > 5 * 60_000) {
      geoService.forceRetry();
      return { module: "geo", healthy: false, detail: `Stale position (${Math.round(age / 1000)}s old), retrying`, action: "retry" };
    }
    const quality = (geo.point.accuracy ?? 999) < 100 ? "exact" : "approximate";
    return { module: "geo", healthy: true, detail: `${quality} (±${Math.round(geo.point.accuracy ?? 0)}m)` };
  }

  if (geo.loading) {
    return { module: "geo", healthy: true, detail: "Acquiring position..." };
  }

  return { module: "geo", healthy: false, detail: "Unknown geo state" };
}

// ── Wallet / QR Health ──────────────────────────────────────

export async function checkWalletHealth(): Promise<HealthCheckResult> {
  try {
    const { error } = await db.rpc("ensure_wallet_account" as any, {
      target_user_id: "00000000-0000-0000-0000-000000000000",
      target_currency: "AED",
    } as any);
    // We expect this to fail with "user not found" — that means the RPC is reachable
    const reachable = !error || !error.message?.includes("Could not find the function");
    return {
      module: "wallet_rpc",
      healthy: reachable,
      detail: reachable ? "ensure_wallet_account reachable" : error?.message ?? "unreachable",
    };
  } catch (e: any) {
    return { module: "wallet_rpc", healthy: false, detail: e?.message ?? "crash" };
  }
}

// ── Lead Pipeline Health ────────────────────────────────────

export async function checkLeadPipeline(): Promise<HealthCheckResult> {
  try {
    const { count, error } = await db
      .from("boost_leads")
      .select("id", { count: "exact", head: true })
      .eq("status", "new");

    if (error) return { module: "lead_pipeline", healthy: false, detail: error.message };
    return { module: "lead_pipeline", healthy: true, detail: `${count ?? 0} new leads pending` };
  } catch (e: any) {
    return { module: "lead_pipeline", healthy: false, detail: e?.message ?? "crash" };
  }
}

// ── Backend Reconnect ───────────────────────────────────────

export async function checkBackendReconnect(): Promise<HealthCheckResult[]> {
  const results: HealthCheckResult[] = [];

  // Check critical tables
  const criticalTables = [
    "storefront_pages", "wallet_accounts", "conversations_v2",
    "boost_campaigns", "orders", "orbit_profiles_v2",
  ];

  const checks = await Promise.all(
    criticalTables.map(async (table) => {
      try {
        const { error } = await db(table).select("id").limit(1);
        return { module: `reconnect.${table}`, healthy: !error, detail: error ? error.message : "ok" };
      } catch (e: any) {
        return { module: `reconnect.${table}`, healthy: false, detail: e?.message ?? "crash" };
      }
    })
  );

  results.push(...checks);

  // Check realtime connectivity
  try {
    const channels = db.getChannels();
    results.push({
      module: "reconnect.realtime",
      healthy: true,
      detail: `${channels.length} active channels`,
    });
  } catch {
    results.push({ module: "reconnect.realtime", healthy: false, detail: "Cannot read channels" });
  }

  return results;
}

// ── Run all health checks ───────────────────────────────────

export async function runAllHealthChecks(): Promise<HealthCheckResult[]> {
  const results: HealthCheckResult[] = [];

  results.push(checkGeoHealth());
  results.push(await checkWalletHealth());
  results.push(await checkLeadPipeline());
  results.push(...await checkBackendReconnect());

  return results;
}
