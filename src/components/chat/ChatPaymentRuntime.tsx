/**
 * ChatPaymentRuntime — Unified payment message renderer + receipt sender.
 * Handles both payment_request and payment_receipt categories in chat.
 */
import { useMemo } from "react";
import { CheckCircle2, CreditCard, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { UnifiedPayButton } from "@/payments/UnifiedPaymentSystem";
import { markPaymentRequestPaid } from "@/payments/payment-request-hooks";

/* ── Types ──────────────────────────────────────────────────── */

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

type PaymentReceiptData = {
  _type: "payment_receipt" | "payment_receipt_card";
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

/* ── Helpers ─────────────────────────────────────────────────── */

function formatMoney(amount: number, currency = "AED") {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

/* ── Send receipt into chat ──────────────────────────────────── */

export async function sendPaymentReceiptMessage(params: {
  orgId?: string | null;
  threadId?: string | null;
  senderId: string;
  recipientId?: string | null;
  amount: number;
  currency?: string;
  txId: string;
  title?: string | null;
  subtitle?: string | null;
  contextType?: string | null;
  contextId?: string | null;
  tenantId?: string | null;
  bookingId?: string | null;
  bookingType?: string | null;
  encrypt?: (content: string, peerId: string) => Promise<string | null>;
  peerId?: string | null;
}) {
  const receiptPayload: PaymentReceiptData = {
    _type: "payment_receipt",
    txId: params.txId,
    amount: params.amount,
    currency: params.currency || "AED",
    to: params.recipientId || null,
    title: params.title || "Payment sent",
    subtitle: params.subtitle || null,
    timestamp: Date.now(),
  };

  let content = JSON.stringify(receiptPayload);
  let encrypted = false;

  if (params.encrypt && params.peerId) {
    const enc = await params.encrypt(content, params.peerId);
    if (enc) {
      content = enc;
      encrypted = true;
    }
  }

  const insertPayload: any = {
    sender_id: params.senderId,
    content,
    category: "payment_receipt",
    message_type: "system",
    read: false,
    encrypted,
  };

  if (params.threadId) insertPayload.thread_id = params.threadId;
  if (params.orgId) insertPayload.org_id = params.orgId;
  if (params.contextType) insertPayload.context_type = params.contextType;
  if (params.contextId) insertPayload.context_id = params.contextId;
  if (params.tenantId) insertPayload.tenant_id = params.tenantId;
  if (params.bookingId) insertPayload.booking_id = params.bookingId;
  if (params.bookingType) insertPayload.booking_type = params.bookingType;

  const { error } = await supabase.from("messages").insert(insertPayload);
  if (error) throw error;
}

/* ── Payment Request Card ────────────────────────────────────── */

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
  const isPaid = request.status === "paid";

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
            {request.title || "Payment request"}
          </p>
          <p className="text-[10px]" style={{
            color: isPaid ? "hsl(var(--hud-success))" : "hsl(var(--hud-text-dim))",
          }}>
            {isPaid ? "Paid ✓" : "Pending"}
          </p>
        </div>
      </div>

      {request.subtitle && (
        <p className="text-[11px] mb-2 truncate" style={{ color: "hsl(var(--hud-text-dim))" }}>
          {request.subtitle}
        </p>
      )}

      <div className="flex items-center justify-between">
        <span className="text-base font-bold" style={{ color: "hsl(var(--foreground))" }}>
          {formatMoney(request.amount, request.currency)}
        </span>

        {isPaid ? (
          <CheckCircle2 className="h-4 w-4" style={{ color: "hsl(var(--hud-success))" }} />
        ) : payerId ? (
          <UnifiedPayButton
            amount={request.amount}
            currency={request.currency}
            title={request.title || "Payment request"}
            subtitle={request.subtitle || undefined}
            recipientId={request.requester_id}
            recipientName={request.title || "Payment request"}
            contextType="order"
            contextId={request.id}
            className="rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
            onSuccess={async (result) => {
              if (!result.transactionId) return;
              await markPaymentRequestPaid(request.id, result.transactionId);
              try {
                await sendPaymentReceiptMessage({
                  orgId,
                  threadId,
                  senderId: payerId,
                  recipientId: request.requester_id,
                  amount: request.amount,
                  currency: request.currency,
                  txId: result.transactionId,
                  title: request.title || "Payment sent",
                  subtitle: request.subtitle || null,
                  contextType: request.context_type || "chat",
                  contextId: request.context_id || request.id,
                });
              } catch (err) {
                console.error("[ChatPaymentRuntime] receipt send failed:", err);
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

/* ── Payment Receipt Card ────────────────────────────────────── */

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

/* ── Universal Renderer ──────────────────────────────────────── */

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
