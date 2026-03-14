/**
 * OrbitWalletCard — Prominent wallet card for OrbitHome
 * Shows balance, quick actions, and detected currency
 */
import { motion } from "framer-motion";
import {
  Wallet, Send, ArrowDownLeft, QrCode, ScanLine,
  History, Settings, Coins,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@/hooks/useWallet";
import { formatLocs, detectLocalCurrency } from "@/lib/orbit-payments";
import { SUPPORTED_CURRENCIES } from "@/lib/orbit-payments/types";
import { useAuth } from "@/contexts/AuthContext";

const QUICK_ACTIONS = [
  { icon: Send, label: "Send", key: "send" },
  { icon: ArrowDownLeft, label: "Receive", key: "receive" },
  { icon: ScanLine, label: "Scan", key: "scan" },
  { icon: QrCode, label: "My QR", key: "my_qr" },
];

export default function OrbitWalletCard() {
  const { balance, loading } = useWallet();
  const { userCurrency } = useAuth();
  const detected = detectLocalCurrency({ preferredCurrency: userCurrency || null, accountCountry: null });
  const currencyInfo = SUPPORTED_CURRENCIES[detected.code];
  const navigate = useNavigate();
  const [walletOpen, setWalletOpen] = useState(false);

  return (
    <div className="w-full max-w-md">
      {/* Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl p-5"
        style={{
          background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))",
        }}
      >
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-28 h-28 rounded-full -translate-y-8 translate-x-8" style={{ background: "hsl(var(--accent) / 0.1)" }} />
        <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full translate-y-6 -translate-x-6" style={{ background: "hsl(var(--accent) / 0.06)" }} />

        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5" style={{ color: "hsl(var(--accent))" }} />
              <span className="text-sm font-semibold text-primary-foreground/80">Orbit Wallet</span>
            </div>
            <button
              onClick={() => navigate("/dashboard/settings?section=wallet")}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-primary-foreground/60 hover:text-primary-foreground/90 transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="text-[10px] font-medium">Settings</span>
            </button>
          </div>

          {/* Balance */}
          <p className="text-3xl font-black text-primary-foreground tracking-tight">
            {loading ? "..." : formatLocs(balance?.balance || 0)}
          </p>

          {/* Currency info */}
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-primary-foreground/50">1 LOCS = 1 EUR</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full text-primary-foreground/70" style={{ background: "hsl(var(--accent) / 0.15)" }}>
              {currencyInfo?.symbol} {detected.code} detected
            </span>
          </div>

          {/* Quick Actions Row */}
          <div className="flex items-center gap-2 mt-4">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <motion.button
                  key={action.key}
                  whileTap={{ scale: 0.92 }}
                  className="flex flex-col items-center gap-1 flex-1 py-2 rounded-xl transition-colors"
                  style={{ background: "hsl(0 0% 100% / 0.1)" }}
                  onClick={() => navigate(`/dashboard/wallet?action=${action.key}`)}
                >
                  <Icon className="w-4 h-4 text-primary-foreground" />
                  <span className="text-[10px] font-semibold text-primary-foreground/80">{action.label}</span>
                </motion.button>
              );
            })}

            {/* History */}
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => navigate("/dashboard/wallet?action=history")}
              className="flex flex-col items-center gap-1 flex-1 py-2 rounded-xl transition-colors"
              style={{ background: "hsl(0 0% 100% / 0.1)" }}
            >
              <History className="w-4 h-4 text-primary-foreground" />
              <span className="text-[10px] font-semibold text-primary-foreground/80">History</span>
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
