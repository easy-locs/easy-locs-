import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { platformBus } from "@/lib/shared/platform-bus";

export default function AdminOrchestrationPage() {
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);

  const logs = useMemo(() => platformBus.getLogs(), [tick]);
  const events = useMemo(() => platformBus.getRegisteredEvents(), [tick]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted text-muted-foreground font-bold">
          ←
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold">Orchestration Engine</h1>
          <p className="text-xs text-muted-foreground">Central event bus monitor</p>
        </div>
        <button
          onClick={() => setTick((v) => v + 1)}
          className="rounded-xl bg-muted px-3 py-2 text-xs font-bold"
        >
          Refresh
        </button>
        <button
          onClick={() => { platformBus.clearLogs(); setTick((v) => v + 1); }}
          className="rounded-xl bg-muted px-3 py-2 text-xs font-bold"
        >
          Clear
        </button>
      </div>

      <div className="rounded-2xl border border-border/20 bg-card p-4">
        <h2 className="text-sm font-bold mb-3">Registered Events ({events.length})</h2>
        {events.length === 0 ? (
          <p className="text-xs text-muted-foreground">No events registered.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {events.map((event) => (
              <span key={event} className="rounded-full bg-primary/10 text-primary px-2.5 py-1 text-[11px] font-bold">
                {event}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border/20 bg-card p-4">
        <h2 className="text-sm font-bold mb-3">Recent Logs ({logs.length})</h2>
        {logs.length === 0 ? (
          <p className="text-xs text-muted-foreground">No orchestration logs yet.</p>
        ) : (
          <div className="space-y-3">
            {logs.slice(0, 50).map((log) => (
              <div key={log.id} className="rounded-xl border border-border/10 p-3">
                <p className="text-sm font-bold">{log.event}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {log.createdAt} · {log.source ?? "unknown"}
                </p>
                <pre className="text-[10px] mt-2 text-muted-foreground overflow-auto max-h-24">
                  {JSON.stringify(log.payload, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
