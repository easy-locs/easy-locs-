/**
 * ReceiveQrPanel — Direct "My QR" with amount/currency selection + copy/share.
 * No intermediate screen. Uses the unified QR engine.
 */
import { useState, useMemo } from "react";
import { Copy, Check, Share2 } from "lucide-react";
import QRCode from "react-qr-code";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { qr, toResolveUrl } from "@/lib/qr-engine";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const CURRENCIES = ["AED", "USD", "EUR", "GBP", "MAD"];

export default function ReceiveQrPanel() {
  const { user } = useAuth();
  const [amount, setAmount] = useState<string>("");
  const [currency, setCurrency] = useState("AED");
  const [copied, setCopied] = useState(false);

  const displayName = user?.user_metadata?.name || user?.email?.split("@")[0] || "Me";

  const payload = useMemo(() => {
    const numAmount = parseFloat(amount);
    if (numAmount > 0) {
      return qr.payUser(user?.id || "", { amount: numAmount, currency, name: displayName });
    }
    return qr.payUser(user?.id || "", { name: displayName });
  }, [user?.id, amount, currency, displayName]);

  const link = useMemo(() => toResolveUrl(payload), [payload]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!navigator.share) return;
    const numAmount = parseFloat(amount);
    const text = numAmount > 0
      ? `Pay ${displayName} ${formatMoney(numAmount, currency)}`
      : `Pay ${displayName}`;
    try {
      await navigator.share({ title: text, url: link });
    } catch {
      // cancelled
    }
  };

  if (!user?.id) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">Sign in to generate your QR code.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-5"
    >
      {/* QR Code */}
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          My Payment QR
        </p>
        <div className="rounded-xl bg-white p-4">
          <QRCode value={link} size={180} level="M" />
        </div>
        <p className="text-sm font-semibold text-foreground">{displayName}</p>
        {parseFloat(amount) > 0 && (
          <p className="text-lg font-bold text-foreground">
            {formatMoney(parseFloat(amount), currency)}
          </p>
        )}
      </div>

      {/* Amount + Currency */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
          Amount (optional)
        </p>
        <div className="flex gap-2">
          <Input
            type="number"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="flex-1 rounded-xl"
          />
          <div className="flex gap-1">
            {CURRENCIES.slice(0, 3).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCurrency(c)}
                className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
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
        {/* More currencies */}
        <div className="flex gap-1">
          {CURRENCIES.slice(3).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCurrency(c)}
              className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
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

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1 rounded-xl gap-2"
          onClick={handleCopy}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy link"}
        </Button>
        {"share" in navigator && (
          <Button
            variant="outline"
            className="flex-1 rounded-xl gap-2"
            onClick={handleShare}
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        )}
      </div>
    </motion.div>
  );
}
