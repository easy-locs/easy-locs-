/**
 * usePaymentDialogs — Extracted from HudChatPanel.
 * Manages payment link creation, request money, and payment message sending.
 */
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
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
      if (isNaN(amount) || amount <= 0) throw new Error("Invalid amount");
      let paymentUrl = "";
      try {
        const { data, error } = await supabase.functions.invoke("create-concierge-payment", {
          body: {
            order_id: thread.bookingId || thread.id, service_id: thread.contextId,
            amount, currency: thread.currency || "eur",
            guest_email: thread.email || "", guest_name: thread.name || "",
            service_title: thread.serviceTitle || paymentDescription || "",
            origin: window.location.origin,
          },
        });
        if (error) throw error;
        paymentUrl = data?.url || "";
      } catch (e) { console.error("Stripe failed:", e); }

      const msgContent = paymentUrl
        ? `💳 Payment request: ${amount.toFixed(2)} ${(thread.currency || "EUR").toUpperCase()}\n${paymentDescription ? `📝 ${paymentDescription}\n` : ""}🔗 ${paymentUrl}`
        : `💳 Payment request: ${amount.toFixed(2)} ${(thread.currency || "EUR").toUpperCase()}\n${paymentDescription ? `📝 ${paymentDescription}\n` : ""}Please contact us for payment details.`;

      const paymentMsgPayload: any = {
        org_id: orgId, sender_id: authUserId, tenant_id: thread.tenantId || null,
        booking_id: thread.bookingId || null, booking_type: thread.bookingType || null,
        content: msgContent, category: "payment", message_type: "user", read: false,
        context_type: thread.contextType, context_id: thread.contextId,
      };
      if (thread.threadId) paymentMsgPayload.thread_id = thread.threadId;
      await supabase.from("messages").insert(paymentMsgPayload);

      try {
        await (supabase as any).from("unified_wallet_transactions").insert({
          sender_id: null, recipient_id: authUserId, amount,
          currency: (thread.currency || "EUR").toUpperCase(),
          title: paymentDescription || `Payment request to ${thread.name}`,
          status: "pending", context_type: thread.contextType || "payment_request",
          context_id: thread.bookingId || thread.contextId || null,
        } as any);
      } catch {}

      setPaymentLinkDialog(false);
      setPaymentAmount("");
      setPaymentDescription("");
      toast.success("Payment request sent");
    } catch (e: any) { toast.error(e.message); }
    setSendingPaymentLink(false);
  }, [thread, orgId, paymentAmount, paymentDescription, resolveAuthUserId]);

  return {
    paymentLinkDialog, setPaymentLinkDialog,
    paymentAmount, setPaymentAmount,
    paymentDescription, setPaymentDescription,
    requestMoneyDialog, setRequestMoneyDialog,
    sendingPaymentLink, handleSendPaymentLink,
  };
}
