/**
 * ChatPaymentCards — Canonical chat payment module.
 *
 * Exports:
 *  - ChatPaymentActions       (Send + Request bar for chat input)
 *  - ChatPaymentRequestCard   (Inline request card with live polling + pay button)
 *  - ChatPaymentReceiptCard   (Inline receipt card)
 *  - QrPayCard                (QR code card for sharing payment link)
 *  - sendPaymentRequestMessageToThread  (bridge: insert request card into messages)
 *  - sendPaymentReceiptToThread         (bridge: insert receipt card into messages)
 */
import { useState, useMemo } from "react";
import { Send, Receipt, CheckCircle2, Clock, CreditCard } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import QRCode from "react-qr-code";
import { supabase } from "@/integrations/supabase/client";
import { UnifiedPayButton } from "@/payments/UnifiedPaymentSystem";
import { markPaymentRequestPaid, type PaymentRequestRow } from "@/payments/payment-request-hooks";
import { type UniversalQrPayload, toResolveUrl } from "@/lib/qr-engine";
import { RequestMoneyModal } from "@/components/chat/RequestMoneyModal";
import { useAuth } from "@/contexts/AuthContext";
import { formatMoney } from "@/lib/format";

/* ═══════════════════════════════════════════════════════════════
   1. BRIDGE — insert payment messages into chat
   ═══════════════════════════════════════════════════════════════ */

/** Insert a payment_request card message into a chat thread */
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

  const { data, error } = await supabase.from("chat_messages_v2").insert(msgPayload).select("*").single();
  if (error) throw error;
  return data;
}

/** Insert a payment receipt card message into a chat thread */
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
    timestamp: Date.now(),
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

  const { data, error } = await supabase.from("chat_messages_v2").insert(msgPayload).select("*").single();
  if (error) throw error;
  return data;
}

/* ═══════════════════════════════════════════════════════════════
   2. CHAT PAYMENT ACTIONS BAR
   ═══════════════════════════════════════════════════════════════ */

export function ChatPaymentActions({
  recipientId,
  recipientName,
  threadId,
  orgId,
  tenantId,
  bookingId,
  bookingType,
  contextType,
  contextId,
  encrypt,
  peerId,
  onRequestCreated,
}: {
  recipientId: string;
  recipientName?: string;
  threadId?: string | null;
  orgId?: string | null;
  tenantId?: string | null;
  bookingId?: string | null;
  bookingType?: string | null;
  contextType?: string | null;
  contextId?: string | null;
  encrypt?: (content: string, peerId: string) => Promise<string | null>;
  peerId?: string | null;
  onRequestCreated?: (request: any) => void;
}) {
  const [showRequest, setShowRequest] = useState(false);
  const { user } = useAuth();

  return (
    <>
      <div className="flex items-center gap-2 py-1">
        <UnifiedPayButton
          amount={0}
          currency="AED"
          title="Send money"
          subtitle={`To ${recipientName || "contact"}`}
          recipientId={recipientId}
          recipientName={recipientName || null}
          contextType="chat"
          contextId={threadId || null}
          className="flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-2 text-xs font-medium text-primary transition hover:bg-primary/20"
        >
          <Send className="h-3.5 w-3.5" /> Send
        </UnifiedPayButton>

        <button
          type="button"
          onClick={() => setShowRequest(true)}
          className="flex items-center gap-1.5 rounded-xl bg-accent/50 px-3 py-2 text-xs font-medium text-foreground transition hover:bg-accent"
        >
          <Receipt className="h-3.5 w-3.5" /> Request
        </button>
      </div>

      <RequestMoneyModal
        open={showRequest}
        onClose={() => setShowRequest(false)}
        recipientId={recipientId}
        contextId={threadId || null}
        onCreated={async (req) => {
          if (threadId && user?.id && orgId) {
            try {
              await sendPaymentRequestMessageToThread({
                threadId,
                senderId: user.id,
                orgId,
                request: req,
                tenantId,
                bookingId,
                bookingType,
                contextType,
                contextId,
                encrypt,
                peerId,
              });
            } catch (err) {
              console.error("[ChatPaymentCards] Failed to send request message:", err);
            }
          }
          onRequestCreated?.(req);
        }}
      />
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   3. PAYMENT REQUEST CARD (live polling + inline pay)
   ═══════════════════════════════════════════════════════════════ */

type PaymentRequestCardData = {
  id: string;
  amount: number;
  currency: string;
  title?: string | null;
  subtitle?: string | null;
  requester_id: string;
  recipient_id?: string | null;
  status: string;
  context_type?: string;
  context_id?: string | null;
};

export function ChatPaymentRequestCard({
  request,
  threadId,
  orgId,
  payerId,
}: {
  request: PaymentRequestCardData;
  threadId?: string | null;
  orgId?: string | null;
  payerId?: string;
}) {
  // Live poll the payment_requests table for real-time status
  const { data } = useQuery({
    queryKey: ["payment-request-live", request.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("payment_requests")
        .select("id, amount, currency, title, subtitle, requester_id, recipient_id, status, context_type, context_id")
        .eq("id", request.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!request.id,
    refetchInterval: request.status !== "paid" ? 3000 : false,
  });

  const live = data || request;
  const isPaid = live.status === "paid";

  return (
    <div className="rounded-2xl border p-3 max-w-[260px]" style={{
      borderColor: "hsl(var(--hud-purple) / 0.15)",
      background: "hsl(var(--hud-purple) / 0.04)",
    }}>
      <div className="flex items-center gap-2 mb-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{
          background: "hsl(var(--hud-purple) / 0.12)",
        }}>
          <CreditCard className="h-4 w-4" style={{ color: "hsl(var(--hud-purple))" }} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium truncate" style={{ color: "hsl(var(--foreground))" }}>
            {live.title || "Payment request"}
          </p>
          <p className="text-[10px]" style={{
            color: isPaid ? "hsl(var(--hud-success))" : "hsl(var(--hud-text-dim))",
          }}>
            {isPaid ? "Paid ✓" : "Pending"}
          </p>
        </div>
      </div>

      {live.subtitle && (
        <p className="text-[11px] mb-2 truncate" style={{ color: "hsl(var(--hud-text-dim))" }}>
          {live.subtitle}
        </p>
      )}

      <div className="flex items-center justify-between">
        <span className="text-base font-bold" style={{ color: "hsl(var(--foreground))" }}>
          {formatMoney(live.amount, live.currency)}
        </span>

        {isPaid ? (
          <CheckCircle2 className="h-4 w-4" style={{ color: "hsl(var(--hud-success))" }} />
        ) : payerId ? (
          <UnifiedPayButton
            amount={live.amount}
            currency={live.currency}
            title={live.title || "Payment request"}
            subtitle={live.subtitle || undefined}
            recipientId={live.requester_id}
            recipientName={live.title || "Payment request"}
            contextType="order"
            contextId={live.id}
            className="rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
            onSuccess={async (result) => {
              if (!result.transactionId) return;
              await markPaymentRequestPaid(live.id, result.transactionId);
              try {
                await sendPaymentReceiptToThread({
                  orgId: orgId || "",
                  threadId: threadId || "",
                  senderId: payerId,
                  transactionId: result.transactionId,
                  amount: live.amount,
                  currency: live.currency,
                  recipientId: live.requester_id,
                  title: live.title || "Payment sent",
                  contextType: live.context_type || "chat",
                  contextId: live.context_id || live.id,
                });
              } catch (err) {
                console.error("[ChatPaymentCards] receipt send failed:", err);
              }
            }}
          >
            Pay
          </UnifiedPayButton>
        ) : (
          <Clock className="h-4 w-4" style={{ color: "hsl(var(--hud-text-dim))" }} />
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   4. PAYMENT RECEIPT CARD
   ═══════════════════════════════════════════════════════════════ */

type PaymentReceiptData = {
  _type?: string;
  txId?: string;
  transaction_id?: string;
  amount: number;
  currency: string;
  to?: string | null;
  recipient_id?: string | null;
  recipient_name?: string | null;
  title?: string | null;
  subtitle?: string | null;
  timestamp?: number;
};

export function ChatPaymentReceiptCard({
  receipt,
}: {
  receipt: PaymentReceiptData;
}) {
  const txId = receipt.txId || receipt.transaction_id || "";
  const date = receipt.timestamp ? new Date(receipt.timestamp).toLocaleString() : null;

  return (
    <div className="rounded-2xl border p-3 max-w-[260px]" style={{
      borderColor: "hsl(var(--hud-success) / 0.15)",
      background: "hsl(var(--hud-success) / 0.04)",
    }}>
      <div className="flex items-center gap-2 mb-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{
          background: "hsl(var(--hud-success) / 0.12)",
        }}>
          <CheckCircle2 className="h-4 w-4" style={{ color: "hsl(var(--hud-success))" }} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium truncate" style={{ color: "hsl(var(--foreground))" }}>
            {receipt.title || "Payment sent"}
          </p>
          <p className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim))" }}>Completed</p>
        </div>
      </div>

      {receipt.subtitle && (
        <p className="text-[11px] mb-2 truncate" style={{ color: "hsl(var(--hud-text-dim))" }}>
          {receipt.subtitle}
        </p>
      )}

      <div className="flex items-center justify-between">
        <span className="text-base font-bold" style={{ color: "hsl(var(--hud-success))" }}>
          {formatMoney(receipt.amount, receipt.currency)}
        </span>
        <CheckCircle2 className="h-4 w-4" style={{ color: "hsl(var(--hud-success))" }} />
      </div>

      {txId && (
        <p className="text-[10px] mt-1.5" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
          TX: {txId.slice(0, 12)}…
        </p>
      )}
      {date && (
        <p className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
          {date}
        </p>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   5. QR PAY CARD
   ═══════════════════════════════════════════════════════════════ */

export function QrPayCard({
  payload,
  title,
}: {
  payload: UniversalQrPayload;
  title: string;
}) {
  const link = toResolveUrl(payload);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <p className="text-sm font-semibold text-foreground">{title}</p>

      <div className="flex justify-center p-3 bg-white rounded-xl">
        <QRCode value={link} size={180} level="M" />
      </div>

      <p className="text-[10px] text-muted-foreground break-all text-center">{link}</p>

      <button
        type="button"
        onClick={handleCopy}
        className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
      >
        {copied ? "Copied ✓" : "Copy QR payment link"}
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   6. UNIVERSAL MESSAGE RENDERER
   ═══════════════════════════════════════════════════════════════ */

type ChatMessage = {
  id: string;
  thread_id?: string | null;
  sender_id?: string | null;
  content?: string | null;
  body?: string | null;
  category?: string | null;
  message_type?: string | null;
  metadata?: Record<string, any> | null;
};

export function ChatPaymentMessageRenderer({
  msg,
  threadId,
  orgId,
  currentUserId,
}: {
  msg: ChatMessage;
  threadId?: string | null;
  orgId?: string | null;
  currentUserId: string;
}) {
  const paymentRequestData = useMemo(() => {
    if (msg.category !== "payment_request") return null;
    try {
      if (msg.content) {
        const parsed = JSON.parse(msg.content);
        if (parsed?._type === "payment_request_card" || parsed?.id) {
          return {
            id: parsed.id,
            amount: Number(parsed.amount || 0),
            currency: parsed.currency || "AED",
            title: parsed.title || "Payment request",
            subtitle: parsed.subtitle || null,
            requester_id: parsed.requester_id,
            recipient_id: parsed.recipient_id || null,
            status: parsed.status || "pending",
            context_type: parsed.context_type || "chat",
            context_id: parsed.context_id || msg.thread_id || null,
          } as PaymentRequestCardData;
        }
      }
      if (msg.metadata?.payment_request_id) {
        return {
          id: msg.metadata.payment_request_id,
          amount: Number(msg.metadata.amount || 0),
          currency: msg.metadata.currency || "AED",
          title: msg.metadata.title || "Payment request",
          subtitle: msg.metadata.subtitle || null,
          requester_id: msg.metadata.requester_id,
          recipient_id: msg.metadata.recipient_id || null,
          status: msg.metadata.status || "pending",
          context_type: msg.metadata.context_type || "chat",
          context_id: msg.metadata.context_id || msg.thread_id || null,
        } as PaymentRequestCardData;
      }
      return null;
    } catch { return null; }
  }, [msg]);

  const paymentReceiptData = useMemo(() => {
    if (msg.category !== "payment_receipt") return null;
    try {
      const parsed = msg.content ? JSON.parse(msg.content) : null;
      if (parsed?._type === "payment_receipt" || parsed?._type === "payment_receipt_card") {
        return parsed as PaymentReceiptData;
      }
      return null;
    } catch { return null; }
  }, [msg]);

  if (paymentRequestData) {
    return (
      <ChatPaymentRequestCard
        request={paymentRequestData}
        threadId={threadId}
        orgId={orgId}
        payerId={currentUserId}
      />
    );
  }

  if (paymentReceiptData) {
    return <ChatPaymentReceiptCard receipt={paymentReceiptData} />;
  }

  return null;
}
