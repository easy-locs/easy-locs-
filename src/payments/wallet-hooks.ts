/**
 * Unified Wallet Hooks — SINGLE AUTHORITATIVE FIAT ENGINE
 * Data model: wallet_accounts + wallet_ledger_entries + unified_wallet_transactions
 * All balance reads, transfers, and history come from HERE.
 */
import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/* ── Balance hook (reads wallet_accounts) ──────────────────── */
export function useWalletBalance() {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [currency, setCurrency] = useState("AED");
  const [loading, setLoading] = useState(true);
  const [accountId, setAccountId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    setLoading(true);

    // Read real balance from wallet_balances_v2 (source of truth for wallet_transfer RPC)
    const { data: balRow } = await (supabase as any)
      .from("wallet_balances_v2")
      .select("balance, currency")
      .eq("user_id", user.id)
      .maybeSingle();

    // Still fetch wallet_accounts for accountId (needed by other flows)
    const { data: accRow } = await supabase
      .from("wallet_accounts")
      .select("id")
      .eq("owner_user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    setBalance(balRow?.balance ?? 0);
    setCurrency(balRow?.currency || "AED");
    setAccountId(accRow?.id ?? null);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    load();
    if (!user?.id) return;
    const channel = supabase
      .channel(`wb-${user.id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "wallet_balances_v2",
        filter: `user_id=eq.${user.id}`,
      }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, load]);

  const optimisticAdjust = useCallback((delta: number) => {
    setBalance((prev) => prev + delta);
  }, []);

  return { balance, currency, loading, accountId, reload: load, optimisticAdjust };
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
    const { data } = await (supabase as any)
      .from("unified_wallet_transactions")
      .select("*")
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(limit);
    setItems((data as UnifiedTx[]) || []);
    setLoading(false);
  }, [user?.id, limit]);

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    load();
    const channel = supabase
      .channel(`wtx-${user.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "unified_wallet_transactions",
      }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
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

/* ── Transfer function (calls atomic RPC) ──────────────────── */
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
}): Promise<{ txId: string }> {
  const payload = {
    p_sender: opts.senderId,
    p_recipient: opts.recipientId,
    p_amount: opts.amount,
    p_currency: opts.currency || "AED",
    p_context_type: opts.contextType || "generic",
    p_context_id: opts.contextId || null,
    p_title: opts.title || null,
    p_subtitle: opts.subtitle || null,
    p_metadata: opts.metadata || {},
  };

  console.log("[walletTransfer] rpc request", payload);
  const { data, error } = await (supabase as any).rpc("wallet_transfer", payload);

  if (error) {
    console.error("[walletTransfer] rpc error", error);
    throw error;
  }

  console.log("[walletTransfer] rpc success", { txId: data });
  return { txId: data as string };
}
