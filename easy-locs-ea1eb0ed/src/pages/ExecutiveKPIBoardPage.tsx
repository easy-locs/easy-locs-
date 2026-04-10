import { useEffect, useState } from "react";
import { BackCard } from "@/components/ui/back-card";
import { supabase } from "@/integrations/supabase/client";

export default function ExecutiveKPIBoardPage() {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("executive_kpi_snapshots" as any)
      .select("*")
      .order("snapshot_date", { ascending: false })
      .limit(30)
      .then(({ data }) => setRows((data as any[]) ?? []));
  }, []);

  const latest = rows[0];

  return (
    <div className="app-mobile-page bg-background p-4">
      <BackCard />
      <h1 className="mt-4 text-xl font-bold text-foreground">Executive KPI board</h1>
      <p className="text-sm text-muted-foreground">Daily platform performance snapshot</p>

      {latest && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Active rides</p>
            <p className="text-2xl font-bold text-foreground">{latest.active_rides}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Gross volume</p>
            <p className="text-2xl font-bold text-foreground">{latest.gross_volume}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Refunds</p>
            <p className="text-2xl font-bold text-foreground">{latest.refunds_volume}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Conversion</p>
            <p className="text-2xl font-bold text-foreground">{(Number(latest.conversion_rate) * 100).toFixed(1)}%</p>
          </div>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {rows.map((row) => (
          <div key={row.id} className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-semibold text-foreground">{row.snapshot_date}</p>
            <p className="text-xs text-muted-foreground">
              Rides {row.active_rides} · GMV {row.gross_volume} · Disputes {row.disputes_open} · Payouts {row.payouts_pending}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
