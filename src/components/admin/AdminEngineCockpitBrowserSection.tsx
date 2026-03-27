import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BrowserRepairRunButton } from "./BrowserRepairRunButton";
import { BrowserRepairRunSummaryCard } from "./BrowserRepairRunSummaryCard";
import { BrowserRepairWatchdogPanel } from "./BrowserRepairWatchdogPanel";
import { buildBrowserRepairCockpitMetrics } from "@/lib/browser-repair/browser-repair-cockpit-metrics";

type Props = {
  latestRun?: any;
  issues?: any[];
};

export function AdminEngineCockpitBrowserSection({
  latestRun,
  issues = [],
}: Props) {
  const [watchdog, setWatchdog] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("browser_repair_watchdog")
        .select("*")
        .order("consecutive_failures", { ascending: false });
      setWatchdog(data ?? []);
    })();
  }, []);

  const metrics = buildBrowserRepairCockpitMetrics(
    latestRun ? [latestRun] : [],
    issues,
    watchdog
  );

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Browser Repair</h2>
            <p className="text-xs text-muted-foreground">
              Full app repair and watchdog runtime
            </p>
          </div>

          <BrowserRepairRunButton />
        </div>

        {/* Run summary card */}
        <BrowserRepairRunSummaryCard latestRun={latestRun} />

        {/* Cockpit metrics overview */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <p className="text-xs text-muted-foreground">Total issues</p>
            <p className="text-lg font-bold text-foreground">{metrics.totalIssues}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <p className="text-xs text-muted-foreground">Critical</p>
            <p className="text-lg font-bold text-destructive">{metrics.criticalIssues}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <p className="text-xs text-muted-foreground">Auto-fixed</p>
            <p className="text-lg font-bold text-foreground">{metrics.fixedIssues}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <p className="text-xs text-muted-foreground">Failing pages</p>
            <p className="text-lg font-bold text-destructive">{metrics.failingPages}</p>
          </div>
        </div>

        {/* Issues list */}
        <div className="space-y-2">
          {issues.slice(0, 12).map((issue: any) => (
            <div
              key={issue.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-3"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs font-medium text-foreground">
                  {issue.page_key} / {issue.flow_key}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {issue.area ? `${issue.area} · ` : ""}{issue.issue_type}
                </p>
                <p className="text-xs text-foreground">{issue.summary}</p>
                {issue.fix_summary && (
                  <p className="text-[11px] text-muted-foreground">
                    Fix: {issue.fix_summary}
                  </p>
                )}
              </div>

              <div className="text-right shrink-0 space-y-1">
                <p className="text-xs font-semibold text-foreground">{issue.severity}</p>
                <p className="text-[11px] text-muted-foreground">
                  {issue.auto_fix_applied ? "auto-fixed" : "detected"}
                </p>
              </div>
            </div>
          ))}

          {issues.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No browser repair issues.
            </p>
          )}
        </div>
      </div>

      {/* Watchdog panel */}
      <BrowserRepairWatchdogPanel watchdog={watchdog} />
    </div>
  );
}
