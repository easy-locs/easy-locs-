/**
 * SettingsPaymentMethods — Wallet Top-Up & Payment overview.
 * Users fund their LOCS wallet here for QR code payments.
 * Payment method acceptance (COD, card, Apple Pay, etc.) is decided per-platform by merchants.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, CreditCard, Wallet, Smartphone, Plus,
  QrCode, ShieldCheck, ArrowUpRight, Zap, Globe, Loader2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useWalletBalance } from "@/payments/wallet-hooks";
import { createWalletTopup } from "@/repositories/payments.repository";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n";

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

const QUICK_AMOUNTS = [50, 100, 200, 500, 1000];

type TopUpMethod = "card" | "mobile_pay";

function useTopUpMethods() {
  const { t } = useI18n();
  return [
    { key: "card" as TopUpMethod, icon: CreditCard, label: t("wallet.card"), desc: t("wallet.cardDesc") },
    { key: "mobile_pay" as TopUpMethod, icon: Smartphone, label: t("wallet.mobilePay"), desc: t("wallet.mobilePayDesc") },
  ];
}

export default function SettingsPaymentMethods() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();
  const { balance, currency: walletCurrency } = useWalletBalance();
  const currency = walletCurrency || "AED";
  const [amount, setAmount] = useState("100");
  const topUpMethods = useTopUpMethods();
  const [method, setMethod] = useState<TopUpMethod>("card");
  const [loading, setLoading] = useState(false);

  const handleTopUp = async () => {
    const num = Number(amount);
    if (!user?.id || !num || num < 1 || num > 50000) {
      toast.error(t("wallet.invalidTopUpAmount"));
      return;
    }

    setLoading(true);
    try {
      const data = await createWalletTopup({
        amount: num,
        currency,
        payment_method_types: method === "mobile_pay"
          ? ["card", "apple_pay", "google_pay"]
          : ["card"],
      });

      if (!data?.url) throw new Error("No checkout URL returned");
      window.location.href = data.url;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Top up failed";
      toast.error(message);
      setLoading(false);
    }
  };

  return (
    <div className="app-mobile-page bg-background">
      <header className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-transform bg-muted"
        >
          <ArrowLeft className="w-4.5 h-4.5 text-foreground" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">{t("wallet.topUpTitle")}</h1>
          <p className="text-[11px] text-muted-foreground">{t("wallet.topUpSubtitle")}</p>
        </div>
      </header>

      <div className="px-4 space-y-5">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl p-5 relative overflow-hidden"
          style={{ background: "linear-gradient(145deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))" }}
        >
          <div className="absolute inset-0 opacity-10" style={{ background: "radial-gradient(circle at 80% 20%, white, transparent 60%)" }} />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-4 h-4 text-primary-foreground/70" />
              <span className="text-xs font-semibold text-primary-foreground/70">{t("wallet.locsBalance")}</span>
            </div>
            <p className="text-3xl font-black text-primary-foreground tabular-nums">
              {formatCurrency(balance, currency)}
            </p>
            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={() => navigate("/wallet/transfer")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold text-primary-foreground/90 bg-white/15 active:scale-95 transition-transform"
              >
                <ArrowUpRight className="w-3 h-3" />
                {t("wallet.send")}
              </button>
              <button
                onClick={() => navigate("/wallet/request")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold text-primary-foreground/90 bg-white/15 active:scale-95 transition-transform"
              >
                <QrCode className="w-3 h-3" />
                {t("wallet.receive")}
              </button>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
            {t("wallet.topUpMethod")}
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {topUpMethods.map((m) => {
              const Icon = m.icon;
              const active = method === m.key;
              return (
                <motion.button
                  key={m.key}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setMethod(m.key)}
                  className="flex items-center gap-2.5 rounded-2xl border p-3.5 text-left transition-all"
                  style={{
                    background: active ? "hsl(var(--primary) / 0.06)" : "hsl(var(--card))",
                    borderColor: active ? "hsl(var(--primary) / 0.3)" : "hsl(var(--border) / 0.15)",
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: active ? "hsl(var(--primary) / 0.12)" : "hsl(var(--muted))" }}
                  >
                    <Icon className="w-4.5 h-4.5" style={{ color: active ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground">{m.label}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">{m.desc}</p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
            {t("wallet.topUpAmount")}
          </p>
          <div className="rounded-2xl bg-card border border-border/10 p-5 text-center">
            <div className="flex items-center justify-center gap-3">
              <span className="text-lg text-muted-foreground font-bold shrink-0">{currency}</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="1"
                max="50000"
                placeholder="0"
                className="text-4xl font-black text-foreground text-center bg-transparent outline-none w-[160px] tabular-nums"
                style={{ WebkitAppearance: "none", MozAppearance: "textfield" } as React.CSSProperties}
              />
            </div>
            {Number(amount) > 0 && (
              <p className="text-[11px] text-muted-foreground mt-2">
                {t("wallet.newBalance")}: {formatCurrency(balance + Number(amount), currency)}
              </p>
            )}
          </div>
          <div className="flex gap-2 mt-3">
            {QUICK_AMOUNTS.map((a) => (
              <button
                key={a}
                onClick={() => setAmount(String(a))}
                className="flex-1 py-2.5 rounded-xl text-[11px] font-bold transition-all active:scale-95"
                style={{
                  background: Number(amount) === a ? "hsl(var(--primary))" : "hsl(var(--muted) / 0.5)",
                  color: Number(amount) === a ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))",
                }}
              >
                {a}
              </button>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <button
            onClick={handleTopUp}
            disabled={loading || !amount || Number(amount) < 1}
            className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-4 text-sm font-bold flex items-center justify-center gap-2.5 disabled:opacity-50 active:scale-[0.97] transition-transform"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4.5 w-4.5" />
            )}
            {loading
              ? (t("wallet.redirecting"))
              : `${t("wallet.topUp")} ${Number(amount) > 0 ? formatCurrency(Number(amount), currency) : ""}`
            }
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-border/10 bg-card/60 p-4 space-y-3"
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {t("wallet.whyTopUp")}
          </p>
          <div className="space-y-2.5">
            {[
              { icon: QrCode, text: t("wallet.qrPayments") },
              { icon: Zap, text: t("wallet.zeroFeeTransfers") },
              { icon: ShieldCheck, text: t("wallet.secureEncrypted") },
              { icon: Globe, text: t("wallet.multiCurrency") },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "hsl(var(--primary) / 0.08)" }}>
                  <item.icon className="w-3.5 h-3.5" style={{ color: "hsl(var(--primary))" }} />
                </div>
                <p className="text-[11px] text-muted-foreground leading-tight">{item.text}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <p className="text-[10px] text-muted-foreground/50 text-center leading-relaxed pb-4">
          {t("wallet.topUpNote")}
        </p>
      </div>
    </div>
  );
}
