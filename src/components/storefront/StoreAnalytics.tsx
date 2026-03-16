/**
 * StoreAnalytics — Comprehensive store analytics dashboard.
 * Revenue, conversion funnel, top products, customer analytics.
 */
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, TrendingUp, Eye, ShoppingCart, DollarSign, Users, Package, ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react";

interface Props {
  shopId: string;
}

type Period = "7d" | "30d" | "90d" | "all";

const periodDays: Record<Period, number> = { "7d": 7, "30d": 30, "90d": 90, "all": 3650 };

export default function StoreAnalytics({ shopId }: Props) {
  const [period, setPeriod] = useState<Period>("30d");

  const since = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - periodDays[period]);
    return d.toISOString();
  }, [period]);

  // Analytics events
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["store-analytics", shopId, period],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_analytics_events")
        .select("event_type, item_id, revenue, currency, created_at, country, device_type")
        .eq("shop_id", shopId)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(1000);
      return data || [];
    },
  });

  // Orders for revenue
  const { data: orders = [] } = useQuery({
    queryKey: ["store-orders-analytics", shopId, period],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_orders")
        .select("id, total_price, currency, status, created_at, buyer_id")
        .eq("shop_id", shopId)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(1000);
      return data || [];
    },
  });

  // Top products
  const { data: topItems = [] } = useQuery({
    queryKey: ["store-top-items", shopId, period],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_order_items")
        .select("item_id, quantity, unit_price, catalog_items(title, photo_url)")
        .eq("shop_id", shopId)
        .gte("created_at", since)
        .limit(500);
      return data || [];
    },
  });

  // Compute metrics
  const metrics = useMemo(() => {
    const pageViews = events.filter((e: any) => e.event_type === "page_view").length;
    const productViews = events.filter((e: any) => e.event_type === "product_view").length;
    const addToCarts = events.filter((e: any) => e.event_type === "add_to_cart").length;
    const purchases = events.filter((e: any) => e.event_type === "purchase").length;

    const totalRevenue = orders.filter((o: any) => o.status !== "cancelled").reduce((s: number, o: any) => s + (o.total_price || 0), 0);
    const completedOrders = orders.filter((o: any) => o.status === "completed").length;
    const cancelledOrders = orders.filter((o: any) => o.status === "cancelled").length;
    const pendingOrders = orders.filter((o: any) => o.status === "pending").length;

    const uniqueBuyers = new Set(orders.map((o: any) => o.buyer_id).filter(Boolean)).size;
    const avgOrderValue = completedOrders > 0 ? totalRevenue / completedOrders : 0;

    // Conversion funnel
    const viewToCart = pageViews > 0 ? ((addToCarts / pageViews) * 100).toFixed(1) : "0";
    const cartToPurchase = addToCarts > 0 ? ((purchases / addToCarts) * 100).toFixed(1) : "0";

    // Country breakdown
    const countryMap: Record<string, number> = {};
    events.forEach((e: any) => { if (e.country) countryMap[e.country] = (countryMap[e.country] || 0) + 1; });
    const topCountries = Object.entries(countryMap).sort(([, a], [, b]) => b - a).slice(0, 5);

    // Device breakdown
    const deviceMap: Record<string, number> = {};
    events.forEach((e: any) => { if (e.device_type) deviceMap[e.device_type] = (deviceMap[e.device_type] || 0) + 1; });

    // Revenue by day
    const revenueByDay: Record<string, number> = {};
    orders.forEach((o: any) => {
      const day = o.created_at?.slice(0, 10);
      if (day) revenueByDay[day] = (revenueByDay[day] || 0) + (o.total_price || 0);
    });

    return {
      pageViews, productViews, addToCarts, purchases,
      totalRevenue, completedOrders, cancelledOrders, pendingOrders,
      uniqueBuyers, avgOrderValue, viewToCart, cartToPurchase,
      topCountries, deviceMap, revenueByDay,
    };
  }, [events, orders]);

  // Aggregate top products
  const topProducts = useMemo(() => {
    const map: Record<string, { title: string; photo: string; qty: number; revenue: number }> = {};
    topItems.forEach((item: any) => {
      const id = item.item_id;
      if (!map[id]) map[id] = { title: item.catalog_items?.title || "Unknown", photo: item.catalog_items?.photo_url || "", qty: 0, revenue: 0 };
      map[id].qty += item.quantity || 1;
      map[id].revenue += (item.unit_price || 0) * (item.quantity || 1);
    });
    return Object.entries(map).sort(([, a], [, b]) => b.revenue - a.revenue).slice(0, 5);
  }, [topItems]);

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> Store Insights</h3>
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="h-7 w-20 text-[10px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7d" className="text-xs">7 days</SelectItem>
            <SelectItem value="30d" className="text-xs">30 days</SelectItem>
            <SelectItem value="90d" className="text-xs">90 days</SelectItem>
            <SelectItem value="all" className="text-xs">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Revenue", value: `${metrics.totalRevenue.toFixed(0)}€`, icon: DollarSign, color: "text-green-600" },
          { label: "Orders", value: metrics.completedOrders, icon: ShoppingCart, color: "text-primary" },
          { label: "Page Views", value: metrics.pageViews, icon: Eye, color: "text-blue-600" },
          { label: "Customers", value: metrics.uniqueBuyers, icon: Users, color: "text-purple-600" },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className={`h-8 w-8 rounded-full bg-muted flex items-center justify-center ${kpi.color}`}>
                <kpi.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-lg font-bold">{kpi.value}</p>
                <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Avg Order Value */}
      <Card>
        <CardContent className="p-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground">Avg Order Value</p>
            <p className="text-sm font-bold">{metrics.avgOrderValue.toFixed(2)}€</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Pending</p>
            <p className="text-sm font-bold">{metrics.pendingOrders}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Cancelled</p>
            <p className="text-sm font-bold text-destructive">{metrics.cancelledOrders}</p>
          </div>
        </CardContent>
      </Card>

      {/* Conversion Funnel */}
      <Card>
        <CardContent className="p-3 space-y-2">
          <h4 className="text-xs font-semibold flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Conversion Funnel</h4>
          <div className="space-y-1.5">
            {[
              { label: "Page Views", value: metrics.pageViews, pct: "100%" },
              { label: "Product Views", value: metrics.productViews, pct: metrics.pageViews ? `${((metrics.productViews / metrics.pageViews) * 100).toFixed(1)}%` : "0%" },
              { label: "Add to Cart", value: metrics.addToCarts, pct: `${metrics.viewToCart}%` },
              { label: "Purchase", value: metrics.purchases, pct: `${metrics.cartToPurchase}%` },
            ].map((step, i) => (
              <div key={step.label} className="flex items-center gap-2">
                <div className="w-24 text-[10px] text-muted-foreground">{step.label}</div>
                <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary/60 rounded-full transition-all"
                    style={{ width: `${Math.max(2, (step.value / Math.max(metrics.pageViews, 1)) * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] font-medium w-12 text-right">{step.value}</span>
                <span className="text-[9px] text-muted-foreground w-10 text-right">{step.pct}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Products */}
      {topProducts.length > 0 && (
        <Card>
          <CardContent className="p-3 space-y-2">
            <h4 className="text-xs font-semibold flex items-center gap-1"><Package className="h-3 w-3" /> Top Products</h4>
            {topProducts.map(([id, p], i) => (
              <div key={id} className="flex items-center gap-2 py-1.5 border-b border-border last:border-0">
                <span className="text-[10px] text-muted-foreground w-4">{i + 1}</span>
                {p.photo && <img src={p.photo} alt="" className="w-8 h-8 rounded object-cover" />}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{p.title}</p>
                  <p className="text-[10px] text-muted-foreground">{p.qty} sold</p>
                </div>
                <span className="text-xs font-bold">{p.revenue.toFixed(0)}€</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Country & Device */}
      <div className="grid grid-cols-2 gap-2">
        {metrics.topCountries.length > 0 && (
          <Card>
            <CardContent className="p-3 space-y-1">
              <h4 className="text-[10px] font-semibold">Top Countries</h4>
              {metrics.topCountries.map(([c, n]) => (
                <div key={c} className="flex justify-between text-[10px]">
                  <span>{c}</span><span className="font-medium">{n}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
        {Object.keys(metrics.deviceMap).length > 0 && (
          <Card>
            <CardContent className="p-3 space-y-1">
              <h4 className="text-[10px] font-semibold">Devices</h4>
              {Object.entries(metrics.deviceMap).sort(([, a], [, b]) => b - a).map(([d, n]) => (
                <div key={d} className="flex justify-between text-[10px]">
                  <span>{d}</span><span className="font-medium">{n}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Revenue trend (mini sparkline) */}
      {Object.keys(metrics.revenueByDay).length > 0 && (
        <Card>
          <CardContent className="p-3">
            <h4 className="text-[10px] font-semibold mb-2">Revenue Trend</h4>
            <div className="flex items-end gap-[2px] h-16">
              {Object.entries(metrics.revenueByDay).sort(([a], [b]) => a.localeCompare(b)).slice(-14).map(([day, rev]) => {
                const max = Math.max(...Object.values(metrics.revenueByDay));
                const h = max > 0 ? (rev / max) * 100 : 0;
                return (
                  <div key={day} className="flex-1 flex flex-col items-center gap-0.5">
                    <div className="w-full bg-primary/60 rounded-t" style={{ height: `${Math.max(2, h)}%` }} title={`${day}: ${rev.toFixed(0)}€`} />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[8px] text-muted-foreground">{Object.keys(metrics.revenueByDay).sort()[0]?.slice(5)}</span>
              <span className="text-[8px] text-muted-foreground">{Object.keys(metrics.revenueByDay).sort().pop()?.slice(5)}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
