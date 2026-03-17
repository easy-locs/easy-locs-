/**
 * GrowthDashboard — PASS120: Seller growth metrics + referral tracking.
 * Auto-populated by DB triggers on every order.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Users, Repeat, Share2, DollarSign, Loader2, BarChart3 } from "lucide-react";

interface Props {
  shopId: string;
}

export default function GrowthDashboard({ shopId }: Props) {
  const { data: metrics = [], isLoading } = useQuery({
    queryKey: ["growth-metrics", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_growth_metrics")
        .select("*")
        .eq("shop_id", shopId)
        .order("metric_date", { ascending: false })
        .limit(30);
      return data || [];
    },
  });

  if (isLoading) return <div className="py-4 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" /></div>;

  // Aggregate last 7 days vs previous 7 days
  const last7 = metrics.slice(0, 7);
  const prev7 = metrics.slice(7, 14);

  const sum = (arr: any[], key: string) => arr.reduce((s, m) => s + (Number(m[key]) || 0), 0);

  const totalRevenue = sum(last7, "total_revenue");
  const prevRevenue = sum(prev7, "total_revenue");
  const revenueGrowth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue * 100) : 0;

  const newCustomers = sum(last7, "new_customers");
  const returningCustomers = sum(last7, "returning_customers");
  const referralOrders = sum(last7, "referral_orders");
  const organicOrders = sum(last7, "organic_orders");
  const totalOrders = referralOrders + organicOrders;
  const referralRate = totalOrders > 0 ? (referralOrders / totalOrders * 100) : 0;

  const kpis = [
    { label: "Revenue (7d)", value: `${totalRevenue.toFixed(0)}`, icon: DollarSign, change: revenueGrowth, color: "text-primary" },
    { label: "New Customers", value: String(newCustomers), icon: Users, color: "text-success" },
    { label: "Returning", value: String(returningCustomers), icon: Repeat, color: "text-primary" },
    { label: "Referral Rate", value: `${referralRate.toFixed(0)}%`, icon: Share2, color: "text-warning" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" /> Growth
        </h4>
        <Badge variant="outline" className="text-[10px]">Last 7 days</Badge>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {kpis.map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="p-3 text-center">
              <kpi.icon className={`h-4 w-4 mx-auto mb-1 ${kpi.color}`} />
              <p className="text-lg font-bold text-foreground">{kpi.value}</p>
              <p className="text-[9px] text-muted-foreground">{kpi.label}</p>
              {kpi.change !== undefined && kpi.change !== 0 && (
                <Badge variant={kpi.change > 0 ? "default" : "destructive"} className="text-[8px] mt-1">
                  {kpi.change > 0 ? "+" : ""}{kpi.change.toFixed(0)}%
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Mini chart — last 7 days bar */}
      {last7.length > 0 && (
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <BarChart3 className="h-3 w-3" /> Daily Revenue
            </p>
            <div className="flex items-end gap-1 h-12">
              {[...last7].reverse().map((m: any, i: number) => {
                const max = Math.max(...last7.map((d: any) => Number(d.total_revenue) || 1));
                const h = Math.max(4, (Number(m.total_revenue) / max) * 48);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                    <div className="w-full rounded-t bg-primary/70 transition-all" style={{ height: `${h}px` }} />
                    <span className="text-[7px] text-muted-foreground">
                      {new Date(m.metric_date).toLocaleDateString(undefined, { weekday: "narrow" })}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {metrics.length === 0 && (
        <Card>
          <CardContent className="py-6 text-center">
            <BarChart3 className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">Growth metrics will appear as orders come in</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
