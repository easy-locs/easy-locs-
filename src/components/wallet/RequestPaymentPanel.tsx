/**
 * RequestPaymentPanel — Create a payment request with amount/currency/note.
 * Generates QR + link + share options. Uses the canonical payment-request-hooks.
 */
import { useState, useMemo } from "react";
import { Copy, Check, Share2, Loader2, QrCode } from "lucide-react";
import QRCode from "react-qr-code";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { createPaymentRequest } from "@/payments/payment-request-hooks";
import { qr, toResolveUrl } from "@/lib/qr-engine";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const CURRENCIES = ["AED", "USD", "EUR", "GBP", "MAD"];

type CreatedRequest = {
  id: string;
  amount: number;
  currency: string;
  title: string | null;
};

export default function RequestPaymentPanel() {
  const { user } = useAuth();
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("AED");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<CreatedRequest | null>(null);
  const [copied, setCopied] = useState(false);

  const link = useMemo(() => {
    if (!created) return "";
    return toResolveUrl(qr.paymentRequest(created.id));
  }, [created]);

  const handleCreate = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!user?.id) {
      toast.error("Please sign in first");
      return;
    }

    setLoading(true);
    try {
      const req = await createPaymentRequest({
        requesterId: user.id,
        amount: numAmount,
        currency,
        title: note.trim() || null,
        contextType: "generic",
      });
      setCreated({
        id: req.id,
        amount: req.amount,
        currency: req.currency,
        title: req.title,
      });
      toast.success("Payment request created");
    } catch (e) {
      console.error("[request-payment]", e);
      toast.error("Failed to create request");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!navigator.share || !created) return;
    try {
      await navigator.share({
        title: `Payment request — ${formatMoney(created.amount, created.currency)}`,
        text: created.title || `Pay ${formatMoney(created.amount, created.currency)}`,
        url: link,
      });
    } catch {
      // cancelled
    }
  };

  const handleReset = () => {
    setCreated(null);
    setAmount("");
    setNote("");
    setCopied(false);
  };

  if (!user?.id) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">Sign in to create payment requests.</p>
      </div>
    );
  }

  // ── Created state: show QR + share ──
  if (created) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-5"
      >
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Payment Request
          </p>
          <div className="rounded-xl bg-white p-4">
            <QRCode value={link} size={180} level="M" />
          </div>
          <p className="text-2xl font-bold text-foreground">
            {formatMoney(created.amount, created.currency)}
          </p>
          {created.title && (
            <p className="text-sm text-muted-foreground">{created.title}</p>
          )}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 rounded-xl gap-2" onClick={handleCopy}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy link"}
          </Button>
          {"share" in navigator && (
            <Button variant="outline" className="flex-1 rounded-xl gap-2" onClick={handleShare}>
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          )}
        </div>

        <Button
          variant="ghost"
          className="w-full text-muted-foreground"
          onClick={handleReset}
        >
          Create another request
        </Button>
      </motion.div>
    );
  }

  // ── Form state ──
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      {/* Amount */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
          Amount
        </label>
        <Input
          type="number"
          inputMode="decimal"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="rounded-xl text-lg font-bold h-14"
          autoFocus
        />
      </div>

      {/* Currency */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
          Currency
        </label>
        <div className="flex flex-wrap gap-1.5">
          {CURRENCIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCurrency(c)}
              className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
                currency === c
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-foreground hover:bg-muted"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Note */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
          Note (optional)
        </label>
        <Input
          type="text"
          placeholder="e.g. Dinner split, Invoice #123"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="rounded-xl"
        />
      </div>

      {/* Create */}
      <Button
        className="w-full h-12 rounded-2xl text-base font-semibold gap-2"
        onClick={handleCreate}
        disabled={loading || !parseFloat(amount)}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <QrCode className="h-4 w-4" />
        )}
        {loading ? "Creating..." : "Create request"}
      </Button>
    </motion.div>
  );
}
