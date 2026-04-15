import { db } from "@/services/db";

const TABLES_TO_CHECK = [
  "profiles",
  "orders",
  "mobility_jobs",
  "wallet_accounts",
] as const;

export async function verifyRlsBasicAccess() {
  const results: { key: string; ok: boolean; reason: string }[] = [];

  for (const table of TABLES_TO_CHECK) {
    try {
      const { error } = await db(table).select("id").limit(1);
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
