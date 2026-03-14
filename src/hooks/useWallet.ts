/**
 * useWallet — Manages wallet balance, transactions, send/request operations.
 * Foundation layer for Orbit's financial infrastructure.
 */
import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface WalletBalance {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  frozen_balance: number;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  user_id: string;
  counterpart_user_id: string | null;
  type: string;
  direction: string;
  amount: number;
  currency: string;
  description: string | null;
  status: string;
  reference_type: string | null;
  reference_id: string | null;
  thread_id: string | null;
  metadata_json: any;
  created_at: string;
}

export function useWallet() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const loadWallet = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    setLoading(true);

    // Load or create wallet balance
    const { data: existing } = await supabase
      .from("wallet_balances")
      .select("*")
      .eq("user_id", user.id)
      .eq("currency", "EUR")
      .maybeSingle();

    if (existing) {
      setBalance(existing as WalletBalance);
    } else {
      // Auto-create wallet on first access
      const { data: created } = await supabase
        .from("wallet_balances")
        .insert({ user_id: user.id, balance: 0, currency: "EUR", frozen_balance: 0 } as any)
        .select()
        .single();
      if (created) setBalance(created as WalletBalance);
    }

    // Load transactions
    const { data: txns } = await supabase
      .from("wallet_transactions")
      .select("*")
      .or(`user_id.eq.${user.id},counterpart_user_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(100);

    setTransactions((txns as WalletTransaction[]) || []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { loadWallet(); }, [loadWallet]);

  // Realtime subscription for live updates
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel("wallet-live")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "wallet_transactions",
      }, () => { loadWallet(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, loadWallet]);

  const sendMoney = useCallback(async (opts: {
    recipientUserId: string;
    amount: number;
    currency: string;
    description?: string;
    threadId?: string;
  }) => {
    if (!user?.id || !balance) return { success: false, error: "No wallet" };
    if (balance.balance < opts.amount) return { success: false, error: "Insufficient balance" };

    // Record outgoing transaction
    const { error: txErr } = await supabase.from("wallet_transactions").insert({
      user_id: user.id,
      counterpart_user_id: opts.recipientUserId,
      type: "transfer",
      direction: "out",
      amount: opts.amount,
      currency: opts.currency,
      description: opts.description || "Transfer",
      status: "completed",
      thread_id: opts.threadId || null,
    } as any);

    if (txErr) return { success: false, error: txErr.message };

    // Record incoming transaction for recipient
    await supabase.from("wallet_transactions").insert({
      user_id: opts.recipientUserId,
      counterpart_user_id: user.id,
      type: "transfer",
      direction: "in",
      amount: opts.amount,
      currency: opts.currency,
      description: opts.description || "Transfer received",
      status: "completed",
      thread_id: opts.threadId || null,
    } as any);

    // Update balances
    await supabase
      .from("wallet_balances")
      .update({ balance: balance.balance - opts.amount, updated_at: new Date().toISOString() } as any)
      .eq("user_id", user.id)
      .eq("currency", opts.currency);

    // Upsert recipient balance
    const { data: recipientBal } = await supabase
      .from("wallet_balances")
      .select("balance")
      .eq("user_id", opts.recipientUserId)
      .eq("currency", opts.currency)
      .maybeSingle();

    if (recipientBal) {
      await supabase
        .from("wallet_balances")
        .update({ balance: (recipientBal.balance as number) + opts.amount, updated_at: new Date().toISOString() } as any)
        .eq("user_id", opts.recipientUserId)
        .eq("currency", opts.currency);
    }

    await loadWallet();
    return { success: true };
  }, [user?.id, balance, loadWallet]);

  const requestMoney = useCallback(async (opts: {
    fromUserId?: string;
    fromEmail?: string;
    amount: number;
    currency: string;
    description?: string;
    threadId?: string;
  }) => {
    if (!user?.id) return { success: false, error: "Not authenticated" };

    const { error } = await supabase.from("wallet_transactions").insert({
      user_id: user.id,
      counterpart_user_id: opts.fromUserId || null,
      type: "request",
      direction: "in",
      amount: opts.amount,
      currency: opts.currency,
      description: opts.description || "Payment request",
      status: "pending",
      thread_id: opts.threadId || null,
      metadata_json: opts.fromEmail ? { recipient_email: opts.fromEmail } : {},
    } as any);

    if (error) return { success: false, error: error.message };
    await loadWallet();
    return { success: true };
  }, [user?.id, loadWallet]);

  return {
    balance,
    transactions,
    loading,
    loadWallet,
    sendMoney,
    requestMoney,
  };
}
