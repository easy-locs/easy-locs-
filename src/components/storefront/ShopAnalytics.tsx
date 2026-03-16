/**
 * ShopAnalytics — Enhanced seller analytics dashboard.
 * Views, visitors, orders, revenue, conversion, top products, order funnel.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Eye, Users, ShoppingBag, DollarSign, TrendingUp, Loader2, Star, Package } from "lucide-react";

interface Props { shopId: string; }

const fmtNum = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
const fmtPrice = (n: number, c = "EUR") => {
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency: c, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n); }
  catch { return `${n} ${c}`; }
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-warning/20 text-warning",
  accepted: "bg-info/20 text-info",
  preparing: "bg-primary/20 text-primary",
  shipped: "bg-accent/20 text-accent-foreground",
  completed: "bg-success/20 text-success",
  cancelled: "bg-destructive/20 text-destructive",
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

  const { data: orderStats } = useQuery({
    queryKey: ["shop-order-stats", shopId],
    queryFn: async () => {
      const { data: orders } = await (supabase as any).from("storefront_orders")
        .select("status, total, currency").eq("shop_id", shopId);
      if (!orders) return { total: 0, completed: 0, revenue: 0, byStatus: {} };
      const completed = orders.filter((o: any) => o.status === "completed");
      const byStatus: Record<string, number> = {};
      orders.forEach((o: any) => { byStatus[o.status] = (byStatus[o.status] || 0) + 1; });
      return {
        total: orders.length,
        completed: completed.length,
        revenue: completed.reduce((s: number, o: any) => s + (o.total || 0), 0),
        byStatus,
      };
    },
  });

  // Top products by order count
  const { data: topProducts = [] } = useQuery({
    queryKey: ["shop-top-products", shopId],
    queryFn: async () => {
      const { data: items } = await (supabase as any).from("storefront_order_items")
        .select("item_id, quantity, unit_price, catalog_items(title, photo_url)")
        .eq("catalog_items.shop_id", shopId);
      if (!items) return [];
      const map: Record<string, { title: string; photo: string | null; sold: number; revenue: number }> = {};
      items.forEach((it: any) => {
        if (!it.item_id) return;
        if (!map[it.item_id]) map[it.item_id] = { title: it.catalog_items?.title || "Item", photo: it.catalog_items?.photo_url, sold: 0, revenue: 0 };
        map[it.item_id].sold += it.quantity || 1;
        map[it.item_id].revenue += (it.unit_price || 0) * (it.quantity || 1);
      });
      return Object.entries(map)
        .map(([id, d]) => ({ id, ...d }))
        .sort((a, b) => b.sold - a.sold)
        .slice(0, 5);
    },
  });

  const totals = analytics.reduce((acc: any, day: any) => ({
    views: acc.views + (day.views || 0),
    visitors: acc.visitors + (day.visitors || 0),
    orders: acc.orders + (day.orders || 0),
    revenue: acc.revenue + (day.revenue || 0),
  }), { views: 0, visitors: 0, orders: 0, revenue: 0 });

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

  const statusEntries = Object.entries(orderStats?.byStatus || {}).sort((a, b) => b[1] - a[1]);
  const maxStatus = statusEntries.length > 0 ? Math.max(...statusEntries.map(e => e[1])) : 1;

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

      {/* Order Funnel */}
      {statusEntries.length > 0 && (
        <Card>
          <CardContent className="p-3 space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground">Order Status Breakdown</h4>
            {statusEntries.map(([status, count]) => (
              <div key={status} className="flex items-center gap-2">
                <Badge variant="secondary" className={`text-[9px] px-1.5 capitalize ${STATUS_COLORS[status] || ""}`}>{status}</Badge>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary/60 rounded-full transition-all" style={{ width: `${(count / maxStatus) * 100}%` }} />
                </div>
                <span className="text-[10px] font-medium text-foreground w-6 text-right">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Top Products */}
      {topProducts.length > 0 && (
        <Card>
          <CardContent className="p-3 space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Star className="h-3 w-3" /> Top Products
            </h4>
            {topProducts.map((p, i) => (
              <div key={p.id} className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground w-4 shrink-0">#{i + 1}</span>
                {p.photo ? (
                  <img src={p.photo} alt="" className="w-7 h-7 rounded object-cover shrink-0" />
                ) : (
                  <div className="w-7 h-7 rounded bg-muted flex items-center justify-center shrink-0">
                    <Package className="h-3 w-3 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium truncate">{p.title}</p>
                  <p className="text-[10px] text-muted-foreground">{p.sold} sold</p>
                </div>
                <span className="text-[11px] font-semibold text-primary">{fmtPrice(p.revenue)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

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