/**
 * WalletTopUpPage — Top up wallet via Stripe card, Apple Pay, Google Pay.
 * Uses Stripe Checkout which natively supports Apple Pay + Google Pay when enabled.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CreditCard, ArrowLeft, Smartphone, Wallet } from "lucide-react";
import { motion } from "framer-motion";

const AMOUNTS = [50, 100, 200, 500, 1000];

type PayMethod = "card" | "apple_google";

export default function WalletTopUpPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [amount, setAmount] = useState("100");
  const [currency] = useState("AED");
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState<PayMethod>("card");

  const submit = async () => {
    const num = Number(amount);
    if (!user?.id || !num || num < 1 || num > 50000) {
      toast.error("Invalid amount (1–50,000)");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-wallet-topup", {
        body: {
          amount: num,
          currency,
          // Stripe Checkout natively shows Apple Pay / Google Pay
          // when customer's device supports it — no extra config needed
          payment_method_types: method === "apple_google"
            ? ["card", "apple_pay", "google_pay"]
            : ["card"],
        },
      });

      if (error) throw error;
      if (!data?.url) throw new Error("No checkout URL returned");

      window.location.href = data.url;
    } catch (err: any) {
      toast.error(err.message || "Top up failed");
      setLoading(false);
    }
  };

  const methods: { key: PayMethod; icon: typeof CreditCard; label: string; desc: string }[] = [
    { key: "card", icon: CreditCard, label: "Card", desc: "Visa, Mastercard, etc." },
    { key: "apple_google", icon: Smartphone, label: "Mobile Pay", desc: "Apple Pay · Google Pay" },
  ];

  return (
    <div className="app-mobile-page app-mobile-content bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate("/wallet/hub")}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center active:scale-[0.95] transition-transform"
        >
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Top Up Wallet</h1>
          <p className="text-xs text-muted-foreground">Add funds to your wallet</p>
        </div>
      </div>

      <div className="px-4 space-y-5" data-topup-content>
        {/* Payment method selector */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Payment method</p>
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

        {/* Quick amounts */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Select amount</p>
          <div className="flex flex-wrap gap-2">
            {AMOUNTS.map((a) => (
              <button
                key={a}
                onClick={() => setAmount(String(a))}
                className={`rounded-xl px-4 py-2 text-sm font-medium border transition-colors active:scale-[0.97] ${
                  amount === String(a)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-foreground border-border/30 hover:bg-accent/5"
                }`}
              >
                {a} {currency}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Custom amount */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Custom amount</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="1"
            max="50000"
            placeholder="Amount"
            className="w-full rounded-xl border border-border/30 bg-card px-3 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
          />
        </motion.div>

        {/* Submit */}
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
          {loading ? "Redirecting to payment…" : `Top Up ${amount} ${currency}`}
        </button>

        <p className="text-[10px] text-muted-foreground/60 text-center leading-relaxed">
          Secure payment via Stripe. Apple Pay & Google Pay available on supported devices.
          Your wallet will be credited automatically.
        </p>
      </div>
    </div>
  );
}
