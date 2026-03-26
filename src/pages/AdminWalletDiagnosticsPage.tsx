/**
 * Admin Wallet Diagnostics — Order payment state, pricing breakdown,
 * anomaly flags, wallet/ledger timeline. Uses canonical wallet schema.
 */
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, AlertTriangle, CheckCircle2, Clock, ArrowDown, ArrowUp, Lock, Unlock, RefreshCw, ShieldCheck } from "lucide-react";
import { formatPrice } from "@/lib/currency";
import { approveWalletReview } from "@/lib/wallet/wallet-engine";
import { toast } from "sonner";

interface OrderDiag {
  id: string;
  status: string;
  payment_status: string;
  wallet_status: string;
  settlement_status: string;
  gross_amount: number;
  delivery_fee: number;
  platform_commission_amount: number;
  merchant_net_amount: number;
  driver_amount: number;
  order_mode: string;
  payment_mode: string;
  currency: string;
  customer_wallet_id: string;
  created_at: string;
}

export default function AdminWalletDiagnosticsPage() {
  const [orderId, setOrderId] = useState("");
  const [order, setOrder] = useState<OrderDiag | null>(null);
  const [splits, setSplits] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const lookup = async () => {
    if (!orderId.trim()) return;
    setLoading(true);
    try {
      const [oRes, sRes, tRes, aRes] = await Promise.all([
        (supabase as any).from("orders").select("id, status, payment_status, wallet_status, settlement_status, gross_amount, delivery_fee, platform_commission_amount, merchant_net_amount, driver_amount, order_mode, payment_mode, currency, customer_wallet_id, created_at").eq("id", orderId).single(),
        (supabase as any).from("wallet_order_splits").select("*").eq("order_id", orderId).order("created_at"),
        // Canonical: unified_wallet_transactions by context_id
        (supabase as any).from("unified_wallet_transactions").select("*").eq("context_id", orderId).order("created_at"),
        (supabase as any).from("audit_logs").select("*").ilike("action", "wallet_%").order("created_at", { ascending: false }).limit(20),
      ]);
      setOrder(oRes.data);
      setSplits(sRes.data ?? []);
      setTransactions(tRes.data ?? []);

      // Load ledger entries from transaction IDs
      const txIds = (tRes.data ?? []).map((t: any) => t.id);
      if (txIds.length > 0) {
        const { data: ledgerData } = await (supabase as any).from("wallet_ledger_entries").select("*").in("transaction_id", txIds).order("created_at");
        setLedger(ledgerData ?? []);
      } else {
        setLedger([]);
      }

      setAuditLogs(aRes.data ?? []);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveReview = async () => {
    if (!order) return;
    try {
      await approveWalletReview({ orderId: order.id });
      toast.success("Review approved — order can now be settled");
      lookup();
    } catch (e: any) {
      toast.error(e.message || "Failed to approve");
    }
  };

  const cur = order?.currency || "AED";

  const statusColor = (s: string) => {
    if (["settled", "paid", "completed"].includes(s)) return "bg-green-900/30 text-green-400 border-green-800";
    if (["authorized", "captured", "held_in_escrow"].includes(s)) return "bg-amber-900/30 text-amber-400 border-amber-800";
    if (["reversed", "cancelled", "failed"].includes(s)) return "bg-red-900/30 text-red-400 border-red-800";
    if (s === "review_required") return "bg-orange-900/30 text-orange-400 border-orange-800";
    return "bg-muted text-muted-foreground border-border";
  };

  const entryIcon = (type: string) => {
    switch (type) {
      case "lock": return <Lock className="w-3.5 h-3.5 text-amber-400" />;
      case "unlock": return <Unlock className="w-3.5 h-3.5 text-blue-400" />;
      case "credit": return <ArrowDown className="w-3.5 h-3.5 text-green-400" />;
      case "debit": return <ArrowUp className="w-3.5 h-3.5 text-red-400" />;
      default: return <ArrowUp className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Wallet Diagnostics</h1>
      <p className="text-sm text-muted-foreground mb-6">Inspect order payment state, splits, ledger, and anomalies</p>

      <div className="flex gap-2 mb-6">
        <Input placeholder="Order ID" value={orderId} onChange={e => setOrderId(e.target.value)} className="max-w-md" />
        <Button onClick={lookup} disabled={loading}>
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-1" />}
          Lookup
        </Button>
      </div>

      {order && (
        <div className="space-y-4">
          {/* Order State */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                Order State
                <span className="font-mono text-xs text-muted-foreground">#{order.id.slice(0, 8)}</span>
                <Badge variant="outline" className="ml-2 text-xs">{cur}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Status", value: order.status },
                  { label: "Payment", value: order.payment_status },
                  { label: "Wallet", value: order.wallet_status },
                  { label: "Settlement", value: order.settlement_status },
                  { label: "Mode", value: order.order_mode },
                  { label: "Payment Mode", value: order.payment_mode },
                  { label: "Currency", value: cur },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <Badge variant="outline" className={`mt-1 ${statusColor(value || "")}`}>{value || "—"}</Badge>
                  </div>
                ))}
              </div>

              {order.payment_status === "review_required" && (
                <div className="mt-3 flex items-center justify-between gap-2 p-3 rounded-lg bg-orange-900/20 border border-orange-800">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-400" />
                    <span className="text-sm text-orange-300">Anomaly detected — manual review required</span>
                  </div>
                  <Button size="sm" variant="outline" className="gap-1 border-orange-600 text-orange-300 hover:bg-orange-900/30" onClick={handleApproveReview}>
                    <ShieldCheck className="w-3.5 h-3.5" /> Approve
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Financial Breakdown */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Financial Breakdown</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { label: "Gross", value: order.gross_amount },
                  { label: "Delivery Fee", value: order.delivery_fee },
                  { label: "Commission", value: order.platform_commission_amount },
                  { label: "Merchant Net", value: order.merchant_net_amount },
                  { label: "Driver", value: order.driver_amount },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-lg font-bold">{formatPrice(Number(value || 0), cur)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Splits */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Order Splits ({splits.length})</CardTitle></CardHeader>
            <CardContent>
              {splits.length === 0 ? <p className="text-sm text-muted-foreground">No splits found</p> : (
                <div className="space-y-2">
                  {splits.map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between bg-muted/30 rounded-lg p-3 text-sm">
                      <div>
                        <Badge variant="outline" className="mr-2">{s.split_party_type}</Badge>
                        <span className="font-mono text-xs text-muted-foreground">{s.wallet_account_id?.slice(0, 8)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold">{formatPrice(Number(s.net_amount), cur)}</span>
                        <Badge variant="outline" className={statusColor(s.split_status)}>{s.split_status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Transactions — canonical fields */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Wallet Transactions ({transactions.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {transactions.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between bg-muted/30 rounded-lg p-3 text-sm">
                    <div className="flex items-center gap-2">
                      {t.destination_wallet_id ? <ArrowDown className="w-4 h-4 text-green-400" /> : <ArrowUp className="w-4 h-4 text-red-400" />}
                      <span>{t.transaction_type}</span>
                      <span className="font-mono text-xs text-muted-foreground">{t.id?.slice(0, 8)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold">{formatPrice(Number(t.amount), t.currency || cur)}</span>
                      <Badge variant="outline" className={statusColor(t.status)}>{t.status}</Badge>
                    </div>
                  </div>
                ))}
                {transactions.length === 0 && <p className="text-sm text-muted-foreground">No transactions</p>}
              </div>
            </CardContent>
          </Card>

          {/* Ledger Timeline — canonical fields */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Ledger Timeline ({ledger.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-1">
                {ledger.map((l: any) => (
                  <div key={l.id} className="flex items-center gap-3 text-sm py-1.5 border-b border-border/50 last:border-0">
                    {entryIcon(l.entry_type)}
                    <span className="w-20 text-muted-foreground">{l.entry_type}</span>
                    <span className="font-mono text-xs text-muted-foreground">{l.wallet_account_id?.slice(0, 8)}</span>
                    <span className="flex-1" />
                    <span className={`font-bold ${["credit", "unlock"].includes(l.entry_type) ? "text-green-400" : "text-red-400"}`}>
                      {["credit", "unlock"].includes(l.entry_type) ? "+" : "-"}{formatPrice(Number(l.amount), l.currency || cur)}
                    </span>
                    <span className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleTimeString()}</span>
                  </div>
                ))}
                {ledger.length === 0 && <p className="text-sm text-muted-foreground">No ledger entries</p>}
              </div>
            </CardContent>
          </Card>

          {/* Recent Audit Logs */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Recent Wallet Audit Logs</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {auditLogs.map((a: any) => (
                  <div key={a.id} className="flex items-center gap-2 text-xs py-1 border-b border-border/30">
                    {a.action.includes("failed") || a.action.includes("anomaly") ? (
                      <AlertTriangle className="w-3 h-3 text-orange-400 flex-shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-3 h-3 text-green-400 flex-shrink-0" />
                    )}
                    <span className="font-mono text-muted-foreground">{a.action}</span>
                    <span className="flex-1" />
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className="text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
