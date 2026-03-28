/**
 * ShopAnalytics — Seller analytics dashboard consuming REAL events.
 * Sources: storefront_analytics_events (views, add_to_cart, checkout, purchase)
 *          storefront_orders (order stats, revenue, funnel)
 *          storefront_order_items (top products)
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Eye, Users, ShoppingBag, DollarSign, TrendingUp, Loader2, Star, Package, ShoppingCart, CreditCard } from "lucide-react";

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
  // Real event counts from storefront_analytics_events
  const { data: eventStats, isLoading } = useQuery({
    queryKey: ["shop-event-stats", shopId],
    queryFn: async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data: events } = await (supabase as any)
        .from("storefront_analytics_events")
        .select("event_type, session_id, revenue, created_at")
        .eq("shop_id", shopId)
        .gte("created_at", thirtyDaysAgo);

      if (!events || events.length === 0) {
        return { pageViews: 0, uniqueVisitors: 0, addToCart: 0, checkouts: 0, purchases: 0, purchaseRevenue: 0 };
      }

      const sessions = new Set<string>();
      let pageViews = 0, addToCart = 0, checkouts = 0, purchases = 0, purchaseRevenue = 0;

      events.forEach((e: any) => {
        if (e.session_id) sessions.add(e.session_id);
        switch (e.event_type) {
          case "page_view": pageViews++; break;
          case "add_to_cart": addToCart++; break;
          case "checkout_start": checkouts++; break;
          case "purchase": purchases++; purchaseRevenue += (e.revenue || 0); break;
        }
      });

      return { pageViews, uniqueVisitors: sessions.size, addToCart, checkouts, purchases, purchaseRevenue };
    },
  });

  // Order stats from storefront_orders
  const { data: orderStats } = useQuery({
    queryKey: ["shop-order-stats", shopId],
    queryFn: async () => {
      const { data: orders } = await (supabase as any).from("storefront_orders")
        .select("status, total, currency").eq("shop_id", shopId);
      if (!orders) return { total: 0, completed: 0, revenue: 0, byStatus: {} as Record<string, number> };
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

  // Top products
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

  const ev = eventStats || { pageViews: 0, uniqueVisitors: 0, addToCart: 0, checkouts: 0, purchases: 0, purchaseRevenue: 0 };
  const totalOrders = orderStats?.total || 0;
  const totalRevenue = orderStats?.revenue || 0;
  const conversionRate = ev.uniqueVisitors > 0 ? ((totalOrders / ev.uniqueVisitors) * 100).toFixed(1) : "0";

  const metrics = [
    { label: "Page Views (30d)", value: fmtNum(ev.pageViews), icon: Eye, color: "text-info" },
    { label: "Unique Visitors", value: fmtNum(ev.uniqueVisitors), icon: Users, color: "text-primary" },
    { label: "Add to Cart", value: fmtNum(ev.addToCart), icon: ShoppingCart, color: "text-warning" },
    { label: "Checkouts", value: fmtNum(ev.checkouts), icon: CreditCard, color: "text-accent-foreground" },
    { label: "Orders", value: fmtNum(totalOrders), icon: ShoppingBag, color: "text-success" },
    { label: "Revenue", value: fmtPrice(totalRevenue), icon: DollarSign, color: "text-primary" },
  ];

  const funnelSteps = [
    { label: "Views", count: ev.pageViews, icon: Eye },
    { label: "Add to Cart", count: ev.addToCart, icon: ShoppingCart },
    { label: "Checkout", count: ev.checkouts, icon: CreditCard },
    { label: "Purchase", count: ev.purchases, icon: ShoppingBag },
  ];
  const maxFunnel = Math.max(1, ...funnelSteps.map(s => s.count));

  if (isLoading) return <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div>;

  const statusEntries = Object.entries(orderStats?.byStatus || {}).sort((a, b) => b[1] - a[1]);
  const maxStatus = statusEntries.length > 0 ? Math.max(...statusEntries.map(e => e[1])) : 1;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-primary" /> Analytics
        <Badge variant="outline" className="text-[9px] ml-auto">Live data</Badge>
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

      {/* Conversion Funnel */}
      <Card>
        <CardContent className="p-3 space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> Conversion Funnel (30d)
          </h4>
          {funnelSteps.map((step) => (
            <div key={step.label} className="flex items-center gap-2">
              <step.icon className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="text-[11px] w-20 shrink-0">{step.label}</span>
              <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary/60 rounded-full transition-all" style={{ width: `${(step.count / maxFunnel) * 100}%` }} />
              </div>
              <span className="text-[10px] font-medium text-foreground w-8 text-right">{fmtNum(step.count)}</span>
            </div>
          ))}
          <p className="text-[10px] text-muted-foreground text-right">Conversion: {conversionRate}%</p>
        </CardContent>
      </Card>

      {/* Order Status Breakdown */}
      {statusEntries.length > 0 && (
        <Card>
          <CardContent className="p-3 space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground">Order Status</h4>
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
                  <p className="text-[11px] font-medium line-clamp-2 break-words leading-snug">{p.title}</p>
                  <p className="text-[10px] text-muted-foreground">{p.sold} sold</p>
                </div>
                <span className="text-[11px] font-semibold text-primary">{fmtPrice(p.revenue)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
