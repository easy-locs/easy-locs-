/**
 * usePaymentDialogs — Extracted from HudChatPanel.
 * MIGRATED: All DB ops via repositories.
 */
import { useState, useCallback } from "react";
import { invokeConciergePayment } from "@/repositories/ai.repository";
import { insertChatMessageV2, updateConversationTimestamp, insertWalletTransaction } from "@/repositories/rental.repository";
import { toast } from "sonner";
import type { ConversationThread } from "@/components/communication-hub/types";

interface UsePaymentDialogsParams {
  thread: ConversationThread | null;
  orgId: string | null | undefined;
  locale: string;
  resolveAuthUserId: () => Promise<string | null>;
}

export function usePaymentDialogs({ thread, orgId, locale, resolveAuthUserId }: UsePaymentDialogsParams) {
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDescription, setPaymentDescription] = useState("");
  const [sendingPaymentLink, setSendingPaymentLink] = useState(false);

  const sendPaymentLink = useCallback(async () => {
    if (!thread) return;
    const authUserId = await resolveAuthUserId();
    if (!authUserId) return;
    setSendingPaymentLink(true);

    try {
      const amount = parseFloat(paymentAmount);
      if (Number.isNaN(amount) || amount <= 0) throw new Error("Invalid amount");

      let paymentUrl = "";
      try {
        const data = await invokeConciergePayment({
          order_id: thread.bookingId || thread.id,
          service_id: thread.contextId,
          amount,
          currency: thread.currency || "eur",
          guest_email: thread.email || "",
          guest_name: thread.name || "",
          service_title: thread.serviceTitle || paymentDescription || "",
          origin: window.location.origin,
        });
        paymentUrl = data?.url || "";
      } catch (e) {
        console.error("Payment link failed:", e);
      }

      const msgContent = paymentUrl
        ? `💳 Payment request: ${amount.toFixed(2)} ${(thread.currency || "EUR").toUpperCase()}\n${paymentDescription ? `📝 ${paymentDescription}\n` : ""}🔗 ${paymentUrl}`
        : `💳 Payment request: ${amount.toFixed(2)} ${(thread.currency || "EUR").toUpperCase()}\n${paymentDescription ? `📝 ${paymentDescription}\n` : ""}Please contact us for payment details.`;

      if (thread.isV2 && thread.v2ConversationId) {
        await insertChatMessageV2({
          conversation_id: thread.v2ConversationId,
          sender_user_id: authUserId,
          sender_orbit_id: `orbit_${authUserId.slice(0, 12)}`,
          receiver_orbit_id: thread.peerOrbitId ?? null,
          type: "payment",
          body: msgContent,
          metadata: { amount, currency: (thread.currency || "EUR").toUpperCase(), url: paymentUrl || null },
        });
        await updateConversationTimestamp(thread.v2ConversationId);
      } else {
        const conversationId = thread.v2ConversationId || thread.contextId;
        if (conversationId) {
          await insertChatMessageV2({
            conversation_id: conversationId,
            sender_user_id: authUserId,
            sender_orbit_id: `orbit_${authUserId.slice(0, 12)}`,
            type: "text",
            body: msgContent,
            metadata: { category: "payment", booking_id: thread.bookingId || null },
          });
        }
      }

      try {
        await insertWalletTransaction({
          sender_id: null,
          recipient_id: authUserId,
          amount,
          currency: (thread.currency || "EUR").toUpperCase(),
          title: paymentDescription || `Payment request to ${thread.name}`,
          status: "pending",
          context_type: thread.contextType || "payment_request",
          context_id: thread.bookingId || thread.contextId || null,
        });
      } catch {}

      toast.success("Payment link sent");
      setPaymentAmount("");
      setPaymentDescription("");
    } catch (err: any) {
      toast.error("Payment failed: " + (err.message || "Unknown error"));
    } finally {
      setSendingPaymentLink(false);
    }
  }, [thread, paymentAmount, paymentDescription, resolveAuthUserId]);

  return {
    paymentAmount, setPaymentAmount,
    paymentDescription, setPaymentDescription,
    sendingPaymentLink, sendPaymentLink,
  };
}
