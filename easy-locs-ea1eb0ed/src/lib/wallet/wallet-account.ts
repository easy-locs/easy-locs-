import { db } from "@/services/db";

export async function createWalletAccount(params: {
  workspaceId?: string;
  ownerUserId?: string;
  ownerType?: "user" | "workspace" | "merchant" | "driver";
  currency: string;
  accountType?: "fiat" | "crypto" | "escrow" | "rewards";
  externalRef?: string;
}) {
  const { data, error } = await db("wallet_accounts")
    .insert({
      workspace_id: params.workspaceId ?? null,
      owner_user_id: params.ownerUserId ?? null,
      owner_type: params.ownerType ?? "user",
      currency: params.currency,
      account_type: params.accountType ?? "fiat",
      external_ref: params.externalRef ?? null,
      balance: 0,
      available_balance: 0,
      pending_balance: 0,
      balance_cash: 0,
      balance_bonus: 0,
      balance_locked: 0,
      status: "active",
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
