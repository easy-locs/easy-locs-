/**
 * wallet-repository — Canonical data access for wallet domain.
 * No UI component should import db directly for wallet operations.
 *
 * This repository adapts between legacy column names (wallet_balances_v2)
 * and the canonical wallet.wallet_accounts schema. All wallet DB access
 * should go through this file.
 */
import { domainDb } from "@/services/db";

export interface WalletBalanceBreakdown {
  walletId: string;
  available: number;
  escrow: number;
  pending: number;
  currency: string;
}

export async function fetchWalletBalanceByWalletId(walletId: string): Promise<WalletBalanceBreakdown | null> {
  const { data, error } = await domainDb.wallet
    .from("wallet_accounts")
    .select("id, available_balance, pending_balance, currency")
    .eq("id", walletId)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    walletId: data.id,
    available: data.available_balance ?? 0,
    escrow: 0,
    pending: data.pending_balance ?? 0,
    currency: data.currency ?? "EUR",
  };
}

export async function fetchWalletBalanceByUserId(userId: string, currency?: string): Promise<WalletBalanceBreakdown | null> {
  let query = domainDb.wallet
    .from("wallet_accounts")
    .select("id, available_balance, pending_balance, currency")
    .eq("owner_user_id", userId)
    .eq("status", "active");
  if (currency) {
    query = query.eq("currency", currency);
  }
  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    walletId: data.id,
    available: data.available_balance ?? 0,
    escrow: 0,
    pending: data.pending_balance ?? 0,
    currency: data.currency ?? "EUR",
  };
}

export async function upsertWalletBalance(
  userId: string,
  currency: string,
  availableBalance: number,
): Promise<void> {
  const { error } = await domainDb.wallet
    .from("wallet_accounts")
    .upsert({
      owner_user_id: userId,
      currency,
      available_balance: availableBalance,
    }, { onConflict: "owner_user_id,currency" });
  if (error) throw error;
}

export async function fetchCounterpartyNames(userIds: string[]): Promise<Record<string, string>> {
  if (userIds.length === 0) return {};
  const { data } = await domainDb.identity
    .from("profiles")
    .select("id, name, first_name, last_name, username")
    .in("id", userIds);
  const map: Record<string, string> = {};
  (data ?? []).forEach((p: any) => {
    map[p.id] = p.name || [p.first_name, p.last_name].filter(Boolean).join(" ") || p.username || "User";
  });
  return map;
}
