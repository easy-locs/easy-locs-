import { supabase } from "@/integrations/supabase/client";
import { db } from "@/services/db";

export interface LinkedBankAccount {
  id: string;
  institutionName: string;
  accountName: string;
  accountMask: string;
  accountType: "checking" | "savings";
  balance: number;
  currency: string;
  linkedAt: string;
  plaidAccountId: string;
  itemId: string;
}

export interface PlaidLinkTokenResponse {
  linkToken: string;
  expiration: string;
}

export interface PlaidExchangeResult {
  ok: boolean;
  accounts?: LinkedBankAccount[];
  error?: string;
}

export interface AchTransferResult {
  ok: boolean;
  transferId?: string;
  amount?: number;
  error?: string;
}

export interface IncomeVerificationResult {
  verified: boolean;
  annualIncome?: number;
  currency?: string;
  confidence: "high" | "medium" | "low";
}

async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data?.session?.user?.id ?? null;
}

export async function createLinkToken(): Promise<PlaidLinkTokenResponse> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Not authenticated");

  const { data, error } = await db.functions.invoke("plaid-link-token", {
    body: { action: "create_link_token" },
  });
  if (error) throw new Error("Failed to create Plaid link token");
  return {
    linkToken: data.linkToken || data.link_token,
    expiration: data.expiration || new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  };
}

export async function exchangePublicToken(
  publicToken: string,
  institutionName: string,
): Promise<PlaidExchangeResult> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const { data: exchangeData, error: exchangeError } = await db.functions.invoke("plaid-link-token", {
    body: {
      action: "exchange_public_token",
      publicToken,
    },
  });
  if (exchangeError || !(exchangeData?.itemId || exchangeData?.item_id)) {
    return { ok: false, error: "Failed to exchange token with Plaid" };
  }

  const itemId = exchangeData.itemId || exchangeData.item_id;

  const { data: accountsData, error: accountsError } = await db.functions.invoke("plaid-link-token", {
    body: {
      action: "get_accounts",
      itemId,
    },
  });

  if (accountsError || !accountsData?.accounts) {
    return { ok: false, error: "Token exchanged but failed to fetch account details. Please try again." };
  }

  const accounts: LinkedBankAccount[] = (accountsData.accounts || []).map((a: Record<string, unknown>) => {
    const balances = (a.balances ?? {}) as Record<string, unknown>;
    const accountId = (a.id ?? a.account_id) as string;
    return {
      id: accountId,
      institutionName,
      accountName: (a.name as string) || (a.officialName as string) || "Account",
      accountMask: (a.mask as string) || "****",
      accountType: a.subtype === "savings" ? "savings" as const : "checking" as const,
      balance: (balances.current ?? balances.available ?? 0) as number,
      currency: (balances.currency ?? balances.iso_currency_code ?? "USD") as string,
      linkedAt: new Date().toISOString(),
      plaidAccountId: accountId,
      itemId,
    };
  });

  return { ok: true, accounts };
}

export interface LinkedAccountsResult {
  accounts: LinkedBankAccount[];
  errors: Array<{ itemId: string; error: string }>;
}

export async function getLinkedAccounts(): Promise<LinkedAccountsResult> {
  const userId = await getCurrentUserId();
  if (!userId) return { accounts: [], errors: [{ itemId: "auth", error: "Not authenticated" }] };

  const { data, error } = await db.from("plaid_items")
    .select("item_id, created_at")
    .eq("user_id", userId);

  if (error) return { accounts: [], errors: [{ itemId: "db", error: error.message }] };
  if (!data?.length) return { accounts: [], errors: [] };

  const allAccounts: LinkedBankAccount[] = [];
  const errors: Array<{ itemId: string; error: string }> = [];

  for (const item of data) {
    try {
      const { data: accountsData, error: accountsError } = await db.functions.invoke("plaid-link-token", {
        body: { action: "get_accounts", itemId: item.item_id },
      });
      if (accountsError || !accountsData?.accounts) {
        const errMsg = accountsError?.message ?? "No accounts returned";
        console.warn(`[plaid] Failed to fetch accounts for item ${item.item_id}:`, errMsg);
        errors.push({ itemId: item.item_id, error: errMsg });
        continue;
      }

      const accounts: LinkedBankAccount[] = accountsData.accounts.map((a: Record<string, unknown>) => {
        const balances = (a.balances ?? {}) as Record<string, unknown>;
        const accountId = (a.id ?? a.account_id) as string;
        return {
          id: accountId,
          institutionName: "Bank",
          accountName: (a.name as string) || (a.officialName as string) || "Account",
          accountMask: (a.mask as string) || "****",
          accountType: a.subtype === "savings" ? "savings" as const : "checking" as const,
          balance: (balances.current ?? balances.available ?? 0) as number,
          currency: (balances.currency ?? balances.iso_currency_code ?? "USD") as string,
          linkedAt: item.created_at,
          plaidAccountId: accountId,
          itemId: item.item_id,
        };
      });
      allAccounts.push(...accounts);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "unknown";
      console.warn(`[plaid] Error fetching accounts for item ${item.item_id}:`, errMsg);
      errors.push({ itemId: item.item_id, error: errMsg });
      continue;
    }
  }

  return { accounts: allAccounts, errors };
}

export async function unlinkAccount(accountId: string): Promise<{ ok: boolean; error?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const { error } = await db.from("plaid_items")
    .delete()
    .eq("user_id", userId)
    .eq("item_id", accountId);

  if (error) return { ok: false, error: "Failed to unlink account" };
  return { ok: true };
}

export async function initiateAchTransfer(
  accountId: string,
  amount: number,
  currency = "USD",
  itemId?: string,
): Promise<AchTransferResult> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };
  if (amount <= 0) return { ok: false, error: "Invalid amount" };

  if (!itemId) {
    const { data: items } = await db.from("plaid_items")
      .select("item_id")
      .eq("user_id", userId)
      .limit(1)
      .single();
    if (!items) return { ok: false, error: "No linked bank account found" };
    itemId = items.item_id;
  }

  const { data, error } = await db.functions.invoke("plaid-link-token", {
    body: {
      action: "create_ach_transfer",
      itemId,
      accountId,
      amount,
      description: `Easy-Locs wallet top-up (${currency})`,
    },
  });
  if (error) {
    return { ok: false, error: "ACH transfer failed. Please try again." };
  }

  return {
    ok: true,
    transferId: data.transferId || data.transfer_id,
    amount: data.amount ?? amount,
  };
}

export async function verifyIncome(): Promise<IncomeVerificationResult> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Not authenticated");

  const { data, error } = await db.functions.invoke("plaid-link-token", {
    body: { action: "verify_income" },
  });
  if (error) {
    throw new Error("Income verification failed. Please ensure your bank account is linked and try again.");
  }
  return {
    verified: true,
    annualIncome: data.annual_income,
    currency: data.currency || "USD",
    confidence: data.confidence || "medium",
  };
}

export async function refreshAccountBalances(): Promise<LinkedAccountsResult> {
  return getLinkedAccounts();
}
