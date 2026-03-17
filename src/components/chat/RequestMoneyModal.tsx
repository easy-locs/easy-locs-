/**
 * RequestMoneyModal — modal to create a payment request from chat or anywhere.
 */
import { useState } from "react";
import { X } from "lucide-react";
import { createPaymentRequest, type PaymentRequestRow } from "@/payments/payment-request-hooks";
import { useAuth } from "@/contexts/AuthContext";

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
  onCreated?: (request: PaymentRequestRow) => void;
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
    if (!num || num <= 0) { setError("Enter a valid amount"); return; }

    setLoading(true);
    setError("");
    try {
      const req = await createPaymentRequest({
        requesterId: user.id,
        recipientId: recipientId || null,
        amount: num,
        currency: "AED",
        title: title || "Payment request",
        subtitle: subtitle || null,
        contextType: "chat",
        contextId: contextId || null,
        metadata: { source: "chat" },
      });
      onCreated?.(req);
      onClose();
      setAmount("");
      setTitle("");
      setSubtitle("");
    } catch (err: any) {
      setError(err?.message || "Failed to create request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm">
      <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-md rounded-t-3xl border border-border/50 bg-background p-5 shadow-2xl animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">Request Money</h2>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-muted-foreground hover:bg-muted">
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
            placeholder="Amount (AED)"
            className="h-12 w-full rounded-2xl border border-border bg-card px-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            autoFocus
          />
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            className="h-11 w-full rounded-2xl border border-border bg-card px-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <input
            type="text"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="Note (optional)"
            className="h-11 w-full rounded-2xl border border-border bg-card px-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {error && (
          <p className="mt-3 text-sm text-destructive">{error}</p>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-muted disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={loading || !amount}
            className="rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Creating..." : "Create Request"}
          </button>
        </div>
      </div>
    </div>
  );
}
