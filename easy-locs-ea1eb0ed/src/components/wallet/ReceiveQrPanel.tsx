import { useMemo, useState } from "react";
import { Copy, Check, Share2 } from "lucide-react";
import BrandedQR from "@/components/qr/BrandedQR";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useAccountIdentity } from "@/hooks/useAccountIdentity";
import { qr, toResolveUrl } from "@/lib/qr-engine";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { useWalletBalance } from "@/payments/wallet-hooks";
import { getWalletDefaultCurrency } from "@/lib/wallet/wallet-config";

const NAVY = "hsl(226 24% 11%)";
const GOLD = "hsl(var(--accent))";

const QUICK_AMOUNTS = [5, 10, 20, 50, 100, 250];

export default function ReceiveQrPanel() {
  const { user, userCurrency } = useAuth();
  const { displayName } = useAccountIdentity();
  const { currency: walletCurrency } = useWalletBalance();
  const [amount, setAmount] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const currency = walletCurrency || userCurrency || getWalletDefaultCurrency();

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

  const handleQuickAmount = (val: number) => {
    setAmount(prev => prev === String(val) ? "" : String(val));
  };

  if (!user?.id) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">Sign in to generate your QR code.</p>
      </div>
    );
  }

  const numAmount = parseFloat(amount);
  const hasAmount = numAmount > 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-5"
    >
      <div
        className="flex flex-col items-center gap-4 rounded-3xl p-8 relative overflow-hidden"
        style={{
          background: `linear-gradient(160deg, ${NAVY}, hsl(226 22% 15%), hsl(226 20% 18%))`,
        }}
      >
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full pointer-events-none" style={{
          background: `radial-gradient(circle, hsl(var(--accent) / 0.12), transparent 70%)`,
        }} />

        <p className="text-[10px] font-bold uppercase tracking-[0.2em] relative z-10" style={{ color: "hsl(var(--accent) / 0.6)" }}>
          My Payment QR
        </p>

        <div className="relative z-10 bg-white rounded-2xl p-3">
          <BrandedQR value={link} size={200} />
        </div>

        <div className="text-center relative z-10">
          <p className="text-base font-bold" style={{ color: "hsl(0 0% 100%)" }}>{displayName}</p>
          <p className="text-[10px] mt-0.5" style={{ color: "hsl(0 0% 100% / 0.4)" }}>Easy-Locs Wallet · {currency}</p>
        </div>

        {hasAmount && (
          <motion.p
            key={amount}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-2xl font-extrabold tabular-nums relative z-10"
            style={{ color: GOLD }}
          >
            {formatMoney(numAmount, currency)}
          </motion.p>
        )}
      </div>

      <div className="space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">
          Request amount (optional)
        </p>

        <div className="flex flex-wrap gap-2">
          {QUICK_AMOUNTS.map(val => {
            const active = amount === String(val);
            return (
              <button
                key={val}
                type="button"
                onClick={() => handleQuickAmount(val)}
                className="px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
                style={{
                  background: active ? GOLD : "hsl(var(--muted) / 0.5)",
                  color: active ? NAVY : "hsl(var(--foreground))",
                  border: active ? "none" : "1px solid hsl(var(--border) / 0.3)",
                }}
              >
                {val}
              </button>
            );
          })}
        </div>

        <div className="flex gap-2 items-center">
          <input
            type="number"
            inputMode="decimal"
            placeholder="Custom amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="flex-1 rounded-xl h-12 text-lg font-bold bg-card border border-border/10 px-4 outline-none text-foreground focus:border-accent/30"
            style={{ fontSize: "16px" }}
          />
          <div className="px-4 py-3 rounded-xl text-xs font-bold whitespace-nowrap shrink-0" style={{ background: "hsl(var(--accent) / 0.1)", color: GOLD }}>
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
