import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useUiEngine } from "@/hooks/useUiEngine";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchReferralFunnelData,
  type ReferralFunnelData,
  type DailyFunnelPoint,
} from "@/services/referralFunnel.service";
import {
  Share2,
  MousePointerClick,
  UserPlus,
  ShoppingBag,
  BadgeCheck,
  ArrowDown,
  Loader2,
  TrendingUp,
  CalendarDays,
} from "lucide-react";

type TimeRange = 7 | 14 | 30;

const STAGE_ICONS = [Share2, MousePointerClick, UserPlus, ShoppingBag, BadgeCheck];

function FunnelBar({
  label,
  count,
  maxCount,
  color,
  icon: Icon,
}: {
  label: string;
  count: number;
  maxCount: number;
  color: string;
  icon: React.ElementType;
}) {
  const pct = maxCount > 0 ? Math.max((count / maxCount) * 100, 4) : 4;
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0" style={{ background: `${color}20` }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-sm font-medium text-foreground">{label}</span>
          <span className="text-lg font-bold text-foreground tabular-nums">{count.toLocaleString()}</span>
        </div>
        <div className="h-2.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{ width: `${pct}%`, background: color }}
          />
        </div>
      </div>
    </div>
  );
}

function ConversionArrow({ from, to, rate }: { from: string; to: string; rate: number }) {
  return (
    <div className="flex items-center justify-center gap-2 py-1">
      <ArrowDown size={14} className="text-muted-foreground" />
      <span className="text-xs font-semibold tabular-nums" style={{ color: rate > 50 ? "#22c55e" : rate > 20 ? "#f59e0b" : "#ef4444" }}>
        {rate.toFixed(1)}%
      </span>
      <span className="text-xs text-muted-foreground hidden sm:inline">
        {from} → {to}
      </span>
    </div>
  );
}

function MiniChart({ data, dataKey, color, label }: { data: DailyFunnelPoint[]; dataKey: keyof DailyFunnelPoint; color: string; label: string }) {
  const values = data.map((d) => Number(d[dataKey]));
  const max = Math.max(...values, 1);
  return (
    <div className="bg-card rounded-xl p-4 shadow-card border border-border/50">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full" style={{ background: color }} />
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-end gap-px h-16">
        {data.map((d, i) => {
          const val = Number(d[dataKey]);
          const h = max > 0 ? Math.max((val / max) * 100, 2) : 2;
          return (
            <div key={i} className="flex-1 flex flex-col items-center group relative">
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-[0.625rem] px-1.5 py-0.5 rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                {d.date.slice(5)}: {val}
              </div>
              <div
                className="w-full rounded-t transition-all duration-300"
                style={{ height: `${h}%`, background: color, minHeight: 2, opacity: 0.85 }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-[0.625rem] text-muted-foreground">{data[0]?.date.slice(5)}</span>
        <span className="text-[0.625rem] text-muted-foreground">{data[data.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
}

export default function ReferralFunnelDashboard() {
  useUiEngine("referral-funnel");

  const { user } = useAuth();
  const [range, setRange] = useState<TimeRange>(30);
  const [data, setData] = useState<ReferralFunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchReferralFunnelData(user.id, range);
      setData(result);
    } catch (err: any) {
      console.error("[ReferralFunnel] Failed to load data:", err);
      setError(err?.message ?? "Failed to load referral funnel data");
    } finally {
      setLoading(false);
    }
  }, [range, user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData, user]);

  const overallRate =
    data && data.stages[0].count > 0
      ? ((data.stages[data.stages.length - 1].count / data.stages[0].count) * 100).toFixed(1)
      : "0.0";

  const totalEvents = data
    ? data.stages.reduce((s, st) => s + st.count, 0)
    : 0;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-accent" />
              Referral Funnel
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track the full journey from share to credited conversion
            </p>
          </div>
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            {([7, 14, 30] as TimeRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  range === r
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r}d
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          </div>
        )}

        {error && !loading && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-6 text-center">
            <p className="text-destructive text-sm">{error}</p>
            <button onClick={loadData} className="mt-3 text-xs underline text-destructive hover:text-destructive/80">
              Retry
            </button>
          </div>
        )}

        {data && !loading && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-card rounded-xl p-5 shadow-card border border-border/50 text-center">
                <CalendarDays className="h-5 w-5 text-accent mx-auto mb-2" />
                <div className="text-xl font-bold text-foreground tabular-nums">{range}d</div>
                <div className="text-xs text-muted-foreground">Time Window</div>
              </div>
              <div className="bg-card rounded-xl p-5 shadow-card border border-border/50 text-center">
                <TrendingUp className="h-5 w-5 text-accent mx-auto mb-2" />
                <div className="text-xl font-bold text-foreground tabular-nums">{totalEvents.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Total Events</div>
              </div>
              <div className="bg-card rounded-xl p-5 shadow-card border border-border/50 text-center col-span-2 sm:col-span-1">
                <BadgeCheck className="h-5 w-5 text-accent mx-auto mb-2" />
                <div className="text-xl font-bold text-foreground tabular-nums">{overallRate}%</div>
                <div className="text-xs text-muted-foreground">End-to-End Rate</div>
              </div>
            </div>

            <div className="bg-card rounded-xl p-6 shadow-card border border-border/50 mb-8">
              <h2 className="text-base font-semibold text-foreground mb-5">Conversion Funnel</h2>
              <div className="space-y-1">
                {data.stages.map((stage, i) => (
                  <div key={stage.key}>
                    <FunnelBar
                      label={stage.label}
                      count={stage.count}
                      maxCount={data.stages[0].count}
                      color={stage.color}
                      icon={STAGE_ICONS[i] ?? Share2}
                    />
                    {i < data.conversions.length && (
                      <ConversionArrow
                        from={data.conversions[i].from}
                        to={data.conversions[i].to}
                        rate={data.conversions[i].rate}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-accent" />
                Performance Over Time
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <MiniChart data={data.timeSeries} dataKey="shares" color="#3b82f6" label="Shares" />
                <MiniChart data={data.timeSeries} dataKey="clicks" color="#8b5cf6" label="Clicks" />
                <MiniChart data={data.timeSeries} dataKey="conversions" color="#22c55e" label="Conversions" />
              </div>
            </div>

            <div className="bg-card rounded-xl p-5 shadow-card border border-border/50">
              <h2 className="text-base font-semibold text-foreground mb-4">Stage Breakdown</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Stage</th>
                      <th className="text-right py-2 px-4 text-muted-foreground font-medium">Count</th>
                      <th className="text-right py-2 px-4 text-muted-foreground font-medium">Drop-off</th>
                      <th className="text-right py-2 pl-4 text-muted-foreground font-medium">Conv. Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.stages.map((stage, i) => {
                      const prev = i > 0 ? data.stages[i - 1].count : stage.count;
                      const dropoff = prev > 0 ? prev - stage.count : 0;
                      const rate = prev > 0 ? ((stage.count / prev) * 100).toFixed(1) : "—";
                      return (
                        <tr key={stage.key} className="border-b border-border/50 last:border-0">
                          <td className="py-2.5 pr-4">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ background: stage.color }} />
                              <span className="text-foreground">{stage.label}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-4 text-right font-medium text-foreground tabular-nums">
                            {stage.count.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-4 text-right text-muted-foreground tabular-nums">
                            {i === 0 ? "—" : `-${dropoff.toLocaleString()}`}
                          </td>
                          <td className="py-2.5 pl-4 text-right tabular-nums">
                            {i === 0 ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              <span
                                className="font-medium"
                                style={{
                                  color:
                                    Number(rate) > 50
                                      ? "#22c55e"
                                      : Number(rate) > 20
                                      ? "#f59e0b"
                                      : "#ef4444",
                                }}
                              >
                                {rate}%
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
