/**
 * useWallet — LOCS Wallet Manager
 * Manages LOCS balance, transactions, send/request operations, and purchases.
 * 1 LOCS = 1 EUR | Non-refundable, non-withdrawable
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
  total_purchased: number;
  total_spent: number;
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
  original_amount: number | null;
  original_currency: string | null;
  fx_rate_used: number | null;
  fx_source: string | null;
  fx_timestamp: string | null;
  margin_applied: number | null;
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

    // Load or create LOCS wallet
    const { data: existing } = await supabase
      .from("wallet_balances")
      .select("*")
      .eq("user_id", user.id)
      .eq("currency", "LOCS")
      .maybeSingle();

    if (existing) {
      setBalance(existing as unknown as WalletBalance);
    } else {
      const { data: created } = await supabase
        .from("wallet_balances")
        .insert({ user_id: user.id, balance: 0, currency: "LOCS", frozen_balance: 0, total_purchased: 0, total_spent: 0 } as any)
        .select()
        .single();
      if (created) setBalance(created as unknown as WalletBalance);
    }

    // Load transactions
    const { data: txns } = await supabase
      .from("wallet_transactions")
      .select("*")
      .or(`user_id.eq.${user.id},counterpart_user_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(100);

    setTransactions((txns as unknown as WalletTransaction[]) || []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { loadWallet(); }, [loadWallet]);

  // Realtime
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel("wallet-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "wallet_transactions" }, () => { loadWallet(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "wallet_balances" }, () => { loadWallet(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, loadWallet]);

  /** Purchase LOCS credits via Stripe */
  const purchaseLocs = useCallback(async (amount: number, currency: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("purchase-locs", {
        body: { amount, currency },
      });
      if (error) return { success: false, error: error.message };
      if (data?.url) {
        window.open(data.url, "_blank");
        return { success: true, url: data.url, locsPreview: data.locs_preview };
      }
      return { success: false, error: "No checkout URL returned" };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, []);

  /** Send LOCS to another user */
  const sendMoney = useCallback(async (opts: {
    recipientUserId: string;
    amount: number;
    description?: string;
    threadId?: string;
  }) => {
    if (!user?.id || !balance) return { success: false, error: "No wallet" };
    if (balance.balance < opts.amount) return { success: false, error: "Insufficient LOCS balance" };

    // Outgoing transaction
    const { error: txErr } = await supabase.from("wallet_transactions").insert({
      user_id: user.id,
      counterpart_user_id: opts.recipientUserId,
      type: "transfer",
      direction: "out",
      amount: opts.amount,
      currency: "LOCS",
      description: opts.description || "LOCS Transfer",
      status: "completed",
      thread_id: opts.threadId || null,
    } as any);

    if (txErr) return { success: false, error: txErr.message };

    // Incoming for recipient
    await supabase.from("wallet_transactions").insert({
      user_id: opts.recipientUserId,
      counterpart_user_id: user.id,
      type: "transfer",
      direction: "in",
      amount: opts.amount,
      currency: "LOCS",
      description: opts.description || "LOCS received",
      status: "completed",
      thread_id: opts.threadId || null,
    } as any);

    // Update balances
    await supabase
      .from("wallet_balances")
      .update({
        balance: balance.balance - opts.amount,
        total_spent: (balance.total_spent || 0) + opts.amount,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("user_id", user.id)
      .eq("currency", "LOCS");

    // Upsert recipient
    const { data: recipientBal } = await supabase
      .from("wallet_balances")
      .select("balance")
      .eq("user_id", opts.recipientUserId)
      .eq("currency", "LOCS")
      .maybeSingle();

    if (recipientBal) {
      await supabase
        .from("wallet_balances")
        .update({ balance: (recipientBal.balance as number) + opts.amount, updated_at: new Date().toISOString() } as any)
        .eq("user_id", opts.recipientUserId)
        .eq("currency", "LOCS");
    }

    await loadWallet();
    return { success: true };
  }, [user?.id, balance, loadWallet]);

  /** Request LOCS from another user */
  const requestMoney = useCallback(async (opts: {
    fromUserId?: string;
    fromEmail?: string;
    amount: number;
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
      currency: "LOCS",
      description: opts.description || "LOCS request",
      status: "pending",
      thread_id: opts.threadId || null,
      metadata_json: opts.fromEmail ? { recipient_email: opts.fromEmail } : {},
    } as any);

    if (error) return { success: false, error: error.message };
    await loadWallet();
    return { success: true };
  }, [user?.id, loadWallet]);

  /** Get FX conversion preview */
  const getConversionPreview = useCallback(async (amount: number, currency: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("fx-rates", {
        body: {},
        method: "GET",
      });
      // Use query params approach via direct fetch
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/fx-rates?action=convert&from=${currency}&amount=${amount}`,
        {
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      if (!res.ok) throw new Error("FX preview failed");
      return await res.json();
    } catch (err: any) {
      return null;
    }
  }, []);

  return {
    balance,
    transactions,
    loading,
    loadWallet,
    sendMoney,
    requestMoney,
    purchaseLocs,
    getConversionPreview,
  };
}
