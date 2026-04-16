import { callEdgeFunction } from "@/lib/edge-client";

export interface PlaidAccount {
  id: string;
  name: string;
  officialName: string | null;
  type: string;
  subtype: string;
  mask: string;
  balances: {
    available: number | null;
    current: number | null;
    currency: string;
  };
}

export interface PlaidLinkResult {
  publicToken: string;
  accounts: PlaidAccount[];
  institution: { name: string; id: string } | null;
}

export async function createLinkToken(language?: string): Promise<string> {
  const data = await callEdgeFunction<{ linkToken: string }>("plaid-link-token", {
    action: "create_link_token",
    language: language ?? "en",
  });
  return data.linkToken;
}

export async function exchangePublicToken(publicToken: string): Promise<{ itemId: string }> {
  const data = await callEdgeFunction<{ success: boolean; itemId: string }>("plaid-link-token", {
    action: "exchange_public_token",
    publicToken,
  });
  return { itemId: data.itemId };
}

export async function getLinkedAccounts(itemId: string): Promise<PlaidAccount[]> {
  const data = await callEdgeFunction<{ accounts: PlaidAccount[] }>("plaid-link-token", {
    action: "get_accounts",
    itemId,
  });
  return data.accounts ?? [];
}

export async function initiateACHTransfer(params: {
  itemId: string;
  accountId: string;
  amount: number;
  description?: string;
  legalName?: string;
}): Promise<{ transferId: string; status: string; amount: string }> {
  return callEdgeFunction("plaid-link-token", {
    action: "create_ach_transfer",
    ...params,
  });
}

export function isPlaidAvailable(): boolean {
  return !!import.meta.env.VITE_SUPABASE_URL;
}
