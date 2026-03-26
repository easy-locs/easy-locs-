/**
 * BoostDashboardPage — Campaign management cockpit.
 * Overview + Campaign list + Create + Analytics + Leads.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles, TrendingUp, Eye, MousePointerClick, Users,
  Plus, Pause, Play, BarChart3, Target, Zap,
} from "lucide-react";
import { formatMoneyByCountry } from "@/lib/currency-engine";
import { BoostCampaignCreator } from "@/components/boost/BoostCampaignCreator";

export default function BoostDashboardPage() {
  const { user } = useAuth();
  const [showCreator, setShowCreator] = useState(false);

  // Fetch campaigns
  const { data: campaigns = [], refetch } = useQuery({
    queryKey: ["boost-campaigns", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await (supabase as any)
        .from("boost_campaigns")
        .select("*")
        .eq("owner_user_id", user.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch aggregate analytics
  const { data: analytics } = useQuery({
    queryKey: ["boost-analytics-overview", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const ids = campaigns.map((c: any) => c.id);
      if (!ids.length) return null;

      const [impressions, clicks, leads] = await Promise.all([
        (supabase as any).from("boost_impressions").select("id", { count: "exact", head: true }).in("campaign_id", ids),
        (supabase as any).from("boost_clicks").select("id", { count: "exact", head: true }).in("campaign_id", ids),
        (supabase as any).from("boost_leads").select("id", { count: "exact", head: true }).in("campaign_id", ids),
      ]);

      return {
        impressions: impressions.count || 0,
        clicks: clicks.count || 0,
        leads: leads.count || 0,
        ctr: impressions.count ? ((clicks.count || 0) / impressions.count * 100).toFixed(2) : "0",
      };
    },
    enabled: !!user?.id && campaigns.length > 0,
  });

  // Fetch leads
  const { data: recentLeads = [] } = useQuery({
    queryKey: ["boost-leads", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const ids = campaigns.map((c: any) => c.id);
      if (!ids.length) return [];
      const { data } = await (supabase as any)
        .from("boost_leads")
        .select("*")
        .in("campaign_id", ids)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!user?.id && campaigns.length > 0,
  });

  const activeCampaigns = campaigns.filter((c: any) => c.status === "active");
  const totalSpend = campaigns.reduce((sum: number, c: any) => sum + (c.spent || 0), 0);

  const toggleCampaignStatus = async (id: string, current: string) => {
    const next = current === "active" ? "paused" : "active";
    await (supabase as any).from("boost_campaigns").update({ status: next }).eq("id", id);
    refetch();
  };

  return (
    <div className="app-mobile-page bg-background">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              Boost Center
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage campaigns, leads & analytics
            </p>
          </div>
          <Button onClick={() => setShowCreator(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" /> New Campaign
          </Button>
        </div>

        {/* Overview KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPICard icon={Eye} label="Impressions" value={analytics?.impressions ?? 0} />
          <KPICard icon={MousePointerClick} label="Clicks" value={analytics?.clicks ?? 0} />
          <KPICard icon={Users} label="Leads" value={analytics?.leads ?? 0} />
          <KPICard icon={TrendingUp} label="CTR" value={`${analytics?.ctr ?? 0}%`} />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="campaigns">
          <TabsList className="w-full">
            <TabsTrigger value="campaigns" className="flex-1">
              <Zap className="h-3.5 w-3.5 mr-1" /> Campaigns
            </TabsTrigger>
            <TabsTrigger value="leads" className="flex-1">
              <Target className="h-3.5 w-3.5 mr-1" /> Leads
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex-1">
              <BarChart3 className="h-3.5 w-3.5 mr-1" /> Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns" className="space-y-3 mt-4">
            {campaigns.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Sparkles className="h-10 w-10 text-primary mx-auto mb-3 opacity-40" />
                  <p className="text-sm text-muted-foreground">No campaigns yet</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowCreator(true)}>
                    Create your first campaign
                  </Button>
                </CardContent>
              </Card>
            ) : (
              campaigns.map((c: any) => (
                <Card key={c.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm">{c.entity_id}</p>
                          <Badge variant={c.status === "active" ? "default" : "secondary"} className="text-[10px]">
                            {c.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {c.canonical_vertical} · {c.objective} · {c.country || "Global"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Budget: {formatMoneyByCountry(c.total_budget, c.country || "AE")} · Spent: {formatMoneyByCountry(c.spent || 0, c.country || "AE")}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleCampaignStatus(c.id, c.status)}
                      >
                        {c.status === "active" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="leads" className="space-y-3 mt-4">
            {recentLeads.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Target className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                  <p className="text-sm text-muted-foreground">No leads yet</p>
                </CardContent>
              </Card>
            ) : (
              recentLeads.map((l: any) => (
                <Card key={l.id}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{l.lead_type} · {l.canonical_vertical}</p>
                        <p className="text-xs text-muted-foreground">{l.source_surface} · {l.country} · Score: {l.score}</p>
                      </div>
                      <Badge variant={l.status === "new" ? "default" : "secondary"} className="text-[10px]">
                        {l.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="analytics" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Campaign Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Active campaigns</span>
                    <span className="font-semibold">{activeCampaigns.length}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Total spend</span>
                    <span className="font-semibold">{formatMoneyByCountry(totalSpend, "AE")}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Total impressions</span>
                    <span className="font-semibold">{(analytics?.impressions ?? 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Total clicks</span>
                    <span className="font-semibold">{(analytics?.clicks ?? 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Total leads</span>
                    <span className="font-semibold">{(analytics?.leads ?? 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Avg CTR</span>
                    <span className="font-semibold">{analytics?.ctr ?? 0}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Campaign Creator Modal */}
        {showCreator && (
          <BoostCampaignCreator
            onClose={() => setShowCreator(false)}
            onCreated={() => { setShowCreator(false); refetch(); }}
          />
        )}
      </div>
    </div>
  );
}

function KPICard({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-3 text-center">
        <Icon className="h-4 w-4 text-primary mx-auto mb-1" />
        <p className="text-lg font-bold">{typeof value === "number" ? value.toLocaleString() : value}</p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
