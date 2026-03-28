/**
 * order-fetcher — Atomic unit: fetch orders with structured logging.
 * Single responsibility: DB query for orders, no transformation.
 */
import { supabase } from "@/integrations/supabase/client";
import { reportHealth } from "@/lib/runtime/health-aggregator";

const trace = (step: string, phase: "input" | "output" | "error", payload?: Record<string, unknown>) => {
  const logger = phase === "error" ? console.error : console.log;
  logger(`[ORDER][${step}] ${phase}:`, payload ?? {});
};

export async function fetchOrdersByUser(userId: string, limit = 50) {
  trace("fetch.byUser", "input", { userId, limit });
  const start = Date.now();
  const { data, error } = await (supabase as any)
    .from("orders")
    .select("*")
    .or(`customer_user_id.eq.${userId},merchant_user_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(limit);

  const latency = Date.now() - start;
  if (error) {
    trace("fetch.byUser", "error", { message: error.message, latency });
    reportHealth("orders", "degraded", latency, error.message);
    return [];
  }

  trace("fetch.byUser", "output", { count: data?.length ?? 0, latency });
  reportHealth("orders", "ok", latency);
  return data ?? [];
}

export async function fetchOrderById(orderId: string) {
  trace("fetch.byId", "input", { orderId });
  const start = Date.now();
  const { data, error } = await (supabase as any)
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  const latency = Date.now() - start;
  if (error) {
    trace("fetch.byId", "error", { message: error.message });
    reportHealth("orders", "degraded", latency, error.message);
    return null;
  }

  trace("fetch.byId", "output", { found: !!data, latency });
  return data;
}

export async function fetchOrdersByOrg(orgId: string, status?: string, limit = 100) {
  trace("fetch.byOrg", "input", { orgId, status, limit });
  const start = Date.now();
  let query = (supabase as any)
    .from("orders")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  const latency = Date.now() - start;
  if (error) {
    trace("fetch.byOrg", "error", { message: error.message });
    reportHealth("orders", "degraded", latency, error.message);
    return [];
  }

  trace("fetch.byOrg", "output", { count: data?.length ?? 0, latency });
  reportHealth("orders", "ok", latency);
  return data ?? [];
}
