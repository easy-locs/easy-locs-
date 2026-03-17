/**
 * WalletPage — Standalone wallet view showing balance + transaction history.
 * Drop into any route: <Route path="/wallet" element={<WalletPage />} />
 */
import { useAuth } from "@/contexts/AuthContext";
import { useWalletBalance, useWalletTransactions, type UnifiedTx } from "@/payments/wallet-hooks";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import SEOHead from "@/components/SEOHead";
import { Wallet, ArrowUpRight, ArrowDownLeft, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { QrActionRow } from "@/components/qr/UniversalQrWidgets";

function formatMoney(amount: number, currency = "AED") {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

function TxRow({ tx, userId }: { tx: UnifiedTx; userId: string }) {
  const isSender = tx.sender_id === userId;
  const sign = isSender ? "-" : "+";
  const Icon = isSender ? ArrowUpRight : ArrowDownLeft;
  const color = isSender ? "text-destructive" : "text-emerald-600";
  const date = new Date(tx.created_at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-border/30 last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isSender ? "bg-destructive/10" : "bg-emerald-500/10"}`}>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {tx.title || tx.context_type}
          </p>
          <p className="text-xs text-muted-foreground">{date}</p>
        </div>
      </div>
      <span className={`text-sm font-semibold whitespace-nowrap ${color}`}>
        {sign}{formatMoney(tx.amount, tx.currency)}
      </span>
    </div>
  );
}

export default function WalletPage() {
  const { user } = useAuth();
  const { balance, currency, loading: balLoading } = useWalletBalance();
  const { items, loading: txLoading } = useWalletTransactions();

  return (
    <>
      <SEOHead title="Wallet — Easy Locs" description="Your wallet balance and transactions" />
      <div className="min-h-screen bg-background">
        <MobilePageHeader title="Wallet" backTo="/discover" />

        <div className="max-w-md mx-auto px-4 pt-6 pb-24 space-y-6">
          {/* Balance card */}
          <div className="rounded-2xl border border-border bg-card p-6 text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Wallet className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Available Balance</span>
            </div>
            {balLoading ? (
              <Skeleton className="h-10 w-40 mx-auto rounded-xl" />
            ) : (
              <p className="text-3xl font-bold text-foreground">
                {formatMoney(balance, currency)}
              </p>
            )}
          </div>

          {/* QR Actions */}
          {user?.id && (
            <QrActionRow
              payload={{ type: "user_pay", userId: user.id }}
              qrTitle="My payment QR"
            />
          )}

          {/* Transactions */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" /> Recent transactions
            </h2>

            {txLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
              </div>
            ) : items.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No transactions yet</p>
            ) : (
              <div className="rounded-2xl border border-border/40 bg-card px-4">
                {items.map((tx) => (
                  <TxRow key={tx.id} tx={tx} userId={user?.id || ""} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
