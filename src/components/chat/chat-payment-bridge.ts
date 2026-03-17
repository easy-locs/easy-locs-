/**
 * Chat Payment Bridge — sends a payment_request card message into a chat thread
 * using the existing `messages` table (not conversation_messages).
 */
import { supabase } from "@/integrations/supabase/client";
import type { PaymentRequestRow } from "@/payments/payment-request-hooks";

export async function sendPaymentRequestMessageToThread(params: {
  threadId: string;
  senderId: string;
  orgId: string;
  request: PaymentRequestRow;
  tenantId?: string | null;
  bookingId?: string | null;
  bookingType?: string | null;
  contextType?: string | null;
  contextId?: string | null;
  /** Optional E2EE encrypt function */
  encrypt?: (content: string, peerId: string) => Promise<string | null>;
  peerId?: string | null;
}) {
  const {
    threadId, senderId, orgId, request,
    tenantId, bookingId, bookingType, contextType, contextId,
    encrypt, peerId,
  } = params;

  const cardContent = JSON.stringify({
    _type: "payment_request_card",
    id: request.id,
    amount: request.amount,
    currency: request.currency,
    title: request.title,
    subtitle: request.subtitle,
    requester_id: request.requester_id,
    recipient_id: request.recipient_id,
    status: request.status,
    context_type: request.context_type,
    context_id: request.context_id,
    payment_tx_id: request.payment_tx_id,
    source: "chat-payment-bridge",
  });

  let storedContent = cardContent;
  let isEncrypted = false;

  if (encrypt && peerId) {
    const enc = await encrypt(cardContent, peerId);
    if (enc) {
      storedContent = enc;
      isEncrypted = true;
    }
  }

  const msgPayload: any = {
    org_id: orgId,
    sender_id: senderId,
    tenant_id: tenantId || null,
    booking_id: bookingId || null,
    booking_type: bookingType || null,
    content: storedContent,
    category: "payment_request",
    message_type: "system",
    read: false,
    context_type: contextType || null,
    context_id: contextId || null,
    encrypted: isEncrypted,
    thread_id: threadId,
  };

  const { data, error } = await supabase.from("messages").insert(msgPayload).select("*").single();
  if (error) throw error;
  return data;
}
