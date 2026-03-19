import { useEffect, useState } from "react";
import { runV20Debug, type DebugSection, type DebugReport } from "@/lib/dino/v20Debug";

export default function V20DebugPanel({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState<DebugSection[]>([]);
  const [lastRun, setLastRun] = useState<string | null>(null);

  const runAudit = async () => {
    setLoading(true);
    try {
      const report = await runV20Debug(userId);
      setSections(report.sections);
      setLastRun(report.generatedAt);
    } catch (err) {
      console.error("DEBUG PANEL ERROR:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runAudit();
  }, [userId]);

  const okCount = sections.filter((s) => s.ok).length;
  const healthPct = sections.length > 0 ? Math.round((okCount / sections.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-background p-4 space-y-4">
      {/* HEADER */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">V20 System Debug</h1>
          <p className="text-sm text-muted-foreground">
            {lastRun ? `Last run: ${new Date(lastRun).toLocaleString()}` : "Not executed"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-foreground">
            Health: {healthPct}%
          </span>
          <button
            onClick={runAudit}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
          >
            {loading ? "Running..." : "Run Audit"}
          </button>
        </div>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {sections.map((s) => (
          <DebugCard key={s.key} section={s} />
        ))}
      </div>
    </div>
  );
}

function DebugCard({ section }: { section: DebugSection }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`rounded-lg border p-3 space-y-2 ${section.ok ? "border-emerald-500/30 bg-emerald-500/5" : "border-destructive/30 bg-destructive/5"}`}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{section.key}</h3>
        <span className={`text-xs font-bold px-2 py-0.5 rounded ${section.ok ? "bg-emerald-500/20 text-emerald-400" : "bg-destructive/20 text-destructive"}`}>
          {section.ok ? "OK" : "ERROR"}
        </span>
      </div>

      <p className="text-xs text-muted-foreground">{section.message}</p>

      {section.count !== undefined && (
        <p className="text-xs text-muted-foreground">Records: {section.count}</p>
      )}

      {!section.ok && section.error && (
        <p className="text-xs text-destructive break-all">{section.error}</p>
      )}

      {section.sample && (
        <div>
          <button onClick={() => setOpen(!open)} className="text-xs text-primary underline">
            {open ? "Hide Data" : "View Data"}
          </button>
          {open && (
            <pre className="text-[10px] bg-muted text-muted-foreground rounded p-2 overflow-auto max-h-40 mt-1">
              {JSON.stringify(section.sample, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
