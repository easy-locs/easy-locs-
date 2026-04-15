import { useState } from "react";
import { X } from "lucide-react";
import { createPaymentRequest, type PaymentRequestRow } from "@/payments/payment-request-hooks";
import { useAuth } from "@/contexts/AuthContext";
import { tc } from "@/lib/i18n-canonical";

export function RequestMoneyModal({
  open,
  onClose,
  recipientId,
  contextId,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  recipientId?: string | null;
  contextId?: string | null;
  onCreated?: (request: PaymentRequestRow) => void | Promise<void>;
}) {
  const { user } = useAuth();
  const [amount, setAmount] = useState("");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const handleCreate = async () => {
    if (!user?.id || !amount) return;
    const num = parseFloat(amount);
    if (!num || num <= 0) { setError(tc("chat.invalid_amount")); return; }

    setLoading(true);
    setError("");
    try {
      const req = await createPaymentRequest({
        requesterId: user.id,
        recipientId: recipientId || null,
        amount: num,
        currency: "AED",
        title: title || tc("chat.payment_request"),
        subtitle: subtitle || null,
        contextType: "chat",
        contextId: contextId || null,
        metadata: { source: "chat" },
      });
      await onCreated?.(req);
      onClose();
      setAmount("");
      setTitle("");
      setSubtitle("");
    } catch (err: any) {
      setError(err?.message || tc("chat.request_failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-max bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={tc("chat.request_money")}>
      <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-md rounded-t-2xl border border-border/50 bg-background p-5 shadow-2xl animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">{tc("chat.request_money")}</h2>
          <button type="button" onClick={onClose} aria-label={tc("common.close")} className="rounded-full p-2 text-muted-foreground hover:bg-muted transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={tc("chat.amount_placeholder")}
            className="h-12 w-full rounded-2xl border border-border bg-card px-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-shadow"
            autoFocus
          />
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={tc("chat.title_placeholder")}
            className="h-11 w-full rounded-2xl border border-border bg-card px-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-shadow"
          />
          <input
            type="text"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder={tc("chat.note_placeholder")}
            className="h-11 w-full rounded-2xl border border-border bg-card px-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-shadow"
          />
        </div>

        {error && (
          <p className="mt-3 text-sm text-destructive" role="alert">{error}</p>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition-all duration-200 hover:bg-muted active:scale-[0.98] disabled:opacity-60"
          >
            {tc("common.cancel")}
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={loading || !amount}
            className="rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? tc("chat.creating") : tc("chat.create_request")}
          </button>
        </div>
      </div>
    </div>
  );
}
