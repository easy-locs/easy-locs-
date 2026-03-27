export function AppRecoveryChecklist() {
  const items = [
    "Orbit messages V2 only",
    "Wallet realtime connected",
    "Dashboard counters realtime connected",
    "Me profile realtime connected",
    "Radar canonical bridge active",
    "Browser repair trigger active",
    "Watchdog active",
    "Notifications bell synced",
    "No legacy messages path in core Orbit",
  ];

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <h3 className="text-sm font-semibold text-foreground">Recovery Checklist</h3>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item} className="text-xs text-muted-foreground">
            • {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
