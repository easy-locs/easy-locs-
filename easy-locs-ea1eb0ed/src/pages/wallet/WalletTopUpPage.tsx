import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { createWalletTopup } from "@/repositories/payments.repository";
import { toast } from "sonner";
import { Loader2, CreditCard, ArrowLeft, Smartphone, Wallet } from "lucide-react";
import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import { useWalletBalance } from "@/payments/wallet-hooks";
import { useUiEngine } from "@/hooks/useUiEngine";

const AMOUNTS = [50, 100, 200, 500, 1000];

type PayMethod = "card" | "apple_google";

export default function WalletTopUpPage() {
  useUiEngine("wallet-wallettopuppage");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();
  const { currency: walletCurrency } = useWalletBalance();
  const [amount, setAmount] = useState("100");
  const currency = walletCurrency || "AED";
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState<PayMethod>("card");

  const submit = async () => {
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
        payment_method_types: method === "apple_google"
          ? ["card", "apple_pay", "google_pay"]
          : ["card"],
      });

      if (!data?.url) throw new Error("No checkout URL returned");
      window.location.href = data.url;
    } catch (err: any) {
      console.error("[Wallet]", err.message);
      toast.error(t("wallet.walletNotReady") || "Wallet is not ready. Please try again.");
      setLoading(false);
    }
  };

  const methods: { key: PayMethod; icon: typeof CreditCard; label: string; desc: string }[] = [
    { key: "card", icon: CreditCard, label: t("wallet.card"), desc: t("wallet.cardDesc") },
    { key: "apple_google", icon: Smartphone, label: t("wallet.mobilePay"), desc: t("wallet.mobilePayDesc") },
  ];

  return (
    <div className="app-mobile-page app-mobile-content bg-background">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate("/wallet")}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center active:scale-[0.95] transition-transform"
        >
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">{t("wallet.topUpWallet")}</h1>
          <p className="text-xs text-muted-foreground">{t("wallet.addFunds")}</p>
        </div>
      </div>

      <div className="px-4 space-y-5" data-topup-content>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <p className="text-xs font-semibold text-muted-foreground mb-2">{t("wallet.paymentMethod")}</p>
          <div className="grid grid-cols-2 gap-2">
            {methods.map((m) => {
              const Icon = m.icon;
              const active = method === m.key;
              return (
                <motion.button
                  key={m.key}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setMethod(m.key)}
                  className={`flex items-center gap-2.5 rounded-2xl border p-3 text-left transition-colors ${
                    active
                      ? "border-primary bg-primary/5"
                      : "border-border/30 bg-card hover:bg-accent/5"
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    active ? "bg-primary/10" : "bg-muted"
                  }`}>
                    <Icon className={`w-4 h-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground">{m.label}</p>
                    <p className="text-[10px] text-muted-foreground">{m.desc}</p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">{t("wallet.amount")}</p>
          <div className="rounded-2xl bg-card border border-border/10 p-6 text-center">
            <div className="flex items-center justify-center gap-3">
              <span className="text-lg text-muted-foreground font-bold whitespace-nowrap shrink-0">{currency}</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="1"
                max="50000"
                placeholder="0"
                className="text-4xl font-extrabold text-foreground text-center bg-transparent outline-none w-[160px] tabular-nums"
                style={{ WebkitAppearance: "none", MozAppearance: "textfield" } as any}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            {AMOUNTS.map((a) => (
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

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <button
            onClick={submit}
            disabled={loading || !amount || Number(amount) < 1}
            className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3.5 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.97] transition-transform"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wallet className="h-4 w-4" />
            )}
            {loading ? t("wallet.redirecting") : `${t("wallet.topUp")} ${amount} ${currency}`}
          </button>
          <p className="text-[10px] text-muted-foreground/60 text-center leading-relaxed mt-2">
            {t("wallet.securePayNote")}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
