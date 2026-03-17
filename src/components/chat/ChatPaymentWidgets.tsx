/**
 * ChatPaymentActions — Send money + Request money buttons for chat.
 * ChatPaymentRequestCard — Inline payment request card in message list.
 * QrPayCard — Generate QR payment link card.
 */
import { useState } from "react";
import { Send, Receipt, CheckCircle2, Clock, Wallet } from "lucide-react";
import { UnifiedPayButton } from "@/payments/UnifiedPaymentSystem";
import { markPaymentRequestPaid, encodeQrPayload, type QrPayload } from "@/payments/payment-request-hooks";
import { RequestMoneyModal } from "@/components/chat/RequestMoneyModal";

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
  onRequestCreated,
}: {
  recipientId: string;
  recipientName?: string;
  threadId?: string | null;
  onRequestCreated?: (request: any) => void;
}) {
  const [showRequest, setShowRequest] = useState(false);

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
        onCreated={onRequestCreated}
      />
    </>
  );
}

/* ── Inline Payment Request Card ────────────────────────────── */
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
  const isPaid = request.status === "paid";

  return (
    <div className="rounded-2xl border border-border/40 bg-card p-3 max-w-[260px]">
      <div className="flex items-center gap-2 mb-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/30 text-accent-foreground">
          <Receipt className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-foreground truncate">
            {request.title || "Payment request"}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {isPaid ? "Paid" : "Pending"}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-base font-bold text-foreground">
          {formatMoney(request.amount, request.currency)}
        </span>

        {isPaid ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        ) : (
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
              if (result.transactionId) {
                await markPaymentRequestPaid(request.id, result.transactionId);
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
