import { summarizeRepairRun } from "@/lib/browser-repair/browser-repair-report-export";

type Props = {
  latestRun: any;
};

export function BrowserRepairRunSummaryCard({ latestRun }: Props) {
  const summary = summarizeRepairRun(latestRun);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Latest Browser Repair Run</h3>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-xs text-muted-foreground">Scenarios</p>
          <p className="text-lg font-bold text-foreground">{summary.scenarios}</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-xs text-muted-foreground">Pass</p>
          <p className="text-lg font-bold text-foreground">{summary.pass}</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-xs text-muted-foreground">Fail</p>
          <p className="text-lg font-bold text-destructive">{summary.fail}</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-xs text-muted-foreground">Fixed</p>
          <p className="text-lg font-bold text-foreground">{summary.fixed}</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-xs text-muted-foreground">Warnings</p>
          <p className="text-lg font-bold text-foreground">{summary.warning}</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-xs text-muted-foreground">Critical</p>
          <p className="text-lg font-bold text-destructive">{summary.critical}</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-xs text-muted-foreground">Degraded</p>
          <p className="text-lg font-bold text-foreground">{summary.degraded}</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-xs text-muted-foreground">Avg step</p>
          <p className="text-lg font-bold text-foreground">{summary.avgStepMs}ms</p>
        </div>
      </div>
    </div>
  );
}
