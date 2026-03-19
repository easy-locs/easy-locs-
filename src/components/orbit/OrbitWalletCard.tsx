/**
 * OrbitWalletCard — Compact wallet preview for OrbitHome
 * Balance always stays on ONE line
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Wallet, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@/hooks/useWallet";
import { formatLocs } from "@/lib/orbit-payments";
import { usePlatformCurrency } from "@/hooks/usePlatformCurrency";

export default function OrbitWalletCard() {
  const { balance, loading } = useWallet();
  const { code, symbol, fmtLocal } = usePlatformCurrency();
  const navigate = useNavigate();
  const [showLocs, setShowLocs] = useState(false);

  const bal = balance?.balance || 0;
  const displayBalance = showLocs ? formatLocs(bal) : fmtLocal(bal);

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate("/wallet/hub")}
      className="w-full text-left"
    >
      <div
        className="relative overflow-hidden rounded-2xl p-4"
        style={{
          background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))",
        }}
      >
        {/* Decorative */}
        <div className="absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-8 translate-x-8" style={{ background: "hsl(var(--accent) / 0.1)" }} />

        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4" style={{ color: "hsl(var(--accent))" }} />
              <span className="text-[11px] font-bold text-primary-foreground/70 uppercase tracking-wider">
                Orbit Wallet
              </span>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setShowLocs(v => !v); }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-primary-foreground/60 hover:text-primary-foreground transition-colors active:scale-95"
              style={{ background: "hsl(0 0% 100% / 0.1)" }}
            >
              <RefreshCw className="w-2.5 h-2.5" />
              <span className="text-[9px] font-bold">{showLocs ? code : "LOCS"}</span>
            </button>
          </div>

          {/* Balance — ALWAYS ONE LINE */}
          <p
            className="font-black text-primary-foreground tracking-tight leading-none whitespace-nowrap overflow-hidden text-ellipsis"
            style={{ fontSize: "clamp(1.25rem, 7vw, 2rem)" }}
          >
            {loading ? "..." : displayBalance}
          </p>

          <p className="text-[9px] text-primary-foreground/40 mt-1.5">
            1 LOCS = 1 EUR · {showLocs ? "LOCS" : `${symbol} ${code}`}
          </p>
        </div>
      </div>
    </motion.button>
  );
}
