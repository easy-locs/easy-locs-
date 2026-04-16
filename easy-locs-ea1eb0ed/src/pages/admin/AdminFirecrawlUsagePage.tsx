import SubPageShell from "@/components/layout/SubPageShell";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useUiEngine } from "@/hooks/useUiEngine";
import { fetchFirecrawlUsageLogs } from "@/repositories/admin-ops.repository";

type Period = "day" | "week" | "month";

const COST_PER_CALL = 0.002;

function groupByPeriod(
  logs: { user_id: string; success: boolean; text_length: number; created_at: string }[],
  period: Period,
) {
  const buckets = new Map<string, { total: number; success: number; failure: number }>();

  for (const log of logs) {
    const d = new Date(log.created_at);
    let key: string;
    if (period === "day") {
      key = d.toISOString().slice(0, 10);
    } else if (period === "week") {
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      key = `W ${weekStart.toISOString().slice(0, 10)}`;
    } else {
      key = d.toISOString().slice(0, 7);
    }

    const bucket = buckets.get(key) ?? { total: 0, success: 0, failure: 0 };
    bucket.total += 1;
    if (log.success) bucket.success += 1;
    else bucket.failure += 1;
    buckets.set(key, bucket);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([label, stats]) => ({ label, ...stats }));
}

function groupByUser(
  logs: { user_id: string; success: boolean; text_length: number; created_at: string }[],
) {
  const users = new Map<string, { total: number; success: number; failure: number; totalTextLength: number }>();

  for (const log of logs) {
    const entry = users.get(log.user_id) ?? { total: 0, success: 0, failure: 0, totalTextLength: 0 };
    entry.total += 1;
    if (log.success) entry.success += 1;
    else entry.failure += 1;
    entry.totalTextLength += log.text_length ?? 0;
    users.set(log.user_id, entry);
  }

  return Array.from(users.entries())
    .sort(([, a], [, b]) => b.total - a.total)
    .map(([userId, stats]) => ({ userId, ...stats }));
}

function formatRate(success: number, total: number): string {
  if (total === 0) return "—";
  return `${((success / total) * 100).toFixed(1)}%`;
}

export default function AdminFirecrawlUsagePage() {
  useUiEngine("admin-adminfirecrawlusagepage");
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>("day");

  const { data: logs, isLoading, isError } = useQuery({
    queryKey: ["admin-firecrawl-usage"],
    queryFn: fetchFirecrawlUsageLogs,
    staleTime: 30000,
  });

  const periodData = logs ? groupByPeriod(logs, period) : [];
  const userData = logs ? groupByUser(logs) : [];
  const totalCalls = logs?.length ?? 0;
  const totalSuccess = logs?.filter((l) => l.success).length ?? 0;
  const totalFailure = totalCalls - totalSuccess;
  const estimatedCost = (totalCalls * COST_PER_CALL).toFixed(2);
  const isAtLimit = totalCalls >= 5000;

  return (
    <SubPageShell noContentPad className="bg-background">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">&#x2190;</button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Firecrawl API Usage</h1>
          <p className="text-xs text-muted-foreground">Usage monitoring &amp; cost tracking</p>
        </div>
      </div>

      {isLoading ? (
        <>{[1, 2, 3, 4].map((i) => <div key={i} className="mx-4 mb-3 h-16 rounded-2xl bg-muted animate-pulse" />)}</>
      ) : isError ? (
        <div className="mx-4 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-center">
          <p className="text-sm font-medium text-red-400">Failed to load usage data</p>
          <p className="text-xs text-muted-foreground mt-1">Check your permissions or try again later.</p>
        </div>
      ) : (
        <>
          {isAtLimit && (
            <div className="mx-4 mb-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2">
              <p className="text-xs text-amber-400">Showing most recent 5,000 calls. Totals may undercount actual usage.</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 px-4 mb-4">
            <SummaryCard title="Total Calls" value={String(totalCalls)} />
            <SummaryCard title="Est. Cost" value={`$${estimatedCost}`} />
            <SummaryCard title="Success" value={String(totalSuccess)} accent="text-emerald-400" />
            <SummaryCard title="Failures" value={String(totalFailure)} accent={totalFailure > 0 ? "text-red-400" : undefined} />
          </div>

          <div className="px-4 mb-2">
            <p className="text-sm font-semibold text-foreground mb-1">Success Rate</p>
            <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: totalCalls > 0 ? `${(totalSuccess / totalCalls) * 100}%` : "0%" }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{formatRate(totalSuccess, totalCalls)} success</p>
          </div>

          <div className="px-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-foreground">Calls by Period</p>
              <div className="flex gap-1">
                {(["day", "week", "month"] as Period[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      period === p ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              {periodData.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No data available</p>
              ) : (
                periodData.map((row) => (
                  <div key={row.label} className="rounded-xl border border-border/20 bg-card p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-foreground">{row.label}</span>
                      <span className="text-xs text-muted-foreground">{row.total} calls</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="text-emerald-400">{row.success} ok</span>
                      <span className={row.failure > 0 ? "text-red-400" : "text-muted-foreground"}>{row.failure} fail</span>
                      <span className="text-muted-foreground ml-auto">${(row.total * COST_PER_CALL).toFixed(2)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="px-4 mb-6">
            <p className="text-sm font-semibold text-foreground mb-2">Top Users</p>
            <div className="space-y-1.5">
              {userData.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No data available</p>
              ) : (
                userData.slice(0, 20).map((user) => (
                  <div key={user.userId} className="rounded-xl border border-border/20 bg-card p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono text-foreground truncate max-w-[180px]">{user.userId.slice(0, 8)}…</span>
                      <span className="text-xs text-muted-foreground">{user.total} calls</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="text-emerald-400">{formatRate(user.success, user.total)}</span>
                      <span className="text-muted-foreground">{(user.totalTextLength / 1024).toFixed(0)} KB extracted</span>
                      <span className="text-muted-foreground ml-auto">${(user.total * COST_PER_CALL).toFixed(2)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </SubPageShell>
  );
}

function SummaryCard({ title, value, accent }: { title: string; value: string; accent?: string }) {
  return (
    <div className="rounded-2xl border border-border/20 bg-card p-4 text-center">
      <p className="text-[11px] text-muted-foreground">{title}</p>
      <p className={`text-lg font-bold ${accent ?? "text-foreground"}`}>{value}</p>
    </div>
  );
}
