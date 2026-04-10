/**
 * ensureWalletAccount — Guarantees a real wallet_accounts row exists for the current user.
 * Called during app boot to ensure wallet-hooks.ts (authoritative engine) always has a row.
 */
import { supabase } from "@/integrations/supabase/client";
import { getWalletDefaultCurrency } from "./wallet-config";

export async function ensureWalletAccount(userId: string, currency = getWalletDefaultCurrency()): Promise<void> {
  // Check if active wallet exists
  const { data: existing } = await supabase
    .from("wallet_accounts")
    .select("id")
    .eq("owner_user_id", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (existing) return; // Already has a wallet

  // Create wallet account
  const { error } = await supabase
    .from("wallet_accounts")
    .insert({
      owner_user_id: userId,
      currency,
      balance: 0,
      status: "active",
    } as any);

  if (error) {
    // Ignore unique constraint violations (race condition)
    if (error.code === "23505") return;
    console.error("[ensureWalletAccount] failed to create wallet:", error.message);
  }
}
