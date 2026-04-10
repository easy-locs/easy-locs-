import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign, TrendingUp, Users, CreditCard, Percent,
  RefreshCw, ArrowUpRight, Gift, Crown, BarChart3,
  Globe, Zap, Target, ShoppingCart,
} from "lucide-react";
import { revenueService, type RevenueMetrics } from "@/services/revenue.service";
import { subscriptionService, type SubscriptionMetrics } from "@/services/subscription.service";
import { REVENUE_STREAMS, COMMISSION_DISPLAY } from "@/lib/monetization-config";

function kpiCard(label: string, value: string | number, icon: React.ReactNode, trend?: string) {
  return (
    <Card className="border-border/60">
      <CardContent className="flex items-center gap-4 py-5 px-4">
        <div className="rounded-xl bg-primary/10 p-3 text-primary">{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold tabular-nums">{value}</p>
        </div>
        {trend && (
          <Badge variant="secondary" className="gap-1 shrink-0">
            <ArrowUpRight className="h-3 w-3" />{trend}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminMonetizationDashboard() {
  const [revenue, setRevenue] = useState<RevenueMetrics | null>(null);
  const [subscriptions, setSubscriptions] = useState<SubscriptionMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [rev, sub] = await Promise.all([
        revenueService.fetchMetrics(30).catch(() => null),
        subscriptionService.fetchMetrics().catch(() => null),
      ]);
      setRevenue(rev);
      setSubscriptions(sub);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

  const commissionIcons: Record<string, React.ReactNode> = {
    marketplace_order: <ShoppingCart className="h-4 w-4" />,
    food_delivery: <Zap className="h-4 w-4" />,
    service_booking: <Target className="h-4 w-4" />,
    property_rental: <Globe className="h-4 w-4" />,
    wallet_transfer: <CreditCard className="h-4 w-4" />,
  };

  return (
    <div className="min-h-screen bg-background p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="h-7 w-7 text-primary" />
            Monetization Command Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Revenue streams, subscriptions, commissions & growth intelligence
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpiCard("Total Revenue (30d)", revenue ? fmt(revenue.totalRevenue) : "—", <DollarSign className="h-5 w-5" />)}
        {kpiCard("MRR", subscriptions ? fmt(subscriptions.mrr) : "—", <TrendingUp className="h-5 w-5" />)}
        {kpiCard("Active Subscriptions", subscriptions?.totalActive ?? "—", <Users className="h-5 w-5" />)}
        {kpiCard("Avg Revenue/Tx", revenue ? fmt(revenue.avgRevenuePerTransaction) : "—", <BarChart3 className="h-5 w-5" />)}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-4 max-w-lg">
          <TabsTrigger value="overview">Revenue Streams</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
          <TabsTrigger value="growth">Growth</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Active Revenue Streams ({REVENUE_STREAMS.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {REVENUE_STREAMS.map((s) => (
                  <div key={s.stream} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card">
                    <div>
                      <p className="font-medium text-sm">{s.label}</p>
                      <p className="text-xs text-muted-foreground">{s.description}</p>
                    </div>
                    <Badge variant="default">Active</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {revenue && revenue.transactionCount > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Revenue by Stream (30d)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(revenue.byStream).map(([stream, amount]) => (
                    <div key={stream} className="flex items-center justify-between">
                      <span className="text-sm capitalize">{stream.replace(/_/g, " ")}</span>
                      <span className="font-mono text-sm font-medium">{fmt(amount)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="subscriptions" className="space-y-4 mt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Crown className="h-5 w-5 text-amber-500" />
                  Subscription Tiers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(["free", "solo", "team", "company"] as const).map((tier) => (
                  <div key={tier} className="flex items-center justify-between p-3 rounded-lg border border-border/50">
                    <div>
                      <p className="font-medium capitalize">{tier}</p>
                      <p className="text-xs text-muted-foreground">
                        {subscriptionService.tierPrice(tier) === 0 ? "Free" : `$${subscriptionService.tierPrice(tier)}/mo`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold tabular-nums">{subscriptions?.byTier[tier] ?? 0}</p>
                      <p className="text-xs text-muted-foreground">active</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Percent className="h-5 w-5 text-primary" />
                  Subscription Health
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center py-4">
                  <p className="text-4xl font-bold tabular-nums">{subscriptions ? fmt(subscriptions.mrr) : "—"}</p>
                  <p className="text-sm text-muted-foreground">Monthly Recurring Revenue</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold tabular-nums">{subscriptions?.totalActive ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Active Subs</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold tabular-nums">{subscriptions?.churnRate ?? 0}%</p>
                    <p className="text-xs text-muted-foreground">Churn Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="commissions" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Commission Rates by Order Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {COMMISSION_DISPLAY.map((c) => (
                  <div key={c.type} className="flex items-center justify-between p-3 rounded-lg border border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-primary/10 p-2 text-primary">{commissionIcons[c.type] ?? <CreditCard className="h-4 w-4" />}</div>
                      <span className="font-medium text-sm">{c.label}</span>
                    </div>
                    <Badge variant="outline" className="font-mono">{c.rate}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="growth" className="space-y-4 mt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Gift className="h-5 w-5 text-green-500" />
                  Referral System
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between p-3 rounded-lg border border-border/50">
                  <span className="text-sm">Reward per referral</span>
                  <Badge variant="outline">10 AED</Badge>
                </div>
                <div className="flex justify-between p-3 rounded-lg border border-border/50">
                  <span className="text-sm">Viral loops</span>
                  <Badge variant="default">Active</Badge>
                </div>
                <div className="flex justify-between p-3 rounded-lg border border-border/50">
                  <span className="text-sm">Double-sided rewards</span>
                  <Badge variant="default">Enabled</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Globe className="h-5 w-5 text-blue-500" />
                  Global Expansion
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between p-3 rounded-lg border border-border/50">
                  <span className="text-sm">Countries supported</span>
                  <Badge variant="outline">190+</Badge>
                </div>
                <div className="flex justify-between p-3 rounded-lg border border-border/50">
                  <span className="text-sm">Currencies</span>
                  <Badge variant="outline">120+</Badge>
                </div>
                <div className="flex justify-between p-3 rounded-lg border border-border/50">
                  <span className="text-sm">Languages</span>
                  <Badge variant="outline">31</Badge>
                </div>
                <div className="flex justify-between p-3 rounded-lg border border-border/50">
                  <span className="text-sm">Auto currency detection</span>
                  <Badge variant="default">Active</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5 text-orange-500" />
                Network Effect Strategy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48">
                <div className="space-y-3">
                  {[
                    { loop: "More providers → more demand → more orders", status: "active" },
                    { loop: "More users → more wallet activity → more fees", status: "active" },
                    { loop: "More activity → better AI insights → better UX", status: "active" },
                    { loop: "More reviews → more trust → more conversions", status: "active" },
                    { loop: "More data → better pricing → higher revenue", status: "active" },
                    { loop: "Referrals → viral growth → ecosystem lock-in", status: "active" },
                    { loop: "Service history → switching cost → retention", status: "active" },
                    { loop: "Wallet dependency → platform stickiness", status: "active" },
                  ].map((item) => (
                    <div key={item.loop} className="flex items-center justify-between p-3 rounded-lg border border-border/50">
                      <span className="text-sm">{item.loop}</span>
                      <Badge variant="default" className="shrink-0">{item.status}</Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
