/**
 * ShopAnalytics — Module 18: Shop analytics dashboard.
 * Views, visitors, orders, revenue, conversion rate.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Eye, Users, ShoppingBag, DollarSign, TrendingUp, Loader2 } from "lucide-react";

interface Props { shopId: string; }

const fmtNum = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
const fmtPrice = (n: number, c = "EUR") => {
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency: c, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n); }
  catch { return `${n} ${c}`; }
};

export default function ShopAnalytics({ shopId }: Props) {
  const { data: analytics = [], isLoading } = useQuery({
    queryKey: ["shop-analytics", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("storefront_analytics_daily")
        .select("*").eq("shop_id", shopId)
        .order("day", { ascending: false }).limit(30);
      return data || [];
    },
  });

  // Aggregate from orders
  const { data: orderStats } = useQuery({
    queryKey: ["shop-order-stats", shopId],
    queryFn: async () => {
      const { data: orders } = await (supabase as any).from("storefront_orders")
        .select("status, total").eq("shop_id", shopId);
      if (!orders) return { total: 0, completed: 0, revenue: 0 };
      const completed = orders.filter((o: any) => o.status === "completed");
      return {
        total: orders.length,
        completed: completed.length,
        revenue: completed.reduce((s: number, o: any) => s + (o.total || 0), 0),
      };
    },
  });

  const totals = analytics.reduce((acc: any, day: any) => ({
    views: acc.views + (day.views || 0),
    visitors: acc.visitors + (day.visitors || 0),
    orders: acc.orders + (day.orders || 0),
    revenue: acc.revenue + (day.revenue || 0),
  }), { views: 0, visitors: 0, orders: 0, revenue: 0 });

  // Use order stats as fallback
  const finalOrders = orderStats?.total || totals.orders;
  const finalRevenue = orderStats?.revenue || totals.revenue;
  const conversionRate = totals.visitors > 0 ? ((finalOrders / totals.visitors) * 100).toFixed(1) : "0";

  const metrics = [
    { label: "Views (30d)", value: fmtNum(totals.views), icon: Eye, color: "text-info" },
    { label: "Visitors", value: fmtNum(totals.visitors), icon: Users, color: "text-primary" },
    { label: "Orders", value: fmtNum(finalOrders), icon: ShoppingBag, color: "text-success" },
    { label: "Revenue", value: fmtPrice(finalRevenue), icon: DollarSign, color: "text-warning" },
    { label: "Conversion", value: `${conversionRate}%`, icon: TrendingUp, color: "text-accent-foreground" },
  ];

  if (isLoading) return <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-primary" /> Analytics
      </h3>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-2">
        {metrics.map(m => (
          <Card key={m.label}>
            <CardContent className="p-3 flex items-center gap-3">
              <m.icon className={`h-5 w-5 ${m.color} shrink-0`} />
              <div>
                <p className="text-lg font-bold text-foreground">{m.value}</p>
                <p className="text-[10px] text-muted-foreground">{m.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent days */}
      {analytics.length > 0 && (
        <Card>
          <CardContent className="p-3 space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground">Last 7 Days</h4>
            <div className="space-y-1">
              {analytics.slice(0, 7).map((day: any) => (
                <div key={day.day} className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">{new Date(day.day).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</span>
                  <div className="flex items-center gap-3">
                    <span>{day.views || 0} views</span>
                    <span>{day.orders || 0} orders</span>
                    <span className="font-medium text-primary">{fmtPrice(day.revenue || 0)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
