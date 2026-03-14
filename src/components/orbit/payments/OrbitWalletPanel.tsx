/**
 * OrbitWalletPanel — Wallet balance overview with purchase CTA
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Wallet, Plus, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWallet } from "@/hooks/useWallet";
import { formatLocs, detectLocalCurrency, SUPPORTED_CURRENCIES } from "@/lib/orbit-payments";

export default function OrbitWalletPanel() {
  const { balance, loading, purchaseLocs } = useWallet();
  const detected = detectLocalCurrency();
  const [buyAmount, setBuyAmount] = useState("");
  const [buyCurrency, setBuyCurrency] = useState(detected.code);
  const [purchasing, setPurchasing] = useState(false);

  const handlePurchase = async () => {
    const num = parseFloat(buyAmount);
    if (!num || num < 1) return;
    setPurchasing(true);
    await purchaseLocs(num, buyCurrency);
    setPurchasing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col gap-5 p-4"
    >
      {/* Balance card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-6 text-primary-foreground">
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-accent/10 -translate-y-8 translate-x-8" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="w-5 h-5 text-accent" />
            <span className="text-sm font-medium opacity-80">LOCS Wallet</span>
          </div>
          <p className="text-3xl font-black">
            {loading ? "..." : formatLocs(balance?.balance || 0)}
          </p>
          <div className="flex items-center gap-4 mt-3 text-xs opacity-70">
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Purchased: {(balance?.total_purchased || 0).toFixed(0)}
            </span>
            <span className="flex items-center gap-1">
              <TrendingDown className="w-3 h-3" />
              Spent: {(balance?.total_spent || 0).toFixed(0)}
            </span>
          </div>
          {(balance?.frozen_balance || 0) > 0 && (
            <p className="mt-2 text-xs opacity-60">
              🔒 Frozen: {formatLocs(balance!.frozen_balance)}
            </p>
          )}
        </div>
      </div>

      {/* Quick purchase */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Buy LOCS</h3>
        <p className="text-xs text-muted-foreground">1 LOCS = 1 EUR (2% FX spread on non-EUR)</p>

        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Amount"
            value={buyAmount}
            onChange={(e) => setBuyAmount(e.target.value)}
            className="flex-1 bg-card border-border"
            min="1"
          />
          <select
            value={buyCurrency}
            onChange={(e) => setBuyCurrency(e.target.value)}
            className="w-20 rounded-lg bg-card border border-border text-sm px-2 text-foreground"
          >
            {Object.entries(SUPPORTED_CURRENCIES).map(([code, info]) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </div>

        <Button
          onClick={handlePurchase}
          disabled={!buyAmount || parseFloat(buyAmount) < 1 || purchasing}
          className="w-full rounded-xl bg-accent text-accent-foreground hover:bg-accent/90"
        >
          {purchasing ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Plus className="w-4 h-4 mr-2" />
          )}
          {purchasing ? "Redirecting..." : "Purchase LOCS"}
        </Button>
      </div>
    </motion.div>
  );
}
