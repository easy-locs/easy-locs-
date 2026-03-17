/**
 * UniversalActionSheet — Fast-entry bottom sheet for Pay / Receive / Request.
 * Used by WalletHub and anywhere needing direct payment entry.
 */
import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { QrCode, Link2, Users, Copy, Share2, ArrowRight, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { usePlatformCurrency } from "@/hooks/usePlatformCurrency";
import { createPaymentRequest } from "@/payments/payment-request-hooks";
import { QRCodeSVG } from "qrcode.react";

export type ActionSheetMode = "pay" | "receive" | "request";

interface Props {
  mode: ActionSheetMode;
  onClose?: () => void;
}

const CURRENCY_OPTIONS = ["AED", "EUR", "USD", "GBP", "MAD", "SAR", "LOCS"];

export default function UniversalActionSheet({ mode, onClose }: Props) {
  switch (mode) {
    case "pay":
      return <PayMode onClose={onClose} />;
    case "receive":
      return <ReceiveMode />;
    case "request":
      return <RequestMode />;
  }
}

/* ═══════════════════════════════════════════════════
   PAY MODE
   ═══════════════════════════════════════════════════ */
function PayMode({ onClose }: { onClose?: () => void }) {
  const navigate = useNavigate();

  const actions = [
    {
      icon: <QrCode className="h-6 w-6" />,
      label: "Scan QR",
      desc: "Point camera at a QR code",
      onClick: () => navigate("/pay/scan"),
    },
    {
      icon: <Link2 className="h-6 w-6" />,
      label: "Payment Link",
      desc: "Paste or open a payment link",
      onClick: () => {
        const link = window.prompt("Paste payment link:");
        if (link?.trim()) {
          try {
            const url = new URL(link.trim());
            navigate(url.pathname + url.search);
          } catch {
            toast.error("Invalid payment link");
          }
        }
      },
    },
    {
      icon: <Users className="h-6 w-6" />,
      label: "Choose Contact",
      desc: "Send to a saved contact",
      onClick: () => navigate("/client/messages"),
    },
  ];

  return (
    <div className="space-y-3">
      {actions.map((a) => (
        <button
          key={a.label}
          onClick={a.onClick}
          className="w-full flex items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:bg-accent/5 active:scale-[0.98]"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
            {a.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">{a.label}</p>
            <p className="text-[11px] text-muted-foreground">{a.desc}</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </button>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   RECEIVE MODE
   ═══════════════════════════════════════════════════ */
function ReceiveMode() {
  const { user } = useAuth();
  const { code: defaultCurrency } = usePlatformCurrency();
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(defaultCurrency || "AED");
  const [copied, setCopied] = useState(false);

  const qrValue = useMemo(() => {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    const numAmount = parseFloat(amount);
    const params = new URLSearchParams();
    params.set("action", "pay_user");
    params.set("userId", user?.id || "");
    if (numAmount > 0) params.set("amount", String(numAmount));
    params.set("currency", currency);
    return `${base}/qr/resolve?${params.toString()}`;
  }, [user?.id, amount, currency]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(qrValue);
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  }, [qrValue]);

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Pay me", url: qrValue });
      } catch {
        // user cancelled
      }
    } else {
      handleCopy();
    }
  }, [qrValue, handleCopy]);

  return (
    <div className="space-y-5">
      {/* QR Code */}
      <div className="flex justify-center">
        <div className="rounded-2xl bg-white p-4">
          <QRCode value={qrValue} size={200} level="M" />
        </div>
      </div>

      {/* Amount + Currency */}
      <div className="flex gap-2">
        <input
          type="number"
          inputMode="decimal"
          placeholder="Amount (optional)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="flex-1 rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
        />
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="rounded-xl border border-border bg-muted/50 px-3 py-3 text-sm text-foreground outline-none focus:border-primary"
        >
          {CURRENCY_OPTIONS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1 gap-2" onClick={handleCopy}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy Link"}
        </Button>
        <Button className="flex-1 gap-2" onClick={handleShare}>
          <Share2 className="h-4 w-4" />
          Share
        </Button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   REQUEST MODE
   ═══════════════════════════════════════════════════ */
function RequestMode() {
  const { user } = useAuth();
  const { code: defaultCurrency } = usePlatformCurrency();
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(defaultCurrency || "AED");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [requestUrl, setRequestUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = useCallback(async () => {
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
        requester_id: user.id,
        amount: numAmount,
        currency,
        note: note.trim() || undefined,
      });

      if (req?.id) {
        const base = typeof window !== "undefined" ? window.location.origin : "";
        setRequestUrl(`${base}/pay/request/${req.id}`);
      }
    } catch (err) {
      console.error("[request-payment]", err);
      toast.error("Failed to create request");
    } finally {
      setLoading(false);
    }
  }, [amount, currency, note, user?.id]);

  const handleCopy = useCallback(async () => {
    if (!requestUrl) return;
    try {
      await navigator.clipboard.writeText(requestUrl);
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  }, [requestUrl]);

  const handleShare = useCallback(async () => {
    if (!requestUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Payment Request", url: requestUrl });
      } catch { /* cancelled */ }
    } else {
      handleCopy();
    }
  }, [requestUrl, handleCopy]);

  if (requestUrl) {
    return (
      <div className="space-y-5">
        <div className="flex justify-center">
          <div className="rounded-2xl bg-white p-4">
            <QRCode value={requestUrl} size={200} level="M" />
          </div>
        </div>

        <div className="rounded-xl bg-muted/50 p-3 text-center">
          <p className="text-lg font-bold text-foreground">
            {parseFloat(amount)} {currency}
          </p>
          {note && <p className="text-xs text-muted-foreground mt-1">{note}</p>}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 gap-2" onClick={handleCopy}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy Link"}
          </Button>
          <Button className="flex-1 gap-2" onClick={handleShare}>
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>

        <Button
          variant="ghost"
          className="w-full text-muted-foreground"
          onClick={() => {
            setRequestUrl(null);
            setAmount("");
            setNote("");
          }}
        >
          Create Another
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Amount + Currency */}
      <div className="flex gap-2">
        <input
          type="number"
          inputMode="decimal"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="flex-1 rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
          autoFocus
        />
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="rounded-xl border border-border bg-muted/50 px-3 py-3 text-sm text-foreground outline-none focus:border-primary"
        >
          {CURRENCY_OPTIONS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Note */}
      <input
        type="text"
        placeholder="Note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="w-full rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
      />

      {/* Generate */}
      <Button
        className="w-full h-12 text-base font-semibold gap-2"
        onClick={handleGenerate}
        disabled={loading || !amount}
      >
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
        {loading ? "Generating..." : "Generate Request"}
      </Button>
    </div>
  );
}
