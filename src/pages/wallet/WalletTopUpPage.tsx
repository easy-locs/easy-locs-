import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CreditCard, ArrowLeft } from "lucide-react";

const AMOUNTS = [50, 100, 200, 500, 1000];

export default function WalletTopUpPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [amount, setAmount] = useState("100");
  const [currency] = useState("AED");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const num = Number(amount);
    if (!user?.id || !num || num < 1 || num > 50000) {
      toast.error("Invalid amount (1–50,000)");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-wallet-topup", {
        body: { amount: num, currency },
      });

      if (error) throw error;
      if (!data?.url) throw new Error("No checkout URL returned");

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err: any) {
      toast.error(err.message || "Top up failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate("/wallet/hub")}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center active:scale-[0.95] transition-transform"
        >
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Top Up Wallet</h1>
          <p className="text-xs text-muted-foreground">Add funds via card payment</p>
        </div>
      </div>

      <div className="px-4 space-y-5">
        {/* Quick amounts */}
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

        {/* Custom amount */}
        <div className="space-y-1.5">
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
        </div>

        <button
          onClick={submit}
          disabled={loading || !amount || Number(amount) < 1}
          className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3.5 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.97] transition-transform"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CreditCard className="h-4 w-4" />
          )}
          {loading ? "Redirecting to payment…" : `Top Up ${amount} ${currency}`}
        </button>

        <p className="text-xs text-muted-foreground/60 text-center">
          Secure payment via Stripe. Your wallet will be credited automatically.
        </p>
      </div>
    </div>
  );
}
