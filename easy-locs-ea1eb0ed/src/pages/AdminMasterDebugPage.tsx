import { useMemo, useState } from "react";
import { useRuntimeDebug } from "@/hooks/useRuntimeDebug";
import type { DebugDomain } from "@/lib/debug/runtime-debug-bus";

const DOMAINS: Array<"all" | DebugDomain> = [
  "all", "call", "qr", "share", "geo", "realtime", "router", "wallet", "system",
];

const levelColors: Record<string, string> = {
  info: "text-blue-400",
  warn: "text-yellow-400",
  error: "text-destructive",
  success: "text-emerald-400",
};

export default function AdminMasterDebugPage() {
  const { events, clear } = useRuntimeDebug();
  const [domain, setDomain] = useState<string>("all");

  const filtered = useMemo(() => {
    if (domain === "all") return events;
    return events.filter((e) => e.domain === domain);
  }, [events, domain]);

  return (
    <div className="min-h-screen bg-background p-4 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Master Debug Block</h1>
        <p className="text-sm text-muted-foreground">
          Appels, QR, liens, géolocalisation, realtime
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {DOMAINS.map((d) => (
          <button
            key={d}
            onClick={() => setDomain(d)}
            className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
              domain === d
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-card-foreground border-border hover:bg-accent"
            }`}
          >
            {d}
          </button>
        ))}
        <button
          onClick={clear}
          className="px-3 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium"
        >
          Clear
        </button>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground py-8 text-center">No events yet</p>
        )}
        {filtered.map((e) => (
          <div key={e.id} className="bg-card border border-border rounded-lg p-3 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-foreground truncate">
                [{e.domain}] {e.label}
              </span>
              <span className={`text-xs font-bold shrink-0 ${levelColors[e.level] ?? "text-muted-foreground"}`}>
                {e.level.toUpperCase()}
              </span>
            </div>
            {e.detail && (
              <p className="text-xs text-muted-foreground break-words">{e.detail}</p>
            )}
            {e.data !== undefined && (
              <pre className="text-[10px] bg-muted text-muted-foreground rounded p-2 overflow-auto max-h-32">
                {JSON.stringify(e.data, null, 2)}
              </pre>
            )}
            <p className="text-[10px] text-muted-foreground">
              {new Date(e.createdAt).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
