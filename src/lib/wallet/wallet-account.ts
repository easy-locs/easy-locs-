/**
 * Wallet Account creation — extracted from legacy wallet-core.
 * This is the ONLY remaining function from wallet-core that is still needed.
 */
import { supabase } from "@/integrations/supabase/client";

export async function createWalletAccount(params: {
  workspaceId?: string;
  ownerUserId?: string;
  ownerType?: "user" | "workspace" | "merchant" | "driver";
  currency: string;
  accountType?: "fiat" | "crypto" | "escrow" | "rewards";
  externalRef?: string;
}) {
  const { data, error } = await supabase
    .from("wallet_accounts")
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
      status: "active",
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
