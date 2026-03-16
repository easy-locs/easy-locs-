/**
 * StorefrontAnalytics — Provider storefront performance metrics.
 * Views, contact clicks, conversion rate, top services.
 * PASS55 Block E2: Seller Deep
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Eye, MousePointerClick, TrendingUp, BarChart3,
  ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface StorefrontAnalyticsProps {
  providerId: string;
  services: any[];
}

export default function StorefrontAnalytics({ providerId, services }: StorefrontAnalyticsProps) {
  const { orgId } = useAuth();

  // Fetch contact clicks for this org's services
  const { data: clicks = [] } = useQuery({
    queryKey: ["storefront_clicks", orgId],
    queryFn: async () => {
      const { data } = await supabase
        .from("contact_clicks")
        .select("*")
        .eq("org_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(500);
      return data || [];
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });

  // Fetch contact reveals
  const { data: reveals = [] } = useQuery({
    queryKey: ["storefront_reveals", orgId],
    queryFn: async () => {
      const { data } = await supabase
        .from("contact_reveals")
        .select("*")
        .eq("org_id", orgId!)
        .limit(500);
      return data || [];
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });

  const metrics = useMemo(() => {
    const totalViews = services.reduce((acc, s) => acc + (s.views_count || 0), 0);
    const totalClicks = clicks.length;
    const totalReveals = reveals.length;
    const conversionRate = totalViews > 0 ? Math.round((totalClicks / totalViews) * 100) : 0;

    // Last 7 days vs previous 7 days
    const now = Date.now();
    const week = 7 * 24 * 60 * 60 * 1000;
    const recentClicks = clicks.filter((c: any) => now - new Date(c.created_at).getTime() < week).length;
    const prevClicks = clicks.filter((c: any) => {
      const age = now - new Date(c.created_at).getTime();
      return age >= week && age < week * 2;
    }).length;
    const clicksTrend = prevClicks > 0 ? Math.round(((recentClicks - prevClicks) / prevClicks) * 100) : recentClicks > 0 ? 100 : 0;

    // Top services by clicks
    const clicksByService: Record<string, number> = {};
    clicks.forEach((c: any) => {
      if (c.service_id) clicksByService[c.service_id] = (clicksByService[c.service_id] || 0) + 1;
    });
    const topServices = Object.entries(clicksByService)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([serviceId, count]) => {
        const svc = services.find((s: any) => s.id === serviceId);
        return { id: serviceId, title: svc?.title || "Service", clicks: count };
      });

    // Channel breakdown
    const byChannel: Record<string, number> = {};
    clicks.forEach((c: any) => { byChannel[c.channel] = (byChannel[c.channel] || 0) + 1; });

    return { totalViews, totalClicks, totalReveals, conversionRate, clicksTrend, topServices, byChannel };
  }, [services, clicks, reveals]);

  const kpis = [
    {
      icon: Eye,
      label: "Vues totales",
      value: metrics.totalViews.toLocaleString(),
      color: "hsl(var(--primary))",
    },
    {
      icon: MousePointerClick,
      label: "Clics contact",
      value: metrics.totalClicks.toString(),
      color: "hsl(var(--accent))",
      trend: metrics.clicksTrend,
    },
    {
      icon: TrendingUp,
      label: "Taux conversion",
      value: `${metrics.conversionRate}%`,
      color: "hsl(142 76% 36%)",
    },
    {
      icon: BarChart3,
      label: "Révélations",
      value: metrics.totalReveals.toString(),
      color: "hsl(38 92% 50%)",
    },
  ];

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-border bg-card p-3 space-y-1"
          >
            <div className="flex items-center gap-2">
              <kpi.icon className="w-3.5 h-3.5" style={{ color: kpi.color }} />
              <span className="text-[10px] text-muted-foreground font-medium">{kpi.label}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-lg font-bold text-foreground">{kpi.value}</p>
              {kpi.trend !== undefined && kpi.trend !== 0 && (
                <span className="flex items-center gap-0.5 text-[10px] font-semibold"
                  style={{ color: kpi.trend > 0 ? "hsl(142 76% 36%)" : "hsl(0 84% 60%)" }}>
                  {kpi.trend > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {Math.abs(kpi.trend)}%
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Top Services */}
      {metrics.topServices.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Top Services
          </h3>
          <div className="space-y-2">
            {metrics.topServices.map((svc, i) => (
              <div key={svc.id} className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-muted-foreground w-4">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{svc.title}</p>
                </div>
                <span className="text-xs font-semibold text-primary">{svc.clicks} clics</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Channel Breakdown */}
      {Object.keys(metrics.byChannel).length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Canaux de contact
          </h3>
          <div className="space-y-2">
            {Object.entries(metrics.byChannel).map(([channel, count]) => {
              const total = metrics.totalClicks || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={channel} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-foreground capitalize">{channel}</span>
                    <span className="text-[10px] text-muted-foreground">{count} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: "hsl(var(--primary))" }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: 0.2, duration: 0.5 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
