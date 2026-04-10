import { useMemo, useState } from "react";
import { Copy, Check, Share2 } from "lucide-react";
import BrandedQR from "@/components/qr/BrandedQR";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { qr, toResolveUrl } from "@/lib/qr-engine";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWalletBalance } from "@/payments/wallet-hooks";
import { getWalletDefaultCurrency } from "@/lib/wallet/wallet-config";

export default function ReceiveQrPanel() {
  const { user, userCurrency } = useAuth();
  const { currency: walletCurrency } = useWalletBalance();
  const [amount, setAmount] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const currency = walletCurrency || userCurrency || getWalletDefaultCurrency();
  const displayName = user?.user_metadata?.name || "Me";

  const payload = useMemo(() => {
    const numAmount = parseFloat(amount);
    if (numAmount > 0) {
      return qr.payUser(user?.id || "", { amount: numAmount, currency, name: displayName });
    }
    return qr.payUser(user?.id || "", { name: displayName });
  }, [user?.id, amount, currency, displayName]);

  const link = useMemo(() => toResolveUrl(payload), [payload]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = link;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
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
    } catch {}
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
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-border/20 bg-card p-8">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
          My Payment QR
        </p>
        <BrandedQR value={link} size={220} />
        <div className="text-center">
          <p className="text-base font-bold text-foreground">{displayName}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Easy-Locs Wallet · {currency}</p>
        </div>
        {parseFloat(amount) > 0 && (
          <p className="text-2xl font-black text-foreground tabular-nums">
            {formatMoney(parseFloat(amount), currency)}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
          Request amount (optional)
        </p>
        <div className="flex gap-2 items-center">
          <Input
            type="number"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="flex-1 rounded-xl h-12 text-lg font-bold"
          />
          <div className="px-4 py-3 rounded-xl bg-primary/10 text-primary text-xs font-black whitespace-nowrap shrink-0">
            {currency}
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1 rounded-xl gap-2 h-12" onClick={handleCopy}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy link"}
        </Button>
        {"share" in navigator && (
          <Button variant="outline" className="flex-1 rounded-xl gap-2 h-12" onClick={handleShare}>
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        )}
      </div>
    </motion.div>
  );
}
