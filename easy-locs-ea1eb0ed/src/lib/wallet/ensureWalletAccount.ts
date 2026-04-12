import { db } from "@/services/db";
import { getWalletDefaultCurrency } from "./wallet-config";

export async function ensureWalletAccount(userId: string, currency = getWalletDefaultCurrency()): Promise<void> {
  const { data: existing } = await db("wallet_accounts")
    .select("id")
    .eq("owner_user_id", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (existing) return;

  const { error } = await db("wallet_accounts")
    .insert({
      owner_user_id: userId,
      currency,
      balance: 0,
      available_balance: 0,
      pending_balance: 0,
      balance_cash: 0,
      balance_bonus: 0,
      balance_locked: 0,
      status: "active",
    } as any);

  if (error) {
    if (error.code === "23505") return;
    console.error("[ensureWalletAccount] failed to create wallet:", error.message);
  }
}
