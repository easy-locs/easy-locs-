/**
 * CommPaymentsSection — Wallet section in Communication Center
 * Uses unified wallet engine only
 */
import { useNavigate } from "react-router-dom";
import { useWalletBalance, useWalletTransactions } from "@/payments/wallet-hooks";
import { Wallet, ArrowUpRight, ArrowDownLeft, ScanLine, CreditCard } from "lucide-react";

export default function CommPaymentsSection() {
  const navigate = useNavigate();
  const { balance, currency, loading } = useWalletBalance();
  const { items: txHistory } = useWalletTransactions(10);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="rounded-2xl p-5 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
        <div className="flex items-center gap-2 mb-2">
          <Wallet className="w-4 h-4" />
          <span className="text-xs font-medium opacity-80">Balance</span>
        </div>
        <p className="text-2xl font-black">{loading ? "..." : `${balance.toFixed(2)} ${currency}`}</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <button onClick={() => navigate("/wallet/transfer")} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted">
          <ArrowUpRight className="w-5 h-5 text-foreground" />
          <span className="text-[10px] font-semibold text-foreground">Send</span>
        </button>
        <button onClick={() => navigate("/wallet/request")} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted">
          <ArrowDownLeft className="w-5 h-5 text-foreground" />
          <span className="text-[10px] font-semibold text-foreground">Request</span>
        </button>
        <button onClick={() => navigate("/pay/scan")} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted">
          <ScanLine className="w-5 h-5 text-foreground" />
          <span className="text-[10px] font-semibold text-foreground">Scan</span>
        </button>
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Recent</p>
        {txHistory.length === 0 ? (
          <div className="rounded-xl p-6 flex flex-col items-center gap-2 text-center bg-muted">
            <CreditCard className="w-6 h-6 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">No transactions yet</p>
          </div>
        ) : (
          <div className="space-y-1">
            {txHistory.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-muted/30">
                <div>
                  <p className="text-xs font-semibold text-foreground">{tx.title || tx.context_type}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(tx.created_at).toLocaleDateString()}</p>
                </div>
                <span className="text-xs font-bold text-foreground">{tx.amount} {tx.currency}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <button onClick={() => navigate("/wallet/hub")} className="w-full py-3 rounded-xl bg-muted text-sm font-semibold text-foreground active:scale-[0.98] transition-transform">
        Open Wallet Hub
      </button>
    </div>
  );
}
