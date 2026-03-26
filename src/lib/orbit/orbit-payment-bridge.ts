/**
 * Orbit-to-Payment Bridge
 * Enables: chat → request payment → create transaction → confirm → system message → history
 */

import { useChatStore } from "@/stores/chatStore";
import { supabase } from "@/integrations/supabase/client";
import { eventBus } from "@/lib/core/event-bus";
import { toast } from "sonner";

export interface OrbitPaymentRequest {
  conversationId: string;
  senderOrbitId: string;
  recipientUserId: string;
  amount: number;
  currency: string;
  note?: string;
  contextType?: string;
  contextId?: string;
}

/**
 * Request payment from within an Orbit chat conversation.
 * Creates a wallet transaction + sends a system message in chat.
 */
export async function requestPaymentInChat(params: OrbitPaymentRequest) {
  const db = supabase as any;

  // 1. Create wallet transaction (pending)
  const { data: tx, error: txError } = await db
    .from("wallet_transactions")
    .insert({
      sender_id: null, // Will be filled when recipient pays
      recipient_id: params.recipientUserId,
      amount: params.amount,
      currency: params.currency,
      status: "pending",
      context_type: params.contextType || "chat_payment",
      context_id: params.contextId || params.conversationId,
      title: params.note || "Payment request",
      reference_code: `PAY-${Date.now().toString(36).toUpperCase()}`,
    })
    .select("*")
    .single();

  if (txError) {
    console.error("[OrbitPayment] Transaction creation failed:", txError);
    throw txError;
  }

  // 2. Send system message in conversation
  await useChatStore.getState().sendMessage({
    conversationId: params.conversationId,
    senderOrbitId: params.senderOrbitId,
    body: `💰 Payment requested: ${params.amount} ${params.currency}${params.note ? ` — "${params.note}"` : ""}`,
    type: "system",
    metadata: {
      paymentAction: "request",
      transactionId: tx.id,
      amount: params.amount,
      currency: params.currency,
      referenceCode: tx.reference_code,
    },
  });

  // 3. Emit event for real-time sync
  eventBus.emit("orbit.payment.requested", {
    conversationId: params.conversationId,
    transactionId: tx.id,
    amount: params.amount,
    currency: params.currency,
  });

  toast.success(`Payment request sent: ${params.amount} ${params.currency}`);
  return tx;
}

/**
 * Confirm/complete a payment from chat context.
 * Updates the transaction, sends confirmation message.
 */
export async function confirmPaymentInChat(params: {
  transactionId: string;
  conversationId: string;
  senderOrbitId: string;
  payerUserId: string;
}) {
  const db = supabase as any;

  // 1. Update transaction to completed
  const { data: tx, error } = await db
    .from("wallet_transactions")
    .update({
      sender_id: params.payerUserId,
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", params.transactionId)
    .select("*")
    .single();

  if (error) {
    console.error("[OrbitPayment] Confirmation failed:", error);
    throw error;
  }

  // 2. Send confirmation message in chat
  await useChatStore.getState().sendMessage({
    conversationId: params.conversationId,
    senderOrbitId: params.senderOrbitId,
    body: `✅ Payment confirmed: ${tx.amount} ${tx.currency} — Ref: ${tx.reference_code}`,
    type: "system",
    metadata: {
      paymentAction: "confirmed",
      transactionId: tx.id,
      amount: tx.amount,
      currency: tx.currency,
      referenceCode: tx.reference_code,
    },
  });

  // 3. Emit event
  eventBus.emit("orbit.payment.confirmed", {
    conversationId: params.conversationId,
    transactionId: tx.id,
    amount: tx.amount,
    currency: tx.currency,
  });

  toast.success(`Payment confirmed: ${tx.amount} ${tx.currency}`);
  return tx;
}

/**
 * Send money directly from chat.
 * Creates + completes transaction in one step.
 */
export async function sendMoneyInChat(params: {
  conversationId: string;
  senderOrbitId: string;
  senderUserId: string;
  recipientUserId: string;
  amount: number;
  currency: string;
  note?: string;
}) {
  const db = supabase as any;
  const refCode = `SND-${Date.now().toString(36).toUpperCase()}`;

  // 1. Create completed transaction
  const { data: tx, error } = await db
    .from("wallet_transactions")
    .insert({
      sender_id: params.senderUserId,
      recipient_id: params.recipientUserId,
      amount: params.amount,
      currency: params.currency,
      status: "completed",
      context_type: "chat_transfer",
      context_id: params.conversationId,
      title: params.note || "Sent via chat",
      reference_code: refCode,
      completed_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) throw error;

  // 2. Send system message
  await useChatStore.getState().sendMessage({
    conversationId: params.conversationId,
    senderOrbitId: params.senderOrbitId,
    body: `💸 Sent ${params.amount} ${params.currency}${params.note ? ` — "${params.note}"` : ""} (Ref: ${refCode})`,
    type: "system",
    metadata: {
      paymentAction: "sent",
      transactionId: tx.id,
      amount: params.amount,
      currency: params.currency,
      referenceCode: refCode,
    },
  });

  eventBus.emit("orbit.payment.sent", {
    conversationId: params.conversationId,
    transactionId: tx.id,
    amount: params.amount,
    currency: params.currency,
  });

  toast.success(`${params.amount} ${params.currency} sent`);
  return tx;
}
