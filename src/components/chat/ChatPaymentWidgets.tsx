/**
 * ChatPaymentActions — Send money + Request money buttons for chat.
 * ChatPaymentRequestCard — Inline payment request card in message list (live status).
 * QrPayCard — Generate QR payment link card with visual QR code.
 */
import { useState } from "react";
import { Send, Receipt, CheckCircle2, Clock, Wallet } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import QRCode from "react-qr-code";
import { supabase } from "@/integrations/supabase/client";
import { UnifiedPayButton } from "@/payments/UnifiedPaymentSystem";
import { markPaymentRequestPaid, encodeQrPayload, type QrPayload } from "@/payments/payment-request-hooks";
import { RequestMoneyModal } from "@/components/chat/RequestMoneyModal";
import { sendPaymentRequestMessageToThread } from "@/components/chat/chat-payment-bridge";
import { useAuth } from "@/contexts/AuthContext";

function formatMoney(amount: number, currency = "AED") {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

/* ── Chat Payment Actions Bar ───────────────────────────────── */
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
          // Auto-send payment request card into the chat thread
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
              console.error("[ChatPaymentActions] Failed to send request message:", err);
            }
          }
          onRequestCreated?.(req);
        }}
      />
    </>
  );
}

/* ── Inline Payment Request Card (live status) ──────────────── */
export function ChatPaymentRequestCard({
  request,
}: {
  request: {
    id: string;
    amount: number;
    currency: string;
    title?: string | null;
    subtitle?: string | null;
    requester_id: string;
    status: string;
  };
}) {
  // Live poll the payment_requests table for real-time status
  const { data } = useQuery({
    queryKey: ["payment-request-live", request.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("payment_requests")
        .select("id, amount, currency, title, subtitle, requester_id, status")
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
    <div className="rounded-2xl border border-border/40 bg-card p-3 max-w-[260px]">
      <div className="flex items-center gap-2 mb-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/30 text-accent-foreground">
          <Receipt className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-foreground truncate">
            {live.title || "Payment request"}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {isPaid ? "Paid ✓" : "Pending"}
          </p>
        </div>
      </div>

      {live.subtitle && (
        <p className="text-[11px] text-muted-foreground mb-2 truncate">{live.subtitle}</p>
      )}

      <div className="flex items-center justify-between">
        <span className="text-base font-bold text-foreground">
          {formatMoney(live.amount, live.currency)}
        </span>

        {isPaid ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        ) : (
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
              if (result.transactionId) {
                await markPaymentRequestPaid(live.id, result.transactionId);
              }
            }}
          >
            Pay
          </UnifiedPayButton>
        )}
      </div>
    </div>
  );
}

/* ── QR Pay Card ─────────────────────────────────────────────── */
export function QrPayCard({
  payload,
  title,
}: {
  payload: QrPayload;
  title: string;
}) {
  const raw = encodeQrPayload(payload);
  const link = `${window.location.origin}/qr/resolve?data=${encodeURIComponent(raw)}`;
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground break-all">{link}</p>
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
