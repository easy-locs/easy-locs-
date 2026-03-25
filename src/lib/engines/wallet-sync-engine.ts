/**
 * Wallet Sync Engine — Ensures wallet balances match ledger entries.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export async function runWalletSync(limit = 50) {
  const { data: wallets } = await db
    .from("wallet_accounts")
    .select("id, owner_user_id, balance, currency, status")
    .eq("status", "active")
    .limit(limit);

  let checked = 0, synced = 0, mismatches = 0;
  for (const w of wallets ?? []) {
    checked++;
    // Sum ledger entries
    const { data: entries } = await db
      .from("wallet_ledger_entries")
      .select("amount, direction")
      .eq("wallet_id", w.id);

    if (!entries?.length) continue;

    const ledgerBalance = entries.reduce((sum: number, e: any) => {
      return sum + (e.direction === "in" ? Number(e.amount) : -Number(e.amount));
    }, 0);

    const currentBalance = Number(w.balance ?? 0);
    if (Math.abs(currentBalance - ledgerBalance) > 0.01) {
      mismatches++;
      // Auto-correct
      await db.from("wallet_accounts").update({ balance: Math.round(ledgerBalance * 100) / 100 }).eq("id", w.id);
      synced++;
    }
  }

  return { checked, mismatches, synced };
}
