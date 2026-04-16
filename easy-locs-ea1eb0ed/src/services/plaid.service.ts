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

const linkedAccounts = new Map<string, LinkedBankAccount[]>();

async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data?.session?.user?.id ?? null;
}

export async function createLinkToken(): Promise<PlaidLinkTokenResponse> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Not authenticated");

  const { data, error } = await db.functions.invoke("plaid-link-token", {
    body: { action: "create_link_token", user_id: userId },
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

  const { data, error } = await db.functions.invoke("plaid-link-token", {
    body: {
      action: "exchange_public_token",
      publicToken,
      user_id: userId,
      institution_name: institutionName,
    },
  });
  if (error) {
    return { ok: false, error: "Failed to exchange token with Plaid" };
  }

  const accounts: LinkedBankAccount[] = (data.accounts || []).map((a: Record<string, unknown>) => ({
    id: `bank_${crypto.randomUUID()}`,
    institutionName,
    accountName: (a.name as string) || "Account",
    accountMask: (a.mask as string) || "****",
    accountType: a.subtype === "savings" ? "savings" : "checking",
    balance: (a.balances as Record<string, unknown>)?.current ?? 0,
    currency: (a.balances as Record<string, unknown>)?.iso_currency_code ?? "USD",
    linkedAt: new Date().toISOString(),
    plaidAccountId: a.account_id as string,
  }));

  const existing = linkedAccounts.get(userId) || [];
  linkedAccounts.set(userId, [...existing, ...accounts]);

  return { ok: true, accounts };
}

export async function getLinkedAccounts(): Promise<LinkedBankAccount[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  return linkedAccounts.get(userId) || [];
}

export async function unlinkAccount(accountId: string): Promise<{ ok: boolean; error?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const accounts = linkedAccounts.get(userId) || [];
  const filtered = accounts.filter((a) => a.id !== accountId);
  linkedAccounts.set(userId, filtered);
  return { ok: true };
}

export async function initiateAchTransfer(
  accountId: string,
  amount: number,
  currency = "USD",
): Promise<AchTransferResult> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const accounts = linkedAccounts.get(userId) || [];
  const account = accounts.find((a) => a.id === accountId);
  if (!account) return { ok: false, error: "Account not found" };
  if (amount <= 0) return { ok: false, error: "Invalid amount" };
  if (amount > account.balance) return { ok: false, error: "Insufficient bank balance" };

  const { data, error } = await db.functions.invoke("plaid-link-token", {
    body: {
      action: "create_ach_transfer",
      user_id: userId,
      accountId: account.plaidAccountId,
      amount,
      currency,
    },
  });
  if (error) {
    return { ok: false, error: "ACH transfer failed. Please try again." };
  }

  account.balance -= amount;
  return { ok: true, transferId: data.transferId || data.transfer_id, amount };
}

export async function verifyIncome(): Promise<IncomeVerificationResult> {
  const userId = await getCurrentUserId();
  if (!userId) return { verified: false, confidence: "low" };

  const { data, error } = await db.functions.invoke("plaid-link-token", {
    body: { action: "verify_income", user_id: userId },
  });
  if (error) {
    return { verified: false, confidence: "low" };
  }
  return {
    verified: true,
    annualIncome: data.annual_income,
    currency: data.currency || "USD",
    confidence: data.confidence || "medium",
  };
}

export async function refreshAccountBalances(): Promise<LinkedBankAccount[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  return linkedAccounts.get(userId) || [];
}
