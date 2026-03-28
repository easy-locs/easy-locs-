import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function WatchdogLivePanel() {
  const [rows, setRows] = useState<any[]>([]);

  const load = async () => {
    const { data } = await supabase
      .from("browser_repair_watchdog")
      .select("*")
      .order("consecutive_failures", { ascending: false });

    setRows(data ?? []);
  };

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), 10000);
    return () => window.clearInterval(t);
  }, []);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Watchdog</h3>

      <div className="space-y-2">
        {rows.map((row: any) => (
          <div
            key={row.id}
            className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-3"
          >
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm font-medium text-foreground break-words leading-snug">{row.page_key}</p>
              <p className="text-xs text-muted-foreground">
                Status: {row.current_status}
              </p>
              {row.current_issue && (
                <p className="text-xs text-destructive">{row.current_issue}</p>
              )}
            </div>

            <div className="text-right shrink-0 space-y-1">
              <p className="text-sm font-semibold text-foreground">{row.consecutive_failures ?? 0} fails</p>
              <p className="text-[11px] text-muted-foreground">
                Last OK:{" "}
                {row.last_seen_ok_at
                  ? new Date(row.last_seen_ok_at).toLocaleString()
                  : "never"}
              </p>
            </div>
          </div>
        ))}

        {rows.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No watchdog data yet.
          </p>
        )}
      </div>
    </div>
  );
}
