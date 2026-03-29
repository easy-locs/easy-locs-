/**
 * usePaymentDialogs — Extracted from HudChatPanel.
 * Manages payment link creation, request money, and payment message sending.
 */
import { useState, useCallback } from "react";
import { invokeConciergePayment } from "@/repositories/ai.repository";
import { toast } from "sonner";
import type { ConversationThread } from "@/components/communication-hub/types";

interface UsePaymentDialogsParams {
  thread: ConversationThread | null;
  orgId: string | null | undefined;
  locale: string;
  resolveAuthUserId: () => Promise<string | null>;
}

export function usePaymentDialogs({ thread, orgId, locale, resolveAuthUserId }: UsePaymentDialogsParams) {
  const [paymentLinkDialog, setPaymentLinkDialog] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDescription, setPaymentDescription] = useState("");
  const [requestMoneyDialog, setRequestMoneyDialog] = useState(false);
  const [sendingPaymentLink, setSendingPaymentLink] = useState(false);

  const handleSendPaymentLink = useCallback(async () => {
    if (!thread || !orgId || !paymentAmount) return;
    const authUserId = await resolveAuthUserId();
    if (!authUserId) return;
    setSendingPaymentLink(true);

    try {
      const amount = parseFloat(paymentAmount);
      if (Number.isNaN(amount) || amount <= 0) throw new Error("Invalid amount");

      let paymentUrl = "";
      try {
        const { data, error } = await supabase.functions.invoke("create-concierge-payment", {
          body: {
            order_id: thread.bookingId || thread.id,
            service_id: thread.contextId,
            amount,
            currency: thread.currency || "eur",
            guest_email: thread.email || "",
            guest_name: thread.name || "",
            service_title: thread.serviceTitle || paymentDescription || "",
            origin: window.location.origin,
          },
        });
        if (error) throw error;
        paymentUrl = data?.url || "";
      } catch (e) {
        console.error("Payment link failed:", e);
      }

      const msgContent = paymentUrl
        ? `💳 Payment request: ${amount.toFixed(2)} ${(thread.currency || "EUR").toUpperCase()}\n${paymentDescription ? `📝 ${paymentDescription}\n` : ""}🔗 ${paymentUrl}`
        : `💳 Payment request: ${amount.toFixed(2)} ${(thread.currency || "EUR").toUpperCase()}\n${paymentDescription ? `📝 ${paymentDescription}\n` : ""}Please contact us for payment details.`;

      if (thread.isV2 && thread.v2ConversationId) {
        const { error } = await (supabase as any).from("chat_messages_v2").insert({
          conversation_id: thread.v2ConversationId,
          sender_user_id: authUserId,
          sender_orbit_id: `orbit_${authUserId.slice(0, 12)}`,
          receiver_orbit_id: thread.peerOrbitId ?? null,
          type: "payment",
          body: msgContent,
          metadata: { amount, currency: (thread.currency || "EUR").toUpperCase(), url: paymentUrl || null },
        });
        if (error) throw error;
        await (supabase as any).from("conversations_v2").update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", thread.v2ConversationId);
      } else {
        // V2 canonical path — write payment message to chat_messages_v2
        const conversationId = thread.v2ConversationId || thread.contextId;
        if (conversationId) {
          await (supabase as any).from("chat_messages_v2").insert({
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
        await (supabase as any).from("unified_wallet_transactions").insert({
          sender_id: null,
          recipient_id: authUserId,
          amount,
          currency: (thread.currency || "EUR").toUpperCase(),
          title: paymentDescription || `Payment request to ${thread.name}`,
          status: "pending",
          context_type: thread.contextType || "payment_request",
          context_id: thread.bookingId || thread.contextId || null,
        } as any);
      } catch {}

      setPaymentLinkDialog(false);
      setPaymentAmount("");
      setPaymentDescription("");
      toast.success("Payment request sent");
    } catch (e: any) {
      toast.error(e.message || "Failed to send payment request");
    } finally {
      setSendingPaymentLink(false);
    }
  }, [thread, orgId, paymentAmount, paymentDescription, resolveAuthUserId]);

  return {
    paymentLinkDialog, setPaymentLinkDialog,
    paymentAmount, setPaymentAmount,
    paymentDescription, setPaymentDescription,
    requestMoneyDialog, setRequestMoneyDialog,
    sendingPaymentLink, handleSendPaymentLink,
  };
}
