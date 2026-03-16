/**
 * SellerAnalyticsPro — Advanced analytics: funnel, product heatmap, revenue
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, Eye, ShoppingCart, CreditCard, Package, Loader2, ArrowUp, ArrowDown } from "lucide-react";

interface Props {
  shopId: string;
}

const fmtNum = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

export default function SellerAnalyticsPro({ shopId }: Props) {
  const { user } = useAuth();

  // Orders data for revenue analysis
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["pro-analytics-orders", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("storefront_orders")
        .select("id, total, currency, status, created_at, storefront_order_items(quantity, title, price)")
        .eq("shop_id", shopId).eq("seller_id", user!.id)
        .order("created_at", { ascending: false }).limit(500);
      return data || [];
    },
    enabled: !!user,
  });

  // Catalog items for product analysis
  const { data: items = [] } = useQuery({
    queryKey: ["pro-analytics-items", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("catalog_items")
        .select("id, title, price, currency, stock_quantity, photo_url")
        .eq("shop_id", shopId).order("sort_order");
      return data || [];
    },
  });

  if (isLoading) return <div className="py-4 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" /></div>;

  // Calculate metrics
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400000);

  const recentOrders = orders.filter((o: any) => new Date(o.created_at) >= thirtyDaysAgo);
  const previousOrders = orders.filter((o: any) => {
    const d = new Date(o.created_at);
    return d >= sixtyDaysAgo && d < thirtyDaysAgo;
  });

  const totalRevenue = recentOrders.reduce((s: number, o: any) => s + (o.total || 0), 0);
  const prevRevenue = previousOrders.reduce((s: number, o: any) => s + (o.total || 0), 0);
  const revenueDelta = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue * 100).toFixed(0) : null;

  const completedOrders = recentOrders.filter((o: any) => o.status === "completed").length;
  const cancelledOrders = recentOrders.filter((o: any) => o.status === "cancelled").length;
  const conversionRate = recentOrders.length > 0 ? ((completedOrders / recentOrders.length) * 100).toFixed(1) : "0";

  const avgOrderValue = recentOrders.length > 0 ? totalRevenue / recentOrders.length : 0;

  // Product popularity (by order items)
  const productSales: Record<string, number> = {};
  recentOrders.forEach((o: any) => {
    (o.storefront_order_items || []).forEach((oi: any) => {
      productSales[oi.title] = (productSales[oi.title] || 0) + (oi.quantity || 1);
    });
  });
  const topProducts = Object.entries(productSales).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Revenue by day (last 7 days)
  const dailyRevenue: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    dailyRevenue[d.toLocaleDateString(undefined, { weekday: "short" })] = 0;
  }
  recentOrders.filter((o: any) => new Date(o.created_at) >= new Date(now.getTime() - 7 * 86400000)).forEach((o: any) => {
    const day = new Date(o.created_at).toLocaleDateString(undefined, { weekday: "short" });
    if (dailyRevenue[day] !== undefined) dailyRevenue[day] += (o.total || 0);
  });

  const maxDailyRev = Math.max(1, ...Object.values(dailyRevenue));
  const currency = orders[0]?.currency || "EUR";

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-primary" /> Analytics Pro
      </h3>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-2">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <TrendingUp className="h-4 w-4 text-success" />
              {revenueDelta && (
                <Badge variant="outline" className={`text-[7px] ${Number(revenueDelta) >= 0 ? "text-success" : "text-destructive"}`}>
                  {Number(revenueDelta) >= 0 ? <ArrowUp className="h-2 w-2" /> : <ArrowDown className="h-2 w-2" />}
                  {Math.abs(Number(revenueDelta))}%
                </Badge>
              )}
            </div>
            <p className="text-lg font-bold mt-1">{totalRevenue.toFixed(0)} {currency}</p>
            <p className="text-[9px] text-muted-foreground">Revenue (30d)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <ShoppingCart className="h-4 w-4 text-primary" />
            <p className="text-lg font-bold mt-1">{recentOrders.length}</p>
            <p className="text-[9px] text-muted-foreground">Orders (30d)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <CreditCard className="h-4 w-4 text-info" />
            <p className="text-lg font-bold mt-1">{avgOrderValue.toFixed(0)} {currency}</p>
            <p className="text-[9px] text-muted-foreground">Avg Order Value</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <Package className="h-4 w-4 text-warning" />
            <p className="text-lg font-bold mt-1">{conversionRate}%</p>
            <p className="text-[9px] text-muted-foreground">Completion Rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart (simple bar) */}
      <Card>
        <CardContent className="p-3 space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground">Revenue (Last 7 Days)</h4>
          <div className="flex items-end gap-1 h-20">
            {Object.entries(dailyRevenue).map(([day, rev]) => (
              <div key={day} className="flex-1 flex flex-col items-center gap-0.5">
                <div className="w-full rounded-t bg-primary/80 transition-all" style={{ height: `${(rev / maxDailyRev) * 100}%`, minHeight: rev > 0 ? "4px" : "1px" }} />
                <span className="text-[7px] text-muted-foreground">{day}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Conversion Funnel */}
      <Card>
        <CardContent className="p-3 space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground">Order Funnel (30d)</h4>
          {[
            { label: "Total Orders", value: recentOrders.length, pct: 100, color: "bg-primary" },
            { label: "Accepted", value: recentOrders.filter((o: any) => ["accepted", "preparing", "shipped", "completed"].includes(o.status)).length, pct: recentOrders.length > 0 ? (recentOrders.filter((o: any) => ["accepted", "preparing", "shipped", "completed"].includes(o.status)).length / recentOrders.length * 100) : 0, color: "bg-blue-500" },
            { label: "Completed", value: completedOrders, pct: recentOrders.length > 0 ? (completedOrders / recentOrders.length * 100) : 0, color: "bg-success" },
            { label: "Cancelled", value: cancelledOrders, pct: recentOrders.length > 0 ? (cancelledOrders / recentOrders.length * 100) : 0, color: "bg-destructive" },
          ].map((step) => (
            <div key={step.label} className="space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px]">{step.label}</span>
                <span className="text-[10px] font-bold">{step.value} ({step.pct.toFixed(0)}%)</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${step.color}`} style={{ width: `${step.pct}%` }} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Top Products */}
      {topProducts.length > 0 && (
        <Card>
          <CardContent className="p-3 space-y-1.5">
            <h4 className="text-xs font-semibold text-muted-foreground">🔥 Top Products</h4>
            {topProducts.map(([title, count], i) => (
              <div key={title} className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-primary w-4">{i + 1}</span>
                <p className="text-[11px] flex-1 truncate">{title}</p>
                <Badge variant="secondary" className="text-[8px]">{count} sold</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Low Stock Alert */}
      {items.filter((i: any) => i.stock_quantity != null && i.stock_quantity <= 5).length > 0 && (
        <Card className="border-warning/30">
          <CardContent className="p-3 space-y-1.5">
            <h4 className="text-xs font-semibold text-warning">⚠️ Low Stock</h4>
            {items.filter((i: any) => i.stock_quantity != null && i.stock_quantity <= 5).map((item: any) => (
              <div key={item.id} className="flex items-center gap-2">
                <p className="text-[11px] flex-1 truncate">{item.title}</p>
                <Badge variant="destructive" className="text-[8px]">{item.stock_quantity} left</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
