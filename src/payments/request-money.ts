/**
 * Payment Request hooks — create, fetch, and fulfill payment requests.
 * Reuses the existing wallet_transfer RPC for fulfillment.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { walletTransfer } from "@/payments/wallet-hooks";

export interface PaymentRequestRecord {
  id: string;
  created_at: string;
  sender_id: string;
  amount: number;
  currency: string;
  title: string | null;
  subtitle: string | null;
  context_type: string;
  context_id: string | null;
  thread_id: string | null;
  status: string;
  paid_by: string | null;
  paid_at: string | null;
  transaction_id: string | null;
}

/** Create a payment request */
export async function createPaymentRequest(opts: {
  senderId: string;
  amount: number;
  currency?: string;
  title?: string;
  subtitle?: string;
  contextType?: string;
  contextId?: string | null;
  threadId?: string | null;
}): Promise<{ id: string }> {
  const { data, error } = await (supabase as any)
    .from("payment_requests")
    .insert({
      sender_id: opts.senderId,
      amount: opts.amount,
      currency: opts.currency || "AED",
      title: opts.title || null,
      subtitle: opts.subtitle || null,
      context_type: opts.contextType || "generic",
      context_id: opts.contextId || null,
      thread_id: opts.threadId || null,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) throw error;
  return { id: data.id };
}

/** Fulfill a payment request using wallet_transfer */
export async function fulfillPaymentRequest(
  payerId: string,
  request: PaymentRequestRecord
): Promise<{ txId: string }> {
  const { txId } = await walletTransfer({
    senderId: payerId,
    recipientId: request.sender_id,
    amount: request.amount,
    currency: request.currency,
    contextType: "payment_request",
    contextId: request.id,
    title: request.title || "Payment request",
    subtitle: request.subtitle,
  });

  // Mark request as paid
  await (supabase as any)
    .from("payment_requests")
    .update({
      status: "paid",
      paid_by: payerId,
      paid_at: new Date().toISOString(),
      transaction_id: txId,
    })
    .eq("id", request.id);

  return { txId };
}

/** Fetch a single payment request by ID */
export async function fetchPaymentRequest(id: string): Promise<PaymentRequestRecord | null> {
  const { data } = await (supabase as any)
    .from("payment_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data as PaymentRequestRecord | null;
}

/** Hook: user's payment requests (sent + received) */
export function usePaymentRequests() {
  const { user } = useAuth();
  const [items, setItems] = useState<PaymentRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from("payment_requests")
      .select("*")
      .or(`sender_id.eq.${user.id},paid_by.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(50);
    setItems((data as PaymentRequestRecord[]) || []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    load();

    const channel = supabase
      .channel(`pr-${user.id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "payment_requests",
      }, () => load())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, load]);

  return { items, loading, reload: load };
}
