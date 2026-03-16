/**
 * SellerFinance — Seller payouts & finance dashboard.
 * Shows received payments, balance, order revenue breakdown.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Clock, CheckCircle, Loader2, ArrowDownRight, ArrowUpRight } from "lucide-react";

const fmtPrice = (n: number, c = "EUR") => {
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency: c, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n); }
  catch { return `${n} ${c}`; }
};

export default function SellerFinance({ shopId }: { shopId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["seller-finance", shopId],
    queryFn: async () => {
      const { data: orders } = await (supabase as any)
        .from("storefront_orders")
        .select("id, status, total, currency, created_at, shipping_fee")
        .eq("shop_id", shopId)
        .order("created_at", { ascending: false });

      const { data: returns } = await (supabase as any)
        .from("storefront_returns")
        .select("refund_amount, currency, status")
        .eq("shop_id", shopId);

      const all = orders || [];
      const completed = all.filter((o: any) => o.status === "completed");
      const pending = all.filter((o: any) => !["completed", "cancelled"].includes(o.status));
      const refunded = (returns || []).filter((r: any) => r.status === "refunded");

      const totalRevenue = completed.reduce((s: number, o: any) => s + (o.total || 0), 0);
      const pendingRevenue = pending.reduce((s: number, o: any) => s + (o.total || 0), 0);
      const totalRefunds = refunded.reduce((s: number, r: any) => s + (r.refund_amount || 0), 0);
      const shippingCollected = all.reduce((s: number, o: any) => s + (o.shipping_fee || 0), 0);
      const netRevenue = totalRevenue - totalRefunds;
      const currency = all[0]?.currency || "EUR";

      return {
        totalRevenue, pendingRevenue, totalRefunds, netRevenue, shippingCollected, currency,
        totalOrders: all.length,
        completedOrders: completed.length,
        recentOrders: all.slice(0, 10),
      };
    },
  });

  if (isLoading) return <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div>;
  if (!data) return null;

  const kpis = [
    { label: "Net Revenue", value: fmtPrice(data.netRevenue, data.currency), icon: TrendingUp, color: "text-success" },
    { label: "Gross Revenue", value: fmtPrice(data.totalRevenue, data.currency), icon: DollarSign, color: "text-primary" },
    { label: "Pending", value: fmtPrice(data.pendingRevenue, data.currency), icon: Clock, color: "text-warning" },
    { label: "Refunds", value: fmtPrice(data.totalRefunds, data.currency), icon: ArrowDownRight, color: "text-destructive" },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <DollarSign className="h-4 w-4 text-primary" /> Finance
      </h3>

      <div className="grid grid-cols-2 gap-2">
        {kpis.map(k => (
          <Card key={k.label}>
            <CardContent className="p-3 flex items-center gap-3">
              <k.icon className={`h-5 w-5 ${k.color} shrink-0`} />
              <div>
                <p className="text-lg font-bold text-foreground">{k.value}</p>
                <p className="text-[10px] text-muted-foreground">{k.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Extra stats */}
      <Card>
        <CardContent className="p-3 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Completed Orders</span>
            <span className="font-medium">{data.completedOrders} / {data.totalOrders}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Shipping Collected</span>
            <span className="font-medium">{fmtPrice(data.shippingCollected, data.currency)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Recent transactions */}
      {data.recentOrders.length > 0 && (
        <Card>
          <CardContent className="p-3 space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground">Recent Transactions</h4>
            {data.recentOrders.map((order: any) => {
              const isCompleted = order.status === "completed";
              const isCancelled = order.status === "cancelled";
              return (
                <div key={order.id} className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    {isCompleted ? (
                      <ArrowUpRight className="h-3 w-3 text-success" />
                    ) : isCancelled ? (
                      <ArrowDownRight className="h-3 w-3 text-destructive" />
                    ) : (
                      <Clock className="h-3 w-3 text-warning" />
                    )}
                    <span className="text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className={`text-[8px] px-1 capitalize ${
                      isCompleted ? "bg-success/10 text-success" : isCancelled ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"
                    }`}>{order.status}</Badge>
                    <span className={`font-medium ${isCompleted ? "text-success" : "text-foreground"}`}>
                      {fmtPrice(order.total, order.currency)}
                    </span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
