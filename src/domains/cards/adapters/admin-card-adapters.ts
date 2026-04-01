/**
 * Card Adapters — Admin Surface
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
        data: null,
        deepLink: "/admin/ops",
        primaryAction: {
          label: "View Dashboard",
          run: () => { window.location.href = "/admin/ops"; },
        },
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
        data: null,
        deepLink: "/admin/super",
        primaryAction: {
          label: "View Dashboard",
          run: () => { window.location.href = "/admin/super"; },
        },
      }),
    [],
  );
}
