/**
 * WalletIncentiveBanner — Shows cashback/quick-pay incentives when wallet usage is low.
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, X, Zap } from "lucide-react";
import { getBusinessEngineState } from "@/lib/engines/autonomous-business-engine";

export function WalletIncentiveBanner() {
  const navigate = useNavigate();
  const [incentive, setIncentive] = useState<{ title: string; description: string } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const s = getBusinessEngineState();
    if (s.walletIncentives.length > 0) {
      setIncentive(s.walletIncentives[0]);
    }
  }, []);

  if (!incentive || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="rounded-2xl p-4 relative overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
        style={{
          background: "linear-gradient(135deg, hsl(142, 71%, 45%), hsl(160, 60%, 35%))",
        }}
        onClick={() => navigate("/wallet/hub")}
      >
        <button
          onClick={(e) => { e.stopPropagation(); setDismissed(true); }}
          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center"
        >
          <X className="w-3 h-3 text-white" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">{incentive.title}</p>
            <p className="text-[11px] text-white/70">{incentive.description}</p>
          </div>
          <Zap className="w-5 h-5 text-white/80 animate-pulse shrink-0" />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
