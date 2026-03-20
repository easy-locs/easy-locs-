import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { runOrderFlowSmokeTest } from "@/lib/qa/orderFlowTestHarness";
import { runPaymentFlowSmokeTest } from "@/lib/qa/paymentFlowTestHarness";
import { runDispatchFlowSmokeTest } from "@/lib/qa/dispatchFlowTestHarness";
import { runSupportFlowSmokeTest } from "@/lib/qa/supportFlowTestHarness";

type ReportMap = Record<string, Array<{ step: string; ok: boolean; message: string }>>;

export default function AdminQaCommandPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<ReportMap>({});

  const runAll = async () => {
    try {
      setBusy(true);

      const [orders, payments, dispatch, support] = await Promise.all([
        runOrderFlowSmokeTest(),
        runPaymentFlowSmokeTest(),
        runDispatchFlowSmokeTest(),
        runSupportFlowSmokeTest(),
      ]);

      setReport({ orders, payments, dispatch, support });
      toast.success("QA smoke tests completed");
    } catch (e: any) {
      toast.error(e.message || "QA command failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin/master-control")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">QA Command</h1>
          <p className="text-xs text-muted-foreground">Run smoke tests</p>
        </div>
      </div>

      <button
        onClick={runAll}
        disabled={busy}
        className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold disabled:opacity-50"
      >
        {busy ? "Running QA..." : "Run All Smoke Tests"}
      </button>

      <Section title="Orders" rows={report.orders ?? []} />
      <Section title="Payments" rows={report.payments ?? []} />
      <Section title="Dispatch" rows={report.dispatch ?? []} />
      <Section title="Support" rows={report.support ?? []} />
    </div>
  );
}

function Section({ title, rows }: { title: string; rows: Array<{ step: string; ok: boolean; message: string }> }) {
  return (
    <div className="rounded-2xl border border-border/20 bg-card p-4">
      <p className="text-[11px] uppercase tracking-wide font-bold text-muted-foreground mb-3">
        {title}
      </p>

      <div className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">No report yet</p>
        ) : (
          rows.map((row, idx) => (
            <div key={idx} className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{row.step}</p>
                <p className="text-xs text-muted-foreground truncate">{row.message}</p>
              </div>
              <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold ${row.ok ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"}`}>
                {row.ok ? "OK" : "FAIL"}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
