import { supabase } from "@/integrations/supabase/client";

export async function getV1WalletAccounts(userId: string) {
  const { data, error } = await (supabase as any)
    .from("wallet_accounts")
    .select("*")
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as any[];
}

export async function getV1WalletLedger(userId: string) {
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
