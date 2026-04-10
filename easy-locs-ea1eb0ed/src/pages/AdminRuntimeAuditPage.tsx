import { useEffect, useMemo, useState } from "react";
import { runRuntimeAudit, type RuntimeAuditReport } from "@/lib/runtime/runtime-audit";
import { CheckCircle, AlertTriangle, XCircle, RefreshCw } from "lucide-react";

function statusIcon(status: "pass" | "warn" | "fail") {
  if (status === "pass") return <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />;
  if (status === "warn") return <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />;
  return <XCircle className="w-4 h-4 text-red-500 shrink-0" />;
}

function badgeClass(status: "pass" | "warn" | "fail") {
  if (status === "pass") return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
  if (status === "warn") return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
  return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
}

export default function AdminRuntimeAuditPage() {
  const [report, setReport] = useState<RuntimeAuditReport | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const result = await runRuntimeAudit();
    setReport(result);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const summary = useMemo(() => {
    const checks = report?.checks ?? [];
    return {
      pass: checks.filter((c) => c.status === "pass").length,
      warn: checks.filter((c) => c.status === "warn").length,
      fail: checks.filter((c) => c.status === "fail").length,
    };
  }, [report]);

  return (
    <div className="min-h-screen bg-background text-foreground p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Runtime Wiring Audit</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Real runtime status — detects what is truly connected, not just what compiles.
          </p>
        </div>

        <button
          onClick={load}
          disabled={loading}
          className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 flex items-center gap-2 shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="border border-border rounded-lg p-4 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Pass</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{summary.pass}</p>
        </div>
        <div className="border border-border rounded-lg p-4 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Warnings</p>
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{summary.warn}</p>
        </div>
        <div className="border border-border rounded-lg p-4 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Failures</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{summary.fail}</p>
        </div>
      </div>

      {!loading && report && (
        <div className="border border-border rounded-lg p-4 bg-card space-y-1">
          <p className="text-xs text-muted-foreground">Audit version: {report.auditVersion}</p>
          <p className="text-xs text-muted-foreground">Build timestamp: {report.buildTimestamp}</p>
          <p className="text-xs text-muted-foreground">Environment: {report.environmentName}</p>
        </div>
      )}

      <div className="space-y-2">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="ml-3 text-sm text-muted-foreground">Running audit…</span>
          </div>
        )}

        {!loading && report && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Generated: {new Date(report.generatedAt).toLocaleString()}
            </p>

            {report.checks.map((check) => (
              <div
                key={check.key}
                className="flex items-start gap-3 border border-border rounded-lg px-4 py-3"
              >
                {statusIcon(check.status)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{check.label}</p>
                  {check.detail && (
                    <p className="text-xs text-muted-foreground mt-0.5 break-words">{check.detail}</p>
                  )}
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${badgeClass(check.status)}`}>
                  {check.status.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
