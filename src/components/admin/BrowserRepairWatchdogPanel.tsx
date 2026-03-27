type Props = {
  watchdog: any[];
};

export function BrowserRepairWatchdogPanel({ watchdog }: Props) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Watchdog</h3>
      </div>

      <div className="space-y-2">
        {watchdog
          .slice()
          .sort((a, b) => (b.consecutive_failures ?? 0) - (a.consecutive_failures ?? 0))
          .map((row: any) => (
            <div
              key={row.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-3"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm font-medium text-foreground truncate">{row.page_key}</p>
                <p className="text-xs text-muted-foreground">
                  {row.route_group || "other"} · {row.current_status}
                </p>
                {row.current_issue && (
                  <p className="text-xs text-destructive">{row.current_issue}</p>
                )}
              </div>

              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-foreground">
                  {row.consecutive_failures ?? 0} fails
                </p>
              </div>
            </div>
          ))}

        {watchdog.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No watchdog data yet
          </p>
        )}
      </div>
    </div>
  );
}
