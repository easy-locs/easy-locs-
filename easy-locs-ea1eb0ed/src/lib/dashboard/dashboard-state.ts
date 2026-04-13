/**
 * dashboard-state — Atomic unit: aggregate dashboard KPIs from multiple sources.
 * Single responsibility: data aggregation for dashboard display.
 */
import { db } from "@/services/db";
import { reportHealth } from "@/lib/runtime/health-aggregator";
import { fetchUnreadCount } from "@/repositories/communication.repository";

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

export async function fetchDashboardKPIs(orgId: string, userId?: string): Promise<DashboardKPIs> {
  trace("kpis", "input", { orgId, userId });
  const start = Date.now();

  const [ordersRes, pendingRes, listingsRes, deliveriesRes, walletRes, unreadCount] = await Promise.all([
    db("orders").select("id", { count: "exact", head: true }).eq("org_id", orgId),
    db("orders").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("status", "pending"),
    db("marketplace_services").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("active", true),
    db("mobility_jobs").select("id", { count: "exact", head: true }).eq("org_id", orgId).in("status", ["assigned", "picked_up", "delivering"]),
    db("wallet_transactions").select("amount").eq("recipient_id", orgId).eq("status", "completed"),
    userId ? fetchUnreadCount(userId).catch(() => 0) : Promise.resolve(0),
  ]);

  const totalRevenue = Array.isArray(walletRes.data)
    ? (walletRes.data as { amount: number }[]).reduce((sum, tx) => sum + (tx.amount ?? 0), 0)
    : 0;

  const kpis: DashboardKPIs = {
    totalOrders: ordersRes.count ?? 0,
    pendingOrders: pendingRes.count ?? 0,
    totalRevenue,
    activeListings: listingsRes.count ?? 0,
    unreadMessages: unreadCount,
    activeDeliveries: deliveriesRes.count ?? 0,
  };

  const latency = Date.now() - start;
  trace("kpis", "output", { ...kpis, latency });
  reportHealth("dashboard", "ok", latency);
  return kpis;
}
