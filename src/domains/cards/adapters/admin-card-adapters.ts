/**
 * Card Adapters — Admin Surface
 * Canonical adapters for admin ops/super cards.
 */
import { useMemo } from "react";
import { buildCardContract, type CardContract } from "../card-contract";

// ── Ops Metrics Card ──
export function useOpsMetricsCard(): CardContract<Record<string, number>> {
  return useMemo(
    () =>
      buildCardContract({
        id: "ops_metrics",
        domain: "analytics",
        title: "Operations Metrics",
        data: null, // populated by admin ops query pipeline
        deepLink: "/admin/ops",
      }),
    [],
  );
}

// ── Super Metrics Card ──
export function useSuperMetricsCard(): CardContract<Record<string, number>> {
  return useMemo(
    () =>
      buildCardContract({
        id: "super_metrics",
        domain: "analytics",
        title: "Super Admin Metrics",
        data: null, // populated by super admin query pipeline
        deepLink: "/admin/super",
      }),
    [],
  );
}
