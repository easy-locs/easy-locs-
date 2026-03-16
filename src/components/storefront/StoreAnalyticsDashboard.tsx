/**
 * StoreAnalyticsDashboard — Seller KPIs, conversions, revenue, top products
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, Eye, ShoppingCart, DollarSign, Package, Users, Star } from "lucide-react";

interface Props {
  shopId: string;
}

export default function StoreAnalyticsDashboard({ shopId }: Props) {
  // Analytics events
  const { data: events = [] } = useQuery({
    queryKey: ["store-analytics-events", shopId],
    queryFn: async () => {
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data } = await (supabase as any)
        .from("storefront_analytics_events")
        .select("*")
        .eq("shop_id", shopId)
        .gte("created_at", weekAgo)
        .order("created_at", { ascending: false })
        .limit(500);
      return data || [];
    },
  });

  // Orders for revenue
  const { data: orders = [] } = useQuery({
    queryKey: ["store-analytics-orders", shopId],
    queryFn: async () => {
      const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data } = await (supabase as any)
        .from("storefront_orders")
        .select("id, total, currency, status, created_at, items_json")
        .eq("shop_id", shopId)
        .gte("created_at", monthAgo)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Catalog for top products
  const { data: catalogItems = [] } = useQuery({
    queryKey: ["store-analytics-catalog", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("catalog_items")
        .select("id, title, price, photo_url")
        .eq("shop_id", shopId)
        .limit(50);
      return data || [];
    },
  });

  // Compute KPIs
  const views = events.filter((e: any) => e.event_type === "view").length;
  const cartAdds = events.filter((e: any) => e.event_type === "add_to_cart").length;
  const checkouts = events.filter((e: any) => e.event_type === "checkout").length;
  const paidOrders = orders.filter((o: any) => o.status === "paid" || o.status === "completed");
  const totalRevenue = paidOrders.reduce((sum: number, o: any) => sum + (o.total || 0), 0);
  const avgOrderValue = paidOrders.length ? totalRevenue / paidOrders.length : 0;
  const conversionRate = views > 0 ? ((paidOrders.length / views) * 100).toFixed(1) : "0";

  // Top products by order frequency
  const productFreq: Record<string, number> = {};
  paidOrders.forEach((o: any) => {
    const items = o.items_json || [];
    items.forEach((item: any) => {
      productFreq[item.item_id] = (productFreq[item.item_id] || 0) + (item.quantity || 1);
    });
  });
  const topProducts = Object.entries(productFreq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([itemId, count]) => {
      const cat = catalogItems.find((c: any) => c.id === itemId);
      return { id: itemId, title: cat?.title || "Product", photo: cat?.photo_url, count };
    });

  // Daily revenue for mini chart
  const dailyRevenue: Record<string, number> = {};
  paidOrders.forEach((o: any) => {
    const day = o.created_at?.substring(0, 10);
    if (day) dailyRevenue[day] = (dailyRevenue[day] || 0) + (o.total || 0);
  });
  const days = Object.entries(dailyRevenue).sort(([a], [b]) => a.localeCompare(b)).slice(-7);
  const maxDailyRev = Math.max(...days.map(([, v]) => v), 1);

  const KPI_CARDS = [
    { label: "Views (7d)", value: views, icon: Eye, color: "text-info" },
    { label: "Cart Adds", value: cartAdds, icon: ShoppingCart, color: "text-warning" },
    { label: "Orders (30d)", value: paidOrders.length, icon: Package, color: "text-primary" },
    { label: "Revenue", value: `${totalRevenue.toFixed(0)}€`, icon: DollarSign, color: "text-success" },
    { label: "Avg Order", value: `${avgOrderValue.toFixed(1)}€`, icon: TrendingUp, color: "text-accent" },
    { label: "Conv. Rate", value: `${conversionRate}%`, icon: BarChart3, color: "text-primary" },
  ];

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Store Analytics
          </h3>
          <Badge variant="outline" className="text-2xs">Last 30 days</Badge>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-3 gap-2">
          {KPI_CARDS.map(kpi => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} className="bg-muted/30 rounded-xl p-2.5 text-center">
                <Icon className={`w-4 h-4 mx-auto mb-1 ${kpi.color}`} />
                <p className="text-lg font-black">{kpi.value}</p>
                <p className="text-2xs text-muted-foreground">{kpi.label}</p>
              </div>
            );
          })}
        </div>

        {/* Mini bar chart — daily revenue */}
        {days.length > 0 && (
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold">Daily Revenue</h4>
            <div className="flex items-end gap-1 h-16">
              {days.map(([day, rev]) => (
                <div key={day} className="flex-1 flex flex-col items-center gap-0.5">
                  <div
                    className="w-full bg-primary/20 rounded-t"
                    style={{ height: `${(rev / maxDailyRev) * 100}%`, minHeight: 2 }}
                  >
                    <div
                      className="w-full bg-primary rounded-t"
                      style={{ height: "100%" }}
                    />
                  </div>
                  <span className="text-[8px] text-muted-foreground">{day.slice(5)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Products */}
        {topProducts.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-warning" /> Top Products
            </h4>
            {topProducts.map((p, i) => (
              <div key={p.id} className="flex items-center gap-2 bg-muted/30 rounded-lg p-2">
                <span className="text-xs font-black text-muted-foreground w-5">#{i + 1}</span>
                {p.photo && <img src={p.photo} alt="" className="w-8 h-8 rounded-lg object-cover" />}
                <span className="text-xs font-medium flex-1 truncate">{p.title}</span>
                <Badge variant="secondary" className="text-2xs">{p.count} sold</Badge>
              </div>
            ))}
          </div>
        )}

        {/* Funnel */}
        <div className="space-y-1.5">
          <h4 className="text-xs font-semibold">Conversion Funnel</h4>
          {[
            { label: "Page Views", value: views, pct: 100 },
            { label: "Add to Cart", value: cartAdds, pct: views ? (cartAdds / views) * 100 : 0 },
            { label: "Checkout", value: checkouts, pct: views ? (checkouts / views) * 100 : 0 },
            { label: "Paid", value: paidOrders.length, pct: views ? (paidOrders.length / views) * 100 : 0 },
          ].map(step => (
            <div key={step.label} className="flex items-center gap-2">
              <span className="text-2xs text-muted-foreground w-20">{step.label}</span>
              <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary/60 rounded-full transition-all" style={{ width: `${Math.min(step.pct, 100)}%` }} />
              </div>
              <span className="text-2xs font-semibold w-12 text-right">{step.value} ({step.pct.toFixed(0)}%)</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
