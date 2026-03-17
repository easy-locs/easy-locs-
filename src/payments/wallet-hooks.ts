/**
 * Unified Wallet Hooks — useWalletBalance, useWalletTransactions, walletTransfer
 * Uses wallet_balances_v2 + unified_wallet_transactions + wallet_transfer RPC.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/* ── Balance hook ──────────────────────────────────────────── */
export function useWalletBalance() {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [currency, setCurrency] = useState("AED");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    let mounted = true;

    async function load() {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("wallet_balances_v2")
        .select("balance, currency")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (mounted) {
        setBalance(data?.balance ?? 0);
        setCurrency(data?.currency || "AED");
        setLoading(false);
      }
    }

    load();

    const channel = supabase
      .channel(`wb-${user.id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "wallet_balances_v2",
        filter: `user_id=eq.${user.id}`,
      }, () => load())
      .subscribe();

    return () => { mounted = false; supabase.removeChannel(channel); };
  }, [user?.id]);

  return { balance, currency, loading };
}

/* ── Transactions hook ─────────────────────────────────────── */
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

  return { items, loading, reload: load };
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
  const { data, error } = await (supabase as any).rpc("wallet_transfer", {
    p_sender: opts.senderId,
    p_recipient: opts.recipientId,
    p_amount: opts.amount,
    p_currency: opts.currency || "AED",
    p_context_type: opts.contextType || "generic",
    p_context_id: opts.contextId || null,
    p_title: opts.title || null,
    p_subtitle: opts.subtitle || null,
    p_metadata: opts.metadata || {},
  });

  if (error) throw error;
  return { txId: data as string };
}
