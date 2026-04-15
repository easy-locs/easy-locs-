/**
 * Unified Wallet Hooks — SINGLE AUTHORITATIVE FIAT ENGINE
 * Data model: wallet_accounts + wallet_ledger_entries + unified_wallet_transactions
 * All balance reads, transfers, and history come from HERE.
 */
import { useEffect, useState, useCallback, useMemo } from "react";
import { domainDb } from "@/services/db";
import { typedQueries } from "@/lib/db/typed-queries";
import { createRealtimeChannel, removeRealtimeChannel } from "@/lib/realtime";
import { registerSubscription } from "@/lib/realtime/subscription-registry";
import { useAuth } from "@/contexts/AuthContext";
import { secureWalletCache, readWalletCache } from "@/lib/wallet/wallet-secure-cache";
import { getWalletDefaultCurrency } from "@/lib/wallet/wallet-config";

/* ── Balance hook (reads wallet_accounts) ──────────────────── */
export function useWalletBalance() {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [currency, setCurrency] = useState(getWalletDefaultCurrency());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    setLoading(true);
    setError(null);

    try {
      const cached = await readWalletCache<{ balance: number; currency: string; accountId: string | null }>(`bal_${user.id}`);
      if (cached) {
        setBalance(cached.balance);
        setCurrency(cached.currency);
        setAccountId(cached.accountId);
        setLoading(false);
      }

      const { data: balRow } = await typedQueries.walletBalances.selectByUser(user.id);

      const { data: accRow } = await domainDb.wallet
        .from("wallet_accounts")
        .select("id, available_balance, currency")
        .eq("owner_user_id", user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      const accTyped = accRow as { id?: string; available_balance?: number; currency?: string } | null;
      const freshBalance = balRow?.balance ?? accTyped?.available_balance ?? 0;
      const freshCurrency = balRow?.currency || accTyped?.currency || getWalletDefaultCurrency();
      const freshAccountId = accTyped?.id ?? null;

      setBalance(freshBalance);
      setCurrency(freshCurrency);
      setAccountId(freshAccountId);
      setLoading(false);

      secureWalletCache(`bal_${user.id}`, { balance: freshBalance, currency: freshCurrency, accountId: freshAccountId }).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load wallet");
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
    if (!user?.id) return;
    const unsubRegistry = registerSubscription(`wallet.accounts:${user.id}`, () => {
      const channel = createRealtimeChannel(`wb-${user.id}`)
        .on("postgres_changes", {
          event: "*",
          schema: "wallet",
          table: "wallet_accounts",
          filter: `owner_user_id=eq.${user.id}`,
        }, () => load())
        .subscribe((status: string) => {
          if (status === "CHANNEL_ERROR") {
            console.error(`[useWalletBalance] Realtime channel error for user ${user.id}`);
          } else if (status === "TIMED_OUT") {
            console.warn(`[useWalletBalance] Realtime channel timed out for user ${user.id}`);
          }
        });
      return () => removeRealtimeChannel(channel);
    });
    return () => { unsubRegistry(); };
  }, [user?.id, load]);

  const optimisticAdjust = useCallback((delta: number) => {
    setBalance((prev) => prev + delta);
  }, []);

  return { balance, currency, loading, error, accountId, reload: load, optimisticAdjust };
}

/* ── Transactions hook (reads unified_wallet_transactions) ── */
export interface UnifiedTx {
  id: string;
  created_at: string;
  sender_id: string | null;
  recipient_id: string | null;
  amount: number;
  currency: string;
  context_type: string;
  context_id: string | null;
  title: string | null;
  subtitle: string | null;
  status: string;
  metadata: Record<string, any>;
  reference_code?: string | null;
}

export function useWalletTransactions(limit = 50) {
  const { user } = useAuth();
  const [items, setItems] = useState<UnifiedTx[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data } = await typedQueries.walletTransactions.selectForUser(user.id, limit);
    setItems((data as UnifiedTx[]) || []);
    setLoading(false);
  }, [user?.id, limit]);

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    load();
    const unsubRegistry = registerSubscription(`wallet.unified_tx:${user.id}`, () => {
      const channel = createRealtimeChannel(`wtx-${user.id}`)
        .on("postgres_changes", {
          event: "*",
          schema: "public",
          table: "unified_wallet_transactions",
          filter: `sender_id=eq.${user.id}`,
        }, () => load())
        .on("postgres_changes", {
          event: "*",
          schema: "public",
          table: "unified_wallet_transactions",
          filter: `recipient_id=eq.${user.id}`,
        }, () => load())
        .subscribe();
      return () => removeRealtimeChannel(channel);
    });
    return () => { unsubRegistry(); };
  }, [user?.id, load]);

  /** Today's outgoing transfer total */
  const todaySpent = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return items
      .filter((tx) => tx.sender_id === user?.id && tx.status === "completed" && new Date(tx.created_at) >= today)
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [items, user?.id]);

  return { items, loading, reload: load, todaySpent };
}

/* ── Transfer function — delegates to secure Edge Function path ── */
export async function walletTransfer(opts: {
  senderId: string;
  recipientId: string;
  amount: number;
  currency?: string;
  contextType?: string;
  contextId?: string | null;
  title?: string | null;
  subtitle?: string | null;
  metadata?: Record<string, any>;
  pin?: string;
}): Promise<{ txId: string }> {
  const { executeWalletTransfer } = await import("@/lib/wallet/wallet-transfer");

  const result = await executeWalletTransfer({
    senderUserId: opts.senderId,
    receiverUserId: opts.recipientId,
    amount: opts.amount,
    currency: opts.currency || getWalletDefaultCurrency(),
    description: opts.title || "Transfer",
    transactionType: opts.contextType || "generic",
    reference: opts.contextId ?? undefined,
    pin: opts.pin,
  });

  if (!result.success) {
    throw new Error(result.error || "Transfer failed");
  }

  return { txId: result.transactionId! };
}
