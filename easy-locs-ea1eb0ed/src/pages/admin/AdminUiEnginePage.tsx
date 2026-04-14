import SubPageShell from "@/components/layout/SubPageShell";
import React, { useMemo } from "react";
import { useUiEngine } from "@/hooks/useUiEngine";

export default function AdminUiEnginePage() {
  const { report, execute, running } = useUiEngine({
    enabled: true,
    autoRun: true,
    delayMs: 300,
    observeDom: false,
  });

  const grouped = useMemo(() => {
    const map = new Map<string, number>();
    for (const issue of report?.issues ?? []) {
      map.set(issue.type, (map.get(issue.type) ?? 0) + 1);
    }
    return Array.from(map.entries());
  }, [report]);

  return (
    <SubPageShell noContentPad className="bg-background text-foreground p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">UI Engine Control</h1>
        <p className="text-sm text-muted-foreground">Runtime UX/UI audit, scoring and safe auto-patches</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric title="Score" value={`${report?.score.total ?? "—"}%`} />
        <Metric title="Issues" value={String(report?.issues.length ?? "—")} />
        <Metric title="Patched" value={String(report?.patchedCount ?? "—")} />
        <Metric title="Page" value={report?.pageType ?? "—"} />
      </div>

      <div>
        <button
          onClick={() => execute()}
          disabled={running}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold disabled:opacity-50"
        >
          {running ? "Running..." : "Run UI Engine"}
        </button>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-2">Issue Summary</h2>
        {grouped.length === 0 && <p className="text-muted-foreground">No issues found.</p>}
        {grouped.map(([key, count]) => (
          <div key={key} className="flex justify-between py-1 border-b border-border text-sm">
            <span>{key}</span>
            <span className="font-mono">{count}</span>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-2">Full Report</h2>
        <pre className="bg-muted p-3 rounded-xl text-xs overflow-auto max-h-96">
          {JSON.stringify(report, null, 2)}
        </pre>
      </div>
    </SubPageShell>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-3 text-center">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}
