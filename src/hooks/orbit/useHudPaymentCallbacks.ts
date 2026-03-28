/**
 * useHudPaymentCallbacks — Atomic hook: payment dialog callbacks for HudChatPanel.
 * Single responsibility: payment success/request message injection.
 */
import { useCallback } from "react";
import { toast } from "sonner";
import { sendPaymentReceiptToThread, sendPaymentRequestMessageToThread } from "@/components/chat/ChatPaymentCards";
import type { PaymentConfirmation } from "@/components/orbit/payments/OrbitSmartPayment";

interface UseHudPaymentCallbacksParams {
  thread: any;
  orgId: string | null | undefined;
  e2eReady: boolean;
  encrypt: (text: string, peerId: string) => Promise<string | null>;
  resolveAuthUserId: () => Promise<string | null>;
  setPaymentLinkDialog: (v: boolean) => void;
  setRequestMoneyDialog: (v: boolean) => void;
  t: (k: string) => string;
}

export function useHudPaymentCallbacks({
  thread, orgId, e2eReady, encrypt, resolveAuthUserId,
  setPaymentLinkDialog, setRequestMoneyDialog, t,
}: UseHudPaymentCallbacksParams) {
  const handlePaymentSuccess = useCallback(async (conf: PaymentConfirmation) => {
    setPaymentLinkDialog(false);
    const authUserId = await resolveAuthUserId();
    if (!authUserId || !orgId || !thread) return;
    const peerId = thread.peerUserId || thread.tenantId || thread.contextId || thread.id;
    try {
      await sendPaymentReceiptToThread({
        threadId: thread.threadId || thread.id,
        senderId: authUserId,
        orgId,
        transactionId: conf.txnId,
        amount: conf.amount,
        currency: conf.currency,
        recipientName: conf.recipientName || thread.name,
        title: conf.status === "completed" ? "Payment sent" : "Payment initiated",
        contextType: thread.contextType,
        contextId: thread.contextId,
        tenantId: thread.tenantId,
        bookingId: thread.bookingId,
        bookingType: thread.bookingType,
        encrypt: e2eReady ? encrypt : undefined,
        peerId: e2eReady ? peerId : null,
      });
    } catch {}
    toast.success(conf.status === "completed" ? "Payment sent" : "Payment initiated");
  }, [thread, orgId, e2eReady, encrypt, resolveAuthUserId, setPaymentLinkDialog]);

  const handlePaymentRequest = useCallback(async (req: any) => {
    const authUserId = await resolveAuthUserId();
    if (!authUserId || !orgId || !thread) return;
    const peerId = thread.peerUserId || thread.tenantId || thread.contextId || thread.id;
    try {
      await sendPaymentRequestMessageToThread({
        threadId: thread.threadId || thread.id,
        senderId: authUserId,
        orgId,
        request: req,
        tenantId: thread.tenantId,
        bookingId: thread.bookingId,
        bookingType: thread.bookingType,
        contextType: thread.contextType,
        contextId: thread.contextId,
        encrypt: e2eReady ? encrypt : undefined,
        peerId: e2eReady ? peerId : null,
      });
    } catch {}
    toast.success(t("orbit.payment_request_sent") || "Payment request sent in chat");
  }, [thread, orgId, e2eReady, encrypt, resolveAuthUserId, t]);

  return { handlePaymentSuccess, handlePaymentRequest };
}
