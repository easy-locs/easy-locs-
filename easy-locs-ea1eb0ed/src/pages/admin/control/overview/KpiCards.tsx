/**
 * KpiCards — ACP Agent 5 (#864). Six live KPI tiles for the Mission
 * Control overview: agents actifs, runs/min, p95 latency, cost $/h,
 * taux d'erreur, DLQ size. Each tile is paired with a sparkline driven
 * by `buckets` (1-min granularity over the last 30 minutes).
 */
import { Activity, AlertTriangle, Cpu, DollarSign, Gauge, Inbox, XOctagon, Zap } from "lucide-react";
import type { OverviewKpis, RunBucket } from "@/services/domain/control-overview.service";
import Sparkline from "./Sparkline";

interface Props {
  kpis: OverviewKpis;
  buckets: RunBucket[];
}

function formatLatency(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function formatCost(usd: number): string {
  if (usd === 0) return "$0";
  if (usd < 1) return `$${usd.toFixed(3)}`;
  if (usd < 100) return `$${usd.toFixed(2)}`;
  return `$${Math.round(usd)}`;
}

export default function KpiCards({ kpis, buckets }: Props) {
  const counts = buckets.map((b) => b.count);
  const errors = buckets.map((b) => b.errors);
  const errorRates = buckets.map((b) => (b.count > 0 ? (b.errors / b.count) * 100 : 0));
  const cumulativeCost: number[] = [];
  let acc = 0;
  for (const b of buckets) {
    acc += b.costUsd;
    cumulativeCost.push(acc);
  }

  const tiles: Array<{
    key: string;
    label: string;
    value: string;
    sub?: string;
    Icon: typeof Activity;
    tone: string;
    spark: number[];
    sparkColor: string;
  }> = [
    {
      key: "agents",
      label: "Agents actifs",
      value: `${kpis.agentsActive}`,
      sub: `/ ${kpis.agentsTotal} total`,
      Icon: Cpu,
      tone: "text-sky-400",
      spark: counts,
      sparkColor: "text-sky-400",
    },
    {
      key: "runs",
      label: "Runs / min",
      value: `${kpis.runsLastMin}`,
      sub: `${kpis.runsLastHour}/h`,
      Icon: Activity,
      tone: "text-emerald-400",
      spark: counts,
      sparkColor: "text-emerald-400",
    },
    {
      key: "p95",
      label: "p95 latence",
      value: formatLatency(kpis.p95LatencyMs),
      Icon: Gauge,
      tone: "text-amber-400",
      spark: counts,
      sparkColor: "text-amber-400",
    },
    {
      key: "cost",
      label: "Coût $/h",
      value: formatCost(kpis.costPerHourUsd),
      Icon: DollarSign,
      tone: "text-violet-400",
      spark: cumulativeCost,
      sparkColor: "text-violet-400",
    },
    {
      key: "error",
      label: "Taux d'erreur",
      value: `${kpis.errorRatePct.toFixed(1)}%`,
      sub: kpis.errorRatePct >= 5 ? "above SLO" : "ok",
      Icon: kpis.errorRatePct >= 5 ? XOctagon : Zap,
      tone: kpis.errorRatePct >= 5 ? "text-red-400" : "text-emerald-400",
      spark: errorRates,
      sparkColor: kpis.errorRatePct >= 5 ? "text-red-400" : "text-emerald-400",
    },
    {
      key: "dlq",
      label: "DLQ pending",
      value: `${kpis.dlqPending}`,
      sub: kpis.dlqPending > 50 ? "critical" : kpis.dlqPending > 10 ? "watch" : "clean",
      Icon: kpis.dlqPending > 50 ? AlertTriangle : Inbox,
      tone: kpis.dlqPending > 50 ? "text-red-400" : kpis.dlqPending > 10 ? "text-amber-400" : "text-emerald-400",
      spark: errors,
      sparkColor: kpis.dlqPending > 50 ? "text-red-400" : "text-amber-400",
    },
  ];

  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}
      data-testid="control-overview-kpis"
    >
      {tiles.map((t) => (
        <div
          key={t.key}
          className="rounded-xl border border-border/40 bg-card p-3 flex flex-col gap-2"
          data-testid={`control-overview-kpi-${t.key}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[0.625rem] uppercase tracking-wide text-muted-foreground">
              {t.label}
            </span>
            <t.Icon className={`w-4 h-4 ${t.tone}`} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-semibold tabular-nums ${t.tone}`}>{t.value}</span>
            {t.sub && (
              <span className="text-[0.625rem] text-muted-foreground">{t.sub}</span>
            )}
          </div>
          <div className={t.sparkColor}>
            <Sparkline values={t.spark} ariaLabel={`${t.label} trend`} />
          </div>
        </div>
      ))}
    </div>
  );
}
