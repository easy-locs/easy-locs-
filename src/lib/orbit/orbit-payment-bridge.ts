/**
 * Orbit-to-Payment Bridge
 * Enables: chat → request payment → create transaction → confirm → system message → history
 *
 * FIXED: Uses platformBus (not dead eventBus) + sendSystemMessage (not chatStore)
 */

import { supabase } from "@/integrations/supabase/client";
import { platformBus } from "@/lib/shared/platform-bus";
import { sendSystemMessage } from "@/lib/orbit/sendSystemMessage";
import { toast } from "sonner";

export interface OrbitPaymentRequest {
  conversationId: string;
  senderUserId: string;
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
      sender_id: null,
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

  // 2. Send system message in conversation (canonical path)
  await sendSystemMessage({
    conversationId: params.conversationId,
    senderUserId: params.senderUserId,
    senderOrbitId: params.senderOrbitId,
    body: `💰 Payment requested: ${params.amount} ${params.currency}${params.note ? ` — "${params.note}"` : ""}`,
    metadata: {
      paymentAction: "request",
      transactionId: tx.id,
      amount: params.amount,
      currency: params.currency,
      referenceCode: tx.reference_code,
    },
  });

  // 3. Emit event on canonical bus
  platformBus.emit("wallet:payment_requested", {
    conversationId: params.conversationId,
    transactionId: tx.id,
    amount: params.amount,
    currency: params.currency,
  }, "wallet");

  toast.success(`Payment request sent: ${params.amount} ${params.currency}`);
  return tx;
}

/**
 * Confirm/complete a payment from chat context.
 */
export async function confirmPaymentInChat(params: {
  transactionId: string;
  conversationId: string;
  senderUserId: string;
  senderOrbitId: string;
  payerUserId: string;
}) {
  const db = supabase as any;

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

  await sendSystemMessage({
    conversationId: params.conversationId,
    senderUserId: params.senderUserId,
    senderOrbitId: params.senderOrbitId,
    body: `✅ Payment confirmed: ${tx.amount} ${tx.currency} — Ref: ${tx.reference_code}`,
    metadata: {
      paymentAction: "confirmed",
      transactionId: tx.id,
      amount: tx.amount,
      currency: tx.currency,
      referenceCode: tx.reference_code,
    },
  });

  platformBus.emit("wallet:payment_completed", {
    conversationId: params.conversationId,
    transactionId: tx.id,
    amount: tx.amount,
    currency: tx.currency,
  }, "wallet");

  toast.success(`Payment confirmed: ${tx.amount} ${tx.currency}`);
  return tx;
}

/**
 * Send money directly from chat.
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

  await sendSystemMessage({
    conversationId: params.conversationId,
    senderUserId: params.senderUserId,
    senderOrbitId: params.senderOrbitId,
    body: `💸 Sent ${params.amount} ${params.currency}${params.note ? ` — "${params.note}"` : ""} (Ref: ${refCode})`,
    metadata: {
      paymentAction: "sent",
      transactionId: tx.id,
      amount: params.amount,
      currency: params.currency,
      referenceCode: refCode,
    },
  });

  platformBus.emit("wallet:payment_completed", {
    conversationId: params.conversationId,
    transactionId: tx.id,
    amount: params.amount,
    currency: params.currency,
  }, "wallet");

  toast.success(`${params.amount} ${params.currency} sent`);
  return tx;
}
