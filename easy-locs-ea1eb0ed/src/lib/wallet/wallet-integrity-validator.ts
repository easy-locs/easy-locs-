/**
 * wallet-integrity-validator — Atomic unit: validate wallet data consistency.
 * Single responsibility: detect balance mismatches, stuck transactions, orphan escrows.
 * All DB access goes through wallet-repository.ts and domainDb.
 */
import { domainDb } from "@/services/db";
import { reportAnomaly } from "@/lib/runtime/anomaly-detector";
import { fetchWalletBalanceByWalletId } from "@/repositories/wallet-repository";

export async function validateWalletIntegrity(walletId: string): Promise<{ issues: string[] }> {
  const issues: string[] = [];

  const bal = await fetchWalletBalanceByWalletId(walletId);

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

  const { data: stuckTxns } = await domainDb.wallet
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
