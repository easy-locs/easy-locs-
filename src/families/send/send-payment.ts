/**
 * send.payment — Canonical payment message pipeline for Orbit threads.
 * Covers: payment requests, receipts, and transaction events.
 */
import { insertMessage, updateConversationTimestamp } from "@/repositories/communication.repository";
import { platformBus } from "@/lib/shared/platform-bus";
import type { SendContext } from "./send-context";

export async function sendPaymentRequest(
  ctx: SendContext,
  amount: number,
  currency: string,
  description?: string,
) {
  const body = `💳 Payment request: ${amount} ${currency}${description ? ` — ${description}` : ""}`;
  const data = await insertMessage({
    conversationId: ctx.conversationId,
    senderUserId: ctx.senderUserId,
    senderOrbitId: ctx.senderOrbitId,
    receiverOrbitId: ctx.receiverOrbitId,
    type: "payment",
    body,
    metadata: { event_type: "payment_request", amount, currency, description: description || null, status: "pending" },
  });
  await updateConversationTimestamp(ctx.conversationId, body.slice(0, 120));
  platformBus.emit("orbit:message_sent", { threadId: ctx.threadId, conversationId: ctx.conversationId, type: "payment" }, "orbit", { userId: ctx.senderUserId });
  return data;
}

export async function sendPaymentReceipt(
  ctx: SendContext,
  amount: number,
  currency: string,
  transactionId: string,
) {
  const body = `✅ Payment received: ${amount} ${currency}`;
  const data = await insertMessage({
    conversationId: ctx.conversationId,
    senderUserId: ctx.senderUserId,
    senderOrbitId: ctx.senderOrbitId,
    receiverOrbitId: ctx.receiverOrbitId,
    type: "payment",
    body,
    metadata: { event_type: "payment_receipt", amount, currency, transaction_id: transactionId, status: "completed" },
  });
  await updateConversationTimestamp(ctx.conversationId, body.slice(0, 120));
  platformBus.emit("orbit:payment_received", { conversationId: ctx.conversationId, transactionId, amount, currency }, "orbit", { userId: ctx.senderUserId });
  return data;
}

export async function sendPaymentEvent(
  ctx: SendContext,
  eventType: "authorized" | "captured" | "settled" | "reversed" | "failed",
  amount: number,
  currency: string,
  transactionId: string,
) {
  const labels: Record<string, string> = {
    authorized: "🔐 Payment authorized",
    captured: "💰 Payment captured",
    settled: "✅ Payment settled",
    reversed: "↩️ Payment reversed",
    failed: "❌ Payment failed",
  };
  const body = `${labels[eventType] || "💳 Payment event"}: ${amount} ${currency}`;
  const data = await insertMessage({
    conversationId: ctx.conversationId,
    senderUserId: ctx.senderUserId,
    senderOrbitId: ctx.senderOrbitId,
    receiverOrbitId: ctx.receiverOrbitId,
    type: "system",
    body,
    metadata: { event_type: `payment_${eventType}`, amount, currency, transaction_id: transactionId },
  });
  await updateConversationTimestamp(ctx.conversationId, body.slice(0, 120));
  return data;
}
