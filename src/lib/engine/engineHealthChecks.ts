import { supabase } from "@/integrations/supabase/client";
import { setEngineHealth } from "@/lib/engine/centralEngineRuntime";

async function pingTable(table: string) {
  const { error } = await (supabase as any).from(table).select("*").limit(1);
  return !error;
}

export async function runEngineHealthChecks() {
  const checks = [
    { key: "orders", table: "orders" },
    { key: "payments", table: "orders" },
    { key: "dispatch", table: "driver_profiles" },
    { key: "wallet", table: "wallet_accounts" },
    { key: "support", table: "support_tickets" },
    { key: "notifications", table: "notifications" },
    { key: "analytics", table: "activity_logs" },
    { key: "merchant", table: "seed_merchants" },
    { key: "driver", table: "driver_profiles" },
    { key: "loyalty", table: "loyalty_accounts" },
  ] as const;

  for (const row of checks) {
    try {
      const ok = await pingTable(row.table);
      setEngineHealth(row.key as any, ok, ok ? "reachable" : "table check failed");
    } catch (e: any) {
      setEngineHealth(row.key as any, false, e?.message || "unknown failure");
    }
  }

  return true;
}
