import { memo, useMemo } from "react";
import { Link } from "react-router-dom";
import { Wallet, QrCode, Send, ArrowDownLeft, ScanLine, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { useWalletBalance } from "@/payments/wallet-hooks";
import { useCanonicalIdentity } from "@/hooks/useCanonicalIdentity";
import { useForexRates } from "@/hooks/useForexRates";

interface WalletCardProps {
  compact?: boolean;
  showQr?: boolean;
  className?: string;
}

function WalletCardInner({ compact = false, showQr = true, className = "" }: WalletCardProps) {
  const { balance, currency, loading } = useWalletBalance();
  const identity = useCanonicalIdentity();
  const { rates, source } = useForexRates();

  const localConversion = useMemo(() => {
    if (!rates || !identity.currency || identity.currency === currency) return null;
    const key = `${currency}/${identity.currency}`;
    const rate = rates?.[key];
    if (!rate || !balance) return null;
    return {
      amount: (balance * rate).toFixed(2),
      currency: identity.currency,
      rate: rate.toFixed(4),
    };
  }, [rates, identity.currency, currency, balance]);

  const quickActions = [
    { icon: Send, label: "Send", to: "/wallet/transfer" },
    { icon: ArrowDownLeft, label: "Receive", to: "/wallet?tab=receive" },
    { icon: ScanLine, label: "Scan", to: "/payments/scan" },
    { icon: TrendingUp, label: "Top Up", to: "/wallet/topup" },
  ];

  return (
    <motion.div
      className={`relative overflow-hidden rounded-2xl border border-border/10 bg-gradient-to-br from-[hsl(var(--brand-primary)/0.15)] to-[hsl(var(--brand-primary)/0.05)] p-4 ${className}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-[hsl(var(--brand-primary))]" />
          <span className="text-sm font-semibold text-foreground/70">
            {identity.displayName}
          </span>
        </div>
        {showQr && (
          <Link to="/wallet?tab=receive" className="p-1.5 rounded-lg bg-background/60 hover:bg-background/80 transition-colors">
            <QrCode className="h-4 w-4 text-foreground/60" />
          </Link>
        )}
      </div>

      <div className="mb-1">
        {loading ? (
          <div className="h-8 w-32 rounded skeleton-premium" />
        ) : (
          <p className="text-2xl font-bold tracking-tight text-foreground">
            {balance?.toFixed(2) ?? "0.00"}{" "}
            <span className="text-base font-medium text-foreground/60">{currency ?? "EUR"}</span>
          </p>
        )}
      </div>

      {localConversion && (
        <p className="text-xs text-foreground/50 mb-3">
          ≈ {localConversion.amount} {localConversion.currency}
        </p>
      )}

      {!compact && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              to={action.to}
              className="flex flex-col items-center gap-1 p-2 rounded-xl bg-background/40 hover:bg-background/70 transition-colors active:scale-95"
            >
              <action.icon className="h-4 w-4 text-[hsl(var(--brand-primary))]" />
              <span className="text-[10px] font-medium text-foreground/70">{action.label}</span>
            </Link>
          ))}
        </div>
      )}
    </motion.div>
  );
}

const WalletCard = memo(WalletCardInner);
export default WalletCard;
