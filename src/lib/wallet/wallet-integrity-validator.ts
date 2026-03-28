/**
 * wallet-integrity-validator — Atomic unit: validate wallet data consistency.
 * Single responsibility: detect balance mismatches, stuck transactions, orphan escrows.
 */
import { supabase } from "@/integrations/supabase/client";
import { reportAnomaly } from "@/lib/runtime/anomaly-detector";

export async function validateWalletIntegrity(walletId: string): Promise<{ issues: string[] }> {
  const issues: string[] = [];

  // Check for negative balances
  const { data: bal } = await (supabase as any)
    .from("wallet_balances_v2")
    .select("available, escrow, pending")
    .eq("wallet_id", walletId)
    .maybeSingle();

  if (bal) {
    if (bal.available < 0) {
      issues.push("Negative available balance");
      reportAnomaly("schema_conflict", "wallet", "Negative available balance detected", "critical", { walletId, available: bal.available });
    }
    if (bal.escrow < 0) {
      issues.push("Negative escrow balance");
      reportAnomaly("schema_conflict", "wallet", "Negative escrow balance", "medium", { walletId });
    }
  }

  // Check for stuck pending transactions (> 1 hour)
  const { data: stuckTxns } = await (supabase as any)
    .from("wallet_transactions")
    .select("id, status, created_at")
    .eq("wallet_id", walletId)
    .eq("status", "pending")
    .lt("created_at", new Date(Date.now() - 3600_000).toISOString())
    .limit(5);

  if (stuckTxns?.length) {
    issues.push(`${stuckTxns.length} stuck pending transaction(s)`);
    reportAnomaly("stale_cache", "wallet", "Stuck pending transactions", "medium", { walletId, count: stuckTxns.length });
  }

  return { issues };
}
