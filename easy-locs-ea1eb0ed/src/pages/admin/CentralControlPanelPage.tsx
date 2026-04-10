import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useEngineDebugSnapshot, EngineSupervisorRow } from "@/hooks/useEngineDebugSnapshot";
import { triggerEngineCron, toggleEngineStatus } from "@/repositories/admin-ops.repository";

export default function CentralControlPanelPage() {
  const navigate = useNavigate();
  const { rows, loading } = useEngineDebugSnapshot();

  const handleTriggerCron = async () => {
    try {
      const data = await triggerEngineCron();
      toast.success(`Engine run: ${data?.engines ?? 0} engines, ${data?.errors ?? 0} errors`);
    } catch (e: any) {
      toast.error(e.message || "Cron trigger failed");
    }
  };

  const toggleEngine = async (name: string, current: boolean) => {
    await toggleEngineStatus(name, current);
    toast.success(`${name} → ${!current ? "enabled" : "disabled"}`);
  };

  const okCount = rows.filter((r) => r.status === "ok").length;
  const errorCount = rows.filter((r) => r.status === "error").length;
  const enabledCount = rows.filter((r) => r.enabled).length;

  const tierColors: Record<string, string> = {
    critical: "text-red-400",
    priority: "text-amber-400",
    standard: "text-muted-foreground",
    optimizable: "text-muted-foreground/60",
  };

  const statusBadge = (r: EngineSupervisorRow) => {
    if (r.status === "ok") return "bg-emerald-500/10 text-emerald-500";
    if (r.status === "error") return "bg-destructive/10 text-destructive";
    if (r.status === "running") return "bg-blue-500/10 text-blue-400";
    return "bg-muted text-muted-foreground";
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Central Control Panel</h1>
          <p className="text-xs text-muted-foreground">{rows.length} engines registered</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-border/20 bg-card p-3 text-center">
          <div className="text-xs text-muted-foreground">OK</div>
          <div className="text-lg font-bold text-emerald-500">{okCount}</div>
        </div>
        <div className="rounded-2xl border border-border/20 bg-card p-3 text-center">
          <div className="text-xs text-muted-foreground">Errors</div>
          <div className="text-lg font-bold text-destructive">{errorCount}</div>
        </div>
        <div className="rounded-2xl border border-border/20 bg-card p-3 text-center">
          <div className="text-xs text-muted-foreground">Enabled</div>
          <div className="text-lg font-bold">{enabledCount}</div>
        </div>
      </div>

      <button onClick={handleTriggerCron} className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold">
        ▶ Run Engine Cron Now
      </button>

      {loading && <p className="text-sm text-muted-foreground text-center">Loading engines…</p>}

      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.engine_name} className="rounded-2xl border border-border/20 bg-card p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold truncate">{row.engine_name}</div>
                <div className={`text-[10px] ${tierColors[row.engine_tier ?? "standard"]}`}>
                  {row.engine_tier ?? "standard"} • {row.last_duration_ms != null ? `${row.last_duration_ms}ms` : "—"}
                </div>
                {row.last_run_at && (
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    Last: {new Date(row.last_run_at).toLocaleString()}
                  </div>
                )}
                {row.status === "error" && row.last_error_message && (
                  <div className="text-[10px] text-destructive mt-0.5 truncate">{row.last_error_message}</div>
                )}
              </div>
              <div className="flex flex-col gap-1 items-end shrink-0">
                <div className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusBadge(row)}`}>
                  {row.status}
                </div>
                <button onClick={() => toggleEngine(row.engine_name, row.enabled)} className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${row.enabled ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"}`}>
                  {row.enabled ? "ON" : "OFF"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
