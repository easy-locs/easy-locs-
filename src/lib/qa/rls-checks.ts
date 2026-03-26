import { supabase } from "@/integrations/supabase/client";

const TABLES_TO_CHECK = [
  "workspaces",
  "orders",
  "mobility_jobs",
  "wallet_balances",
  "user_profiles",
] as const;

export async function verifyRlsBasicAccess() {
  const results: { key: string; ok: boolean; reason: string }[] = [];

  for (const table of TABLES_TO_CHECK) {
    try {
      const { error } = await (supabase as any).from(table).select("id").limit(1);
      results.push({
        key: table,
        ok: !error,
        reason: error ? error.message : "Accessible",
      });
    } catch (e: any) {
      results.push({ key: table, ok: false, reason: e.message });
    }
  }

  return results;
}
