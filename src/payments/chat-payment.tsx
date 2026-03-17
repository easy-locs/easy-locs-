/**
 * Chat Payment Integration — send money, request money, and render payment cards
 * directly inside conversation threads. Reuses UnifiedPaymentSystem.
 */
import React, { useState } from "react";
import { Send, Receipt, CheckCircle2, Clock, Wallet } from "lucide-react";
import { useUnifiedPayment, type PaymentContextType } from "@/payments/UnifiedPaymentSystem";
import { createPaymentRequest, type PaymentRequestRecord } from "@/payments/request-money";
import { useAuth } from "@/contexts/AuthContext";

/* ── Chat Send Money Button ─────────────────────────────────── */
export function ChatSendMoneyButton({
  recipientId,
  recipientName,
  threadId,
  className,
}: {
  recipientId: string;
  recipientName?: string;
  threadId?: string;
  className?: string;
}) {
  const { openPayment } = useUnifiedPayment();
  const [amount, setAmount] = useState("");
  const [showInput, setShowInput] = useState(false);

  const handleSend = async () => {
    const num = parseFloat(amount);
    if (!num || num <= 0) return;

    await openPayment({
      amount: num,
      currency: "AED",
      title: "Send money",
      subtitle: `To ${recipientName || "contact"}`,
      recipientId,
      recipientName: recipientName || null,
      contextType: "chat",
      contextId: threadId || null,
    });
    setShowInput(false);
    setAmount("");
  };

  if (!showInput) {
    return (
      <button
        type="button"
        onClick={() => setShowInput(true)}
        className={className || "flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-2 text-xs font-medium text-primary transition hover:bg-primary/20"}
      >
        <Send className="h-3.5 w-3.5" /> Send
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min="0.01"
        step="0.01"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="w-24 rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        autoFocus
      />
      <button
        type="button"
        onClick={handleSend}
        disabled={!amount || parseFloat(amount) <= 0}
        className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
      >
        Pay
      </button>
      <button
        type="button"
        onClick={() => { setShowInput(false); setAmount(""); }}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        ✕
      </button>
    </div>
  );
}

/* ── Chat Request Money Button ──────────────────────────────── */
export function ChatRequestMoneyButton({
  threadId,
  className,
}: {
  threadId?: string;
  className?: string;
}) {
  const { user } = useAuth();
  const [amount, setAmount] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [sent, setSent] = useState(false);

  const handleRequest = async () => {
    if (!user?.id) return;
    const num = parseFloat(amount);
    if (!num || num <= 0) return;

    await createPaymentRequest({
      senderId: user.id,
      amount: num,
      currency: "AED",
      title: "Payment request",
      contextType: "chat",
      contextId: threadId || null,
      threadId: threadId || null,
    });

    setSent(true);
    setTimeout(() => { setShowInput(false); setAmount(""); setSent(false); }, 2000);
  };

  if (!showInput) {
    return (
      <button
        type="button"
        onClick={() => setShowInput(true)}
        className={className || "flex items-center gap-1.5 rounded-xl bg-accent/50 px-3 py-2 text-xs font-medium text-foreground transition hover:bg-accent"}
      >
        <Receipt className="h-3.5 w-3.5" /> Request
      </button>
    );
  }

  if (sent) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-emerald-600">
        <CheckCircle2 className="h-3.5 w-3.5" /> Request sent
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min="0.01"
        step="0.01"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="w-24 rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        autoFocus
      />
      <button
        type="button"
        onClick={handleRequest}
        disabled={!amount || parseFloat(amount) <= 0}
        className="rounded-xl bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground disabled:opacity-50"
      >
        Request
      </button>
      <button
        type="button"
        onClick={() => { setShowInput(false); setAmount(""); }}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        ✕
      </button>
    </div>
  );
}

/* ── Chat Payment Actions Bar ───────────────────────────────── */
export function ChatPaymentBar({
  recipientId,
  recipientName,
  threadId,
}: {
  recipientId: string;
  recipientName?: string;
  threadId?: string;
}) {
  return (
    <div className="flex items-center gap-2 py-1">
      <ChatSendMoneyButton
        recipientId={recipientId}
        recipientName={recipientName}
        threadId={threadId}
      />
      <ChatRequestMoneyButton threadId={threadId} />
    </div>
  );
}

/* ── Inline Payment Card (render inside message list) ────────── */
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

export function ChatPaymentCard({
  type,
  amount,
  currency = "AED",
  status = "completed",
  title,
  isSender,
  onPay,
}: {
  type: "send" | "request";
  amount: number;
  currency?: string;
  status?: string;
  title?: string;
  isSender: boolean;
  onPay?: () => void;
}) {
  const isPending = status === "pending";
  const isRequest = type === "request";

  return (
    <div className="rounded-2xl border border-border/40 bg-card p-3 max-w-[260px]">
      <div className="flex items-center gap-2 mb-2">
        <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${
          isRequest ? "bg-accent/30 text-accent-foreground" : "bg-primary/10 text-primary"
        }`}>
          {isRequest ? <Receipt className="h-4 w-4" /> : <Wallet className="h-4 w-4" />}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-foreground truncate">
            {title || (isRequest ? "Payment request" : "Payment sent")}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {isPending ? "Pending" : "Completed"}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className={`text-base font-bold ${
          isRequest && !isSender ? "text-foreground" : isSender ? "text-destructive" : "text-emerald-600"
        }`}>
          {formatMoney(amount, currency)}
        </span>

        {isPending && isRequest && !isSender && onPay && (
          <button
            type="button"
            onClick={onPay}
            className="rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Pay
          </button>
        )}

        {!isPending && (
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        )}

        {isPending && (isRequest && isSender) && (
          <Clock className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
    </div>
  );
}
