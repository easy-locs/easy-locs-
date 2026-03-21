/**
 * CryptoWalletPanel — Crypto wallet balances, addresses, send/receive
 * Separate from fiat ledger — display only until crypto backend is connected.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, QrCode, ArrowUpRight, ArrowDownLeft, Wallet, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

interface CryptoAsset {
  symbol: string;
  name: string;
  balance: number;
  usdValue: number;
  address?: string;
  icon: string;
}

const MOCK_ASSETS: CryptoAsset[] = [
  { symbol: "BTC", name: "Bitcoin", balance: 0, usdValue: 0, icon: "₿" },
  { symbol: "ETH", name: "Ethereum", balance: 0, usdValue: 0, icon: "Ξ" },
  { symbol: "USDT", name: "Tether", balance: 0, usdValue: 0, icon: "₮" },
  { symbol: "USDC", name: "USD Coin", balance: 0, usdValue: 0, icon: "$" },
];

export default function CryptoWalletPanel() {
  const { user } = useAuth();
  const [copied, setCopied] = useState<string | null>(null);

  const totalUsd = MOCK_ASSETS.reduce((sum, a) => sum + a.usdValue, 0);

  const handleCopy = (address: string, symbol: string) => {
    navigator.clipboard.writeText(address);
    setCopied(symbol);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Total Crypto Balance */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-5"
        style={{
          background: "linear-gradient(135deg, hsl(var(--secondary)), hsl(var(--secondary) / 0.7))",
          border: "1px solid hsl(var(--border) / 0.15)",
        }}
      >
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
          Crypto Portfolio
        </p>
        <p className="text-2xl font-black text-foreground">
          ${totalUsd.toFixed(2)}
        </p>
        <p className="text-[10px] text-muted-foreground mt-1">
          {MOCK_ASSETS.length} assets
        </p>
      </motion.div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: ArrowDownLeft, label: "Receive", action: () => {} },
          { icon: ArrowUpRight, label: "Send", action: () => {} },
          { icon: Plus, label: "Buy", action: () => {} },
        ].map((a) => (
          <Button
            key={a.label}
            variant="outline"
            size="sm"
            className="flex flex-col items-center gap-1 h-auto py-3 rounded-xl"
            onClick={a.action}
          >
            <a.icon className="w-4 h-4" />
            <span className="text-[10px] font-semibold">{a.label}</span>
          </Button>
        ))}
      </div>

      {/* Asset List */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3 px-0.5">
          Assets
        </p>
        <div className="rounded-2xl border border-border overflow-hidden">
          {MOCK_ASSETS.map((asset, i) => (
            <div key={asset.symbol}>
              <div className="flex items-center gap-3 p-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold"
                  style={{ background: "hsl(var(--muted))" }}
                >
                  {asset.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{asset.name}</p>
                  <p className="text-[10px] text-muted-foreground">{asset.symbol}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-foreground">
                    {asset.balance.toFixed(asset.symbol === "BTC" ? 8 : 4)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    ${asset.usdValue.toFixed(2)}
                  </p>
                </div>
              </div>
              {i < MOCK_ASSETS.length - 1 && (
                <div className="mx-4 border-t" style={{ borderColor: "hsl(var(--border) / 0.08)" }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Coming Soon Notice */}
      <div
        className="rounded-2xl p-4 text-center"
        style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border) / 0.12)" }}
      >
        <Wallet className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm font-semibold text-foreground">Crypto Wallet Coming Soon</p>
        <p className="text-xs text-muted-foreground mt-1">
          Deposit, send, and receive crypto assets directly from your wallet.
        </p>
      </div>
    </div>
  );
}
