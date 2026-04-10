/**
 * Card Adapters — Admin Surface
 * Real data from admin queries.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { buildCardContract, type CardContract } from "../card-contract";
import { db } from "@/services/db";

// ── Ops Metrics Card — REAL data from admin tables ──
export function useOpsMetricsCard(): CardContract<{
  pendingAlerts: number;
  activeWorkflows: number;
  openApprovals: number;
}> {
  const { data: metrics, error } = useQuery({
    queryKey: ["admin-ops-metrics-card"],
    queryFn: async () => {
      const [alerts, workflows, approvals] = await Promise.all([
        db("admin_alerts").select("id", { count: "exact", head: true }).eq("status", "open"),
        db("automation_workflows").select("id", { count: "exact", head: true }).in("status", ["running", "pending"]),
        db("approval_queues").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      return {
        pendingAlerts: alerts.count ?? 0,
        activeWorkflows: workflows.count ?? 0,
        openApprovals: approvals.count ?? 0,
      };
    },
    staleTime: 60_000,
  });

  return useMemo(
    () =>
      buildCardContract({
        id: "ops_metrics",
        domain: "analytics",
        title: "Operations Metrics",
        data: metrics ?? null,
        error: error?.message,
        deepLink: "/admin/ops",
        primaryAction: {
          label: "View Dashboard",
          actionType: "navigation" as const,
          run: () => { window.location.href = "/admin/ops"; },
        },
      }),
    [metrics, error],
  );
}

// ── Super Metrics Card — REAL data from audit tables ──
export function useSuperMetricsCard(): CardContract<{
  totalShops: number;
  totalUsers: number;
  latestAuditScore: number;
}> {
  const { data: metrics, error } = useQuery({
    queryKey: ["admin-super-metrics-card"],
    queryFn: async () => {
      const [shops, reports] = await Promise.all([
        db("storefront_pages").select("id", { count: "exact", head: true }),
        db("audit_reports").select("global_score").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      return {
        totalShops: shops.count ?? 0,
        totalUsers: 0, // auth.users not accessible from client
        latestAuditScore: reports.data?.global_score ?? 0,
      };
    },
    staleTime: 120_000,
  });

  return useMemo(
    () =>
      buildCardContract({
        id: "super_metrics",
        domain: "analytics",
        title: "Super Admin Metrics",
        data: metrics ?? null,
        error: error?.message,
        deepLink: "/admin/super",
        primaryAction: {
          label: "View Dashboard",
          actionType: "navigation" as const,
          run: () => { window.location.href = "/admin/super"; },
        },
      }),
    [metrics, error],
  );
}
