/**
 * Payment Request Hooks — canonical module for create, mark paid, list, fulfill, fetch.
 * Uses requester_id / recipient_id schema on payment_requests table.
 *
 * Also re-exports QR payload helpers from the unified QR engine.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { walletTransfer } from "@/payments/wallet-hooks";

export type PaymentRequestRow = {
  id: string;
  created_at: string;
  requester_id: string;
  recipient_id: string | null;
  amount: number;
  currency: string;
  title: string | null;
  subtitle: string | null;
  context_type: string;
  context_id: string | null;
  status: "pending" | "paid" | "cancelled" | "expired";
  payment_tx_id: string | null;
  metadata: Record<string, any>;
};

/** Create a payment request */
export async function createPaymentRequest(input: {
  requesterId: string;
  recipientId?: string | null;
  amount: number;
  currency?: string;
  title?: string | null;
  subtitle?: string | null;
  contextType?: string;
  contextId?: string | null;
  metadata?: Record<string, any>;
}): Promise<PaymentRequestRow> {
  const { data, error } = await (supabase as any)
    .from("payment_requests")
    .insert({
      requester_id: input.requesterId,
      recipient_id: input.recipientId || null,
      amount: input.amount,
      currency: input.currency || "AED",
      title: input.title || null,
      subtitle: input.subtitle || null,
      context_type: input.contextType || "generic",
      context_id: input.contextId || null,
      status: "pending",
      metadata: input.metadata || {},
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as PaymentRequestRow;
}

/** Mark a payment request as paid */
export async function markPaymentRequestPaid(requestId: string, txId: string) {
  const { error } = await (supabase as any)
    .from("payment_requests")
    .update({ status: "paid", payment_tx_id: txId })
    .eq("id", requestId);
  if (error) throw error;
}

/** Fetch a single payment request by ID */
export async function fetchPaymentRequest(id: string): Promise<PaymentRequestRow | null> {
  const { data } = await (supabase as any)
    .from("payment_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data as PaymentRequestRow | null;
}

/** Fulfill a payment request using wallet_transfer (pay + mark paid) */
export async function fulfillPaymentRequest(
  payerId: string,
  request: PaymentRequestRow
): Promise<{ txId: string }> {
  const { txId } = await walletTransfer({
    senderId: payerId,
    recipientId: request.requester_id,
    amount: request.amount,
    currency: request.currency,
    contextType: "payment_request",
    contextId: request.id,
    title: request.title || "Payment request",
    subtitle: request.subtitle,
  });

  await markPaymentRequestPaid(request.id, txId);
  return { txId };
}

/** Hook: list current user's payment requests (sent + received) */
export function useMyPaymentRequests(limit = 20) {
  const { user } = useAuth();
  const [items, setItems] = useState<PaymentRequestRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await (supabase as any)
      .from("payment_requests")
      .select("*")
      .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(limit);
    setItems((data || []) as PaymentRequestRow[]);
    setLoading(false);
  }, [user?.id, limit]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`pr-${user?.id || "anon"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "payment_requests" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load, user?.id]);

  return { items, loading, reload: load };
}

/* ── QR Payload helpers — re-exported from unified QR engine ── */
export type { UniversalQrPayload as QrPayload } from "@/lib/qr-engine";
export { encodeQr as encodeQrPayload, decodeQr as decodeQrPayload } from "@/lib/qr-engine";
