/**
 * DEPRECATED — V1 wallet reads. 
 * REPLACED_BY: useWalletBalance() and useWalletTransactions() from src/payments/wallet-hooks.ts
 * TO_REMOVE after V1 routes are removed.
 */
import { supabase } from "@/integrations/supabase/client";

/** @deprecated Use useWalletBalance() hook instead */
export async function getV1WalletAccounts(userId: string) {
  console.warn("[DEPRECATED] getV1WalletAccounts — use useWalletBalance() hook");
  const { data, error } = await (supabase as any)
    .from("wallet_accounts")
    .select("*")
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as any[];
}

/** @deprecated Use useWalletTransactions() hook instead */
export async function getV1WalletLedger(userId: string) {
  console.warn("[DEPRECATED] getV1WalletLedger — use useWalletTransactions() hook");
  const { data: accounts, error: accErr } = await (supabase as any)
    .from("wallet_accounts")
    .select("id")
    .eq("owner_user_id", userId);

  if (accErr) throw accErr;
  const ids = (accounts ?? []).map((a: any) => a.id);
  if (!ids.length) return [];

  const { data, error } = await (supabase as any)
    .from("wallet_ledger_entries")
    .select("*")
    .in("wallet_account_id", ids)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;
  return (data ?? []) as any[];
}
