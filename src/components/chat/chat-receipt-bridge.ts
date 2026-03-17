/**
 * Chat Payment Receipt Bridge — sends a payment receipt card message into a chat thread.
 * Uses the existing `messages` table with category "payment_receipt".
 */
import { supabase } from "@/integrations/supabase/client";

export async function sendPaymentReceiptToThread(params: {
  threadId: string;
  senderId: string;
  orgId: string;
  transactionId: string;
  amount: number;
  currency: string;
  recipientId?: string | null;
  recipientName?: string | null;
  title?: string;
  contextType?: string;
  contextId?: string | null;
  tenantId?: string | null;
  bookingId?: string | null;
  bookingType?: string | null;
  /** Optional E2EE encrypt function */
  encrypt?: (content: string, peerId: string) => Promise<string | null>;
  peerId?: string | null;
}) {
  const {
    threadId, senderId, orgId, transactionId, amount, currency,
    recipientId, recipientName, title, contextType, contextId,
    tenantId, bookingId, bookingType, encrypt, peerId,
  } = params;

  const cardContent = JSON.stringify({
    _type: "payment_receipt_card",
    transaction_id: transactionId,
    amount,
    currency,
    recipient_id: recipientId || null,
    recipient_name: recipientName || null,
    title: title || "Payment sent",
    status: "completed",
    source: "chat-payment-receipt",
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
    category: "payment_receipt",
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
