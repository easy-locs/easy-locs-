import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useEngineDebugSnapshot } from "@/hooks/useEngineDebugSnapshot";
import { executeEngineAction } from "@/lib/engine/engineActionExecutor";
import { setEngineEnabled } from "@/lib/engine/centralEngineRuntime";

export default function CentralControlPanelPage() {
  const navigate = useNavigate();
  const rows = useEngineDebugSnapshot();

  const runAction = async (action: string, successText: string) => {
    try {
      await executeEngineAction(action);
      toast.success(successText);
    } catch (e: any) {
      toast.error(e.message || "Engine action failed");
    }
  };

  const toggleEngine = (key: any, current: boolean) => {
    setEngineEnabled(key, !current);
    toast.success("Engine state updated");
  };

  const healthyCount = rows.filter((r) => r.healthy).length;
  const enabledCount = rows.filter((r) => r.enabled).length;

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Central Control Panel</h1>
          <p className="text-xs text-muted-foreground">Engine registry and actions</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border/20 bg-card p-4">
          <div className="text-xs text-muted-foreground">Healthy</div>
          <div className="text-lg font-bold mt-1">{healthyCount} / {rows.length}</div>
        </div>
        <div className="rounded-2xl border border-border/20 bg-card p-4">
          <div className="text-xs text-muted-foreground">Enabled</div>
          <div className="text-lg font-bold mt-1">{enabledCount} / {rows.length}</div>
        </div>
      </div>

      <div className="space-y-3">
        <button onClick={() => runAction("health_check", "Health checks completed")} className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold">
          Run Health Check
        </button>
        <button onClick={() => runAction("emit_test_order_created", "Test order emitted")} className="w-full rounded-2xl bg-muted px-4 py-3 text-sm font-bold text-foreground">
          Test Order
        </button>
        <button onClick={() => runAction("emit_test_payment_success", "Test payment emitted")} className="w-full rounded-2xl bg-muted px-4 py-3 text-sm font-bold text-foreground">
          Test Payment
        </button>
        <button onClick={() => runAction("emit_test_support_ticket", "Test support emitted")} className="w-full rounded-2xl bg-muted px-4 py-3 text-sm font-bold text-foreground">
          Test Support
        </button>
      </div>

      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.key} className="rounded-[28px] border border-border/20 bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-bold">{row.label}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Last check: {row.lastCheckAt ? new Date(row.lastCheckAt).toLocaleString() : "never"}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{row.notes || "No notes"}</div>
              </div>
              <div className="flex flex-col gap-2 items-end">
                <div className={`rounded-full px-3 py-1 text-[11px] font-bold ${row.healthy ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"}`}>
                  {row.healthy ? "Healthy" : "Broken"}
                </div>
                <button onClick={() => toggleEngine(row.key, row.enabled)} className="rounded-full bg-muted px-3 py-1 text-[11px] font-bold">
                  {row.enabled ? "Enabled" : "Disabled"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
