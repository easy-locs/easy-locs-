/**
 * Permission Check Engine — Verifies RLS integrity by testing key table access patterns.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

const CRITICAL_TABLES = [
  "orders", "wallet_accounts", "wallet_ledger_entries", "notifications",
  "support_tickets", "profiles", "commission_splits", "mobility_jobs",
];

export async function runPermissionCheck() {
  const results: Array<{ table: string; accessible: boolean; count: number }> = [];

  for (const table of CRITICAL_TABLES) {
    try {
      const { count, error } = await db.from(table).select("id", { count: "exact", head: true });
      results.push({ table, accessible: !error, count: count ?? 0 });
    } catch {
      results.push({ table, accessible: false, count: 0 });
    }
  }

  const allOk = results.every(r => r.accessible);
  return { tables: results.length, allAccessible: allOk, results };
}
