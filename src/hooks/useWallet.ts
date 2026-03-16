/**
 * useWallet — LOCS Wallet Manager
 * Manages LOCS balance, transactions, send/request operations, and purchases.
 * 1 LOCS = 1 EUR | Non-refundable, non-withdrawable
 * 
 * PASS58: platformBus emit, scoped realtime, manual refresh.
 * PASS61: Daily transfer limit enforcement, today's spent tracking.
 */
import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { platformBus } from "@/lib/shared/platform-bus";
import { checkDailyLimit, isLargeTransaction } from "@/lib/wallet-limits";

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
  reference_code?: string;
}

export function useWallet() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      platformBus.emit("wallet:balance_updated", { balance: (existing as any).balance }, "wallet", { userId: user.id });
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

  // Realtime — scoped to user
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`wallet-live-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "wallet_transactions" }, (payload) => {
        const row = payload.new as any;
        if (row.user_id === user.id || row.counterpart_user_id === user.id) {
          // Debounced reload
          if (refreshTimer.current) clearTimeout(refreshTimer.current);
          refreshTimer.current = setTimeout(() => loadWallet(), 500);
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "wallet_balances" }, (payload) => {
        const row = payload.new as any;
        if (row.user_id === user.id) {
          setBalance(row as unknown as WalletBalance);
          platformBus.emit("wallet:balance_updated", { balance: row.balance }, "wallet", { userId: user.id });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [user?.id, loadWallet]);

  // Platform bus listener — refresh on wallet events from other modules
  useEffect(() => {
    if (!user?.id) return;
    const unsub = platformBus.on("wallet:transfer_sent", () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => loadWallet(), 600);
    });
    return unsub;
  }, [user?.id, loadWallet]);

  /** Purchase LOCS credits via Stripe */
  const purchaseLocs = useCallback(async (amount: number, currency: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("purchase-locs", {
        body: { amount, currency },
      });
      if (error) return { success: false, error: error.message };
      if (data?.url) {
        platformBus.emit("wallet:locs_purchased", { amount, currency, locsPreview: data.locs_preview }, "wallet", { userId: user?.id });
        window.location.href = data.url;
        return { success: true, url: data.url, locsPreview: data.locs_preview };
      }
      return { success: false, error: "No checkout URL returned" };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [user?.id]);

  /** Today's outgoing transfer total — for daily limit tracking */
  const todaySpent = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return transactions
      .filter((tx) => tx.direction === "out" && tx.type === "transfer" && tx.status === "completed" && new Date(tx.created_at) >= today)
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [transactions]);

  /** Send LOCS to another user via secure server-side RPC */
  const sendMoney = useCallback(async (opts: {
    recipientUserId: string;
    amount: number;
    description?: string;
    threadId?: string;
    qrNonce?: string;
    referenceType?: string;
    referenceId?: string;
    skipLimitCheck?: boolean;
  }) => {
    if (!user?.id) return { success: false, error: "Not authenticated" };

    // Daily transfer limit check (client-side guard)
    if (!opts.skipLimitCheck) {
      const limitCheck = checkDailyLimit(todaySpent, opts.amount);
      if (!limitCheck.allowed) {
        return { success: false, error: `Daily transfer limit reached. Remaining: ${limitCheck.remaining} LOCS` };
      }
    }

    const { data, error } = await supabase.rpc("transfer_locs", {
      _sender_id: user.id,
      _recipient_id: opts.recipientUserId,
      _amount: opts.amount,
      _description: opts.description || "LOCS Transfer",
      _thread_id: opts.threadId || null,
      _qr_nonce: opts.qrNonce || null,
      _reference_type: opts.referenceType || null,
      _reference_id: opts.referenceId || null,
    });

    if (error) return { success: false, error: error.message };
    if (data && typeof data === "object" && "error" in (data as any)) {
      return { success: false, error: (data as any).error };
    }

    await loadWallet();
    platformBus.emit("wallet:transfer_sent", {
      recipientId: opts.recipientUserId,
      amount: opts.amount,
      threadId: opts.threadId,
    }, "wallet", { userId: user.id });
    return { success: true, data };
  }, [user?.id, loadWallet, todaySpent]);

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
    platformBus.emit("wallet:payment_requested", {
      fromUserId: opts.fromUserId,
      amount: opts.amount,
      threadId: opts.threadId,
    }, "wallet", { userId: user.id });
    return { success: true };
  }, [user?.id, loadWallet]);

  /** Get FX conversion preview */
  const getConversionPreview = useCallback(async (amount: number, currency: string) => {
    try {
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
    } catch {
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
    /** Manual refresh — call from UI refresh buttons */
    refresh: loadWallet,
  };
}
