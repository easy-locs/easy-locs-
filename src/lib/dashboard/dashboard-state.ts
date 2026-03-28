/**
 * dashboard-state — Atomic unit: aggregate dashboard KPIs from multiple sources.
 * Single responsibility: data aggregation for dashboard display.
 */
import { supabase } from "@/integrations/supabase/client";
import { reportHealth } from "@/lib/runtime/health-aggregator";

const trace = (step: string, phase: "input" | "output" | "error", payload?: Record<string, unknown>) => {
  const logger = phase === "error" ? console.error : console.log;
  logger(`[DASHBOARD][${step}] ${phase}:`, payload ?? {});
};

export interface DashboardKPIs {
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  activeListings: number;
  unreadMessages: number;
  activeDeliveries: number;
}

export async function fetchDashboardKPIs(orgId: string): Promise<DashboardKPIs> {
  trace("kpis", "input", { orgId });
  const start = Date.now();

  const [ordersRes, pendingRes, listingsRes, deliveriesRes] = await Promise.all([
    (supabase as any).from("orders").select("id", { count: "exact", head: true }).eq("org_id", orgId),
    (supabase as any).from("orders").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("status", "pending"),
    (supabase as any).from("marketplace_services").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("active", true),
    (supabase as any).from("mobility_jobs").select("id", { count: "exact", head: true }).eq("org_id", orgId).in("status", ["assigned", "picked_up", "delivering"]),
  ]);

  const kpis: DashboardKPIs = {
    totalOrders: ordersRes.count ?? 0,
    pendingOrders: pendingRes.count ?? 0,
    totalRevenue: 0,
    activeListings: listingsRes.count ?? 0,
    unreadMessages: 0,
    activeDeliveries: deliveriesRes.count ?? 0,
  };

  const latency = Date.now() - start;
  trace("kpis", "output", { ...kpis, latency });
  reportHealth("dashboard", "ok", latency);
  return kpis;
}
