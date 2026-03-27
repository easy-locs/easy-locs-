import { BrowserRepairRunButton } from "./BrowserRepairRunButton";
import { WatchdogLivePanel } from "./WatchdogLivePanel";

type Props = {
  latestRun?: any;
  issues?: any[];
};

export function AdminEngineCockpitBrowserSection({
  latestRun,
  issues = [],
}: Props) {
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

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <p className="text-xs text-muted-foreground">Scenarios</p>
            <p className="text-lg font-bold text-foreground">
              {latestRun?.scenario_count ?? 0}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <p className="text-xs text-muted-foreground">Pass</p>
            <p className="text-lg font-bold text-foreground">
              {latestRun?.pass_count ?? 0}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <p className="text-xs text-muted-foreground">Fail</p>
            <p className="text-lg font-bold text-destructive">
              {latestRun?.fail_count ?? 0}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <p className="text-xs text-muted-foreground">Fixed</p>
            <p className="text-lg font-bold text-foreground">
              {latestRun?.fixed_count ?? 0}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <p className="text-xs text-muted-foreground">Warnings</p>
            <p className="text-lg font-bold text-foreground">
              {latestRun?.warning_count ?? 0}
            </p>
          </div>
        </div>

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
                  {issue.issue_type}
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

      <WatchdogLivePanel />
    </div>
  );
}
