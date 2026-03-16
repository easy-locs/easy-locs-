/**
 * DealAnalyticsDashboard — Deal conversion metrics & funnel visualization
 * PASS55 Block 9d: Deal Analytics
 */
import { motion } from "framer-motion";
import {
  TrendingUp, Target, Clock, DollarSign, BarChart3,
  ArrowRight, Handshake, XCircle,
} from "lucide-react";
import { useDealAnalytics } from "@/hooks/useDealAnalytics";
import { DEAL_STATUS_LABELS, DEAL_STATUS_COLORS, type DealStatus } from "@/hooks/useDealRoom";
import { useI18n } from "@/lib/i18n";

export default function DealAnalyticsDashboard() {
  const { metrics, loading } = useDealAnalytics();
  const { t } = useI18n();

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-muted/50" />
        ))}
      </div>
    );
  }

  const kpis = [
    {
      icon: Target,
      label: t("deals.total") || "Total Deals",
      value: metrics.total.toString(),
      color: "hsl(var(--primary))",
    },
    {
      icon: TrendingUp,
      label: t("deals.conversion") || "Conversion",
      value: `${metrics.conversionRate}%`,
      color: "hsl(var(--success, 142 76% 36%))",
    },
    {
      icon: DollarSign,
      label: t("deals.avg_value") || "Avg Value",
      value: metrics.avgDealValue > 0
        ? `${metrics.avgDealValue.toLocaleString()} ${metrics.currency}`
        : "—",
      color: "hsl(var(--accent))",
    },
    {
      icon: Clock,
      label: t("deals.avg_close") || "Avg Close",
      value: metrics.avgTimeToClose > 0 ? `${metrics.avgTimeToClose}d` : "—",
      color: "hsl(38 92% 50%)",
    },
  ];

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-border bg-card p-3.5 space-y-1"
          >
            <div className="flex items-center gap-2">
              <kpi.icon className="w-3.5 h-3.5" style={{ color: kpi.color }} />
              <span className="text-[10px] font-medium text-muted-foreground">{kpi.label}</span>
            </div>
            <p className="text-xl font-bold text-foreground">{kpi.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Revenue Summary */}
      {metrics.totalRevenue > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Handshake className="w-4 h-4 text-accent" />
              <span className="text-sm font-bold text-foreground">
                {t("deals.total_revenue") || "Total Deal Revenue"}
              </span>
            </div>
            <span className="text-lg font-black text-foreground">
              {metrics.totalRevenue.toLocaleString()} {metrics.currency}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span>
              {t("deals.avg_rounds") || "Avg rounds"}: {metrics.avgNegotiationRounds}
            </span>
          </div>
        </div>
      )}

      {/* Conversion Funnel */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-accent" />
          <span className="text-sm font-bold text-foreground">
            {t("deals.funnel") || "Deal Funnel"}
          </span>
        </div>

        <div className="space-y-2">
          {metrics.funnel.map((stage, i) => {
            const status = stage.stage as DealStatus;
            const label = DEAL_STATUS_LABELS[status] || stage.stage;
            const colorClass = DEAL_STATUS_COLORS[status] || "bg-muted text-muted-foreground";
            const maxPct = Math.max(...metrics.funnel.map((f) => f.count), 1);
            const barWidth = Math.max(8, Math.round((stage.count / maxPct) * 100));

            return (
              <div key={stage.stage} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${colorClass}`}>
                    {label}
                  </span>
                  <span className="font-medium text-foreground">
                    {stage.count} <span className="text-muted-foreground">({stage.pct}%)</span>
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${barWidth}%` }}
                    transition={{ delay: i * 0.08, duration: 0.4 }}
                    className="h-full rounded-full"
                    style={{ background: "hsl(var(--accent))" }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Deals */}
      {metrics.recentDeals.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {t("deals.recent") || "Recent Deals"}
          </span>
          <div className="space-y-2">
            {metrics.recentDeals.slice(0, 5).map((deal) => {
              const status = deal.status as DealStatus;
              const colorClass = DEAL_STATUS_COLORS[status] || "bg-muted text-muted-foreground";
              const amount = deal.accepted_amount || deal.current_offer_amount;

              return (
                <div key={deal.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground truncate">
                      {deal.context_title || deal.context_type}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(deal.created_at).toLocaleDateString()}
                      {deal.negotiation_round > 0 && ` • R${deal.negotiation_round}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {amount > 0 && (
                      <span className="text-xs font-semibold text-foreground">
                        {amount.toLocaleString()} {deal.current_offer_currency || "EUR"}
                      </span>
                    )}
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${colorClass}`}>
                      {DEAL_STATUS_LABELS[status] || status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {metrics.total === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center space-y-2">
          <Handshake className="w-10 h-10 mx-auto text-muted-foreground/30" />
          <p className="text-sm font-medium text-foreground">
            {t("deals.no_deals") || "No deals yet"}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("deals.no_deals_desc") || "Start a deal from any conversation thread to see analytics here."}
          </p>
        </div>
      )}
    </div>
  );
}
