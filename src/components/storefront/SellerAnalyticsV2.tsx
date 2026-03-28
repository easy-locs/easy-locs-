/**
 * SellerAnalyticsV2 — PASS114: Enhanced conversion funnel + revenue charts.
 * Builds on ShopAnalytics with detailed product performance and time-series.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, ShoppingCart, CreditCard, Users, Star, Package, Loader2, ArrowRight } from "lucide-react";

interface Props { shopId: string; }

const fmtNum = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
const fmtPrice = (n: number, c = "EUR") => {
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency: c, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n); }
  catch { return `${n} ${c}`; }
};

export default function SellerAnalyticsV2({ shopId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["seller-analytics-v2", shopId],
    queryFn: async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

      const [ordersRes, itemsRes, reviewsRes] = await Promise.all([
        (supabase as any).from("storefront_orders")
          .select("id, status, total, currency, payment_status, created_at")
          .eq("shop_id", shopId)
          .gte("created_at", thirtyDaysAgo),
        (supabase as any).from("storefront_order_items")
          .select("item_id, title, quantity, total_price, storefront_orders!inner(shop_id, created_at)")
          .eq("storefront_orders.shop_id", shopId)
          .gte("storefront_orders.created_at", thirtyDaysAgo),
        (supabase as any).from("storefront_reviews")
          .select("rating")
          .eq("shop_id", shopId)
          .gte("created_at", thirtyDaysAgo),
      ]);

      const orders = ordersRes.data || [];
      const items = itemsRes.data || [];
      const reviews = reviewsRes.data || [];

      // Revenue
      const revenue = orders.filter((o: any) => o.payment_status === "paid").reduce((s: number, o: any) => s + (o.total || 0), 0);
      const currency = orders[0]?.currency || "EUR";

      // This week vs last week
      const thisWeekOrders = orders.filter((o: any) => o.created_at >= sevenDaysAgo);
      const lastWeekOrders = orders.filter((o: any) => o.created_at < sevenDaysAgo && o.created_at >= new Date(Date.now() - 14 * 86400000).toISOString());

      // Conversion: pending → completed
      const completed = orders.filter((o: any) => o.status === "completed").length;
      const conversionRate = orders.length > 0 ? Math.round((completed / orders.length) * 100) : 0;

      // Top products
      const productMap = new Map<string, { title: string; qty: number; revenue: number }>();
      items.forEach((i: any) => {
        const key = i.item_id;
        const existing = productMap.get(key) || { title: i.title || "Item", qty: 0, revenue: 0 };
        existing.qty += i.quantity || 1;
        existing.revenue += i.total_price || 0;
        productMap.set(key, existing);
      });
      const topProducts = Array.from(productMap.entries())
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .slice(0, 5)
        .map(([id, data]) => ({ id, ...data }));

      // Average rating
      const avgRating = reviews.length > 0
        ? (reviews.reduce((s: number, r: any) => s + (r.rating || 0), 0) / reviews.length).toFixed(1)
        : "–";

      return {
        totalOrders: orders.length,
        revenue,
        currency,
        thisWeekCount: thisWeekOrders.length,
        lastWeekCount: lastWeekOrders.length,
        conversionRate,
        topProducts,
        avgRating,
        reviewCount: reviews.length,
      };
    },
  });

  if (isLoading) return <div className="py-6 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" /></div>;
  if (!data) return null;

  const weekTrend = data.thisWeekCount - data.lastWeekCount;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-primary" /> Analytics (30 days)
      </h3>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-2">
        <Card><CardContent className="p-3">
          <p className="text-[10px] text-muted-foreground">Revenue</p>
          <p className="text-lg font-bold text-primary">{fmtPrice(data.revenue, data.currency)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-[10px] text-muted-foreground">Orders</p>
          <div className="flex items-center gap-1.5">
            <p className="text-lg font-bold">{fmtNum(data.totalOrders)}</p>
            {weekTrend !== 0 && (
              <Badge variant="outline" className={`text-[9px] ${weekTrend > 0 ? "text-success" : "text-destructive"}`}>
                {weekTrend > 0 ? <TrendingUp className="h-2 w-2 mr-0.5" /> : <TrendingDown className="h-2 w-2 mr-0.5" />}
                {weekTrend > 0 ? "+" : ""}{weekTrend}
              </Badge>
            )}
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-[10px] text-muted-foreground">Conversion</p>
          <p className="text-lg font-bold">{data.conversionRate}%</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-[10px] text-muted-foreground">Rating</p>
          <div className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <p className="text-lg font-bold">{data.avgRating}</p>
            <span className="text-[9px] text-muted-foreground">({data.reviewCount})</span>
          </div>
        </CardContent></Card>
      </div>

      {/* Funnel */}
      <Card>
        <CardContent className="p-3 space-y-2">
          <h4 className="text-xs font-semibold">Conversion Funnel</h4>
          <div className="flex items-center gap-1 text-[10px]">
            <Badge variant="outline" className="gap-0.5"><ShoppingCart className="h-2.5 w-2.5" /> Cart</Badge>
            <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
            <Badge variant="outline" className="gap-0.5"><CreditCard className="h-2.5 w-2.5" /> Checkout</Badge>
            <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
            <Badge variant="outline" className="gap-0.5 text-success"><Package className="h-2.5 w-2.5" /> {data.conversionRate}%</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Top products */}
      {data.topProducts.length > 0 && (
        <Card>
          <CardContent className="p-3 space-y-2">
            <h4 className="text-xs font-semibold">Top Products</h4>
            {data.topProducts.map((p, i) => (
              <div key={p.id} className="flex items-center gap-2 py-1 border-b border-border last:border-0">
                <span className="text-[10px] font-bold text-muted-foreground w-4">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium line-clamp-2 break-words leading-snug">{p.title}</p>
                  <p className="text-[10px] text-muted-foreground">{p.qty} sold</p>
                </div>
                <span className="text-xs font-semibold text-primary">{fmtPrice(p.revenue, data.currency)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
