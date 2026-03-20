export function FinalStatusLegendCard() {
  const rows = [
    { label: "Healthy", cls: "bg-emerald-500/10 text-emerald-500" },
    { label: "Pending", cls: "bg-amber-500/10 text-amber-500" },
    { label: "Critical", cls: "bg-destructive/10 text-destructive" },
    { label: "Info", cls: "bg-primary/10 text-primary" },
  ];

  return (
    <div className="rounded-2xl border border-border/20 bg-card p-4">
      <p className="text-[11px] uppercase tracking-wide font-bold text-muted-foreground mb-3">
        Status Legend
      </p>

      <div className="flex flex-wrap gap-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${row.cls}`}>
              {row.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
