/**
 * MerchantPaymentHistory — Transaction history panel for merchant cockpit.
 * Shows all incoming QR payments with split details.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createRealtimeChannel, removeRealtimeChannel } from "@/lib/realtime";
import { ArrowDownLeft, Clock, CheckCircle2, XCircle } from "lucide-react";
import { formatMoney } from "@/lib/format";

interface MerchantPaymentHistoryProps {
  ownerUserId: string;
  currency?: string;
  limit?: number;
}

interface MerchantTx {
  id: string;
  created_at: string;
  sender_id: string | null;
  amount: number;
  currency: string;
  context_type: string;
  title: string | null;
  status: string;
  metadata: Record<string, any>;
}

export default function MerchantPaymentHistory({
  ownerUserId,
  currency = "AED",
  limit = 20,
}: MerchantPaymentHistoryProps) {
  const [transactions, setTransactions] = useState<MerchantTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayTotal, setTodayTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("unified_wallet_transactions")
      .select("*")
      .eq("recipient_id", ownerUserId)
      .order("created_at", { ascending: false })
      .limit(limit);

    const txs = (data as MerchantTx[]) || [];
    setTransactions(txs);

    // Calculate today's total
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const total = txs
      .filter((tx) => tx.status === "completed" && new Date(tx.created_at) >= today)
      .reduce((sum, tx) => sum + tx.amount, 0);
    setTodayTotal(total);

    setLoading(false);
  }, [ownerUserId, limit]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`merchant-tx-${ownerUserId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "unified_wallet_transactions",
      }, () => load())
      .subscribe();
    return () => { removeRealtimeChannel(channel); };
  }, [ownerUserId, load]);

  const statusIcon = (status: string) => {
    if (status === "completed") return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    if (status === "failed") return <XCircle className="w-4 h-4 text-destructive" />;
    return <Clock className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-4">
      {/* Today's summary */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
        <div>
          <p className="text-xs font-medium text-emerald-600">Today's Revenue</p>
          <p className="text-2xl font-black text-emerald-600">{formatMoney(todayTotal, currency)}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10">
          <ArrowDownLeft className="w-6 h-6 text-emerald-600" />
        </div>
      </div>

      {/* Transaction list */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-foreground">Recent Payments</h4>
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">Loading...</div>
        ) : transactions.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">No payments yet</div>
        ) : (
          <div className="space-y-1.5">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/40 hover:bg-muted/50 transition"
              >
                <div className="flex items-center gap-3">
                  {statusIcon(tx.status)}
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {tx.title || "QR Payment"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.created_at).toLocaleString(undefined, {
                        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                      })}
                      {tx.metadata?.merchant_qr_mode && (
                        <span className="ml-1.5 text-[10px] font-semibold uppercase text-muted-foreground/70">
                          • {tx.metadata.merchant_qr_mode}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <p className={`text-sm font-bold ${tx.status === "completed" ? "text-emerald-600" : "text-muted-foreground"}`}>
                  +{formatMoney(tx.amount, tx.currency)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
