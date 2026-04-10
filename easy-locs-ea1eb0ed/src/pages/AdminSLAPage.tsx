/**
 * AdminSLAPage — SLA tracking dashboard.
 */
import { useEffect, useState } from "react";
import { BackCard } from "@/components/ui/back-card";
import { supabase } from "@/integrations/supabase/client";

export default function AdminSLAPage() {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("ops_sla_events" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }: any) => setRows(data ?? []));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <BackCard />
        <div>
          <h1 className="text-xl font-bold text-foreground">SLA tracking</h1>
          <p className="text-sm text-muted-foreground">Dispatch, refund, payout and dispute service levels</p>
        </div>

        <div className="space-y-3">
          {rows.map((row: any) => (
            <div key={row.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">{row.sla_type}</p>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  row.sla_status === "met" ? "bg-primary/10 text-primary" :
                  row.sla_status === "breached" ? "bg-destructive/10 text-destructive" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {row.sla_status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Target {row.target_seconds}s · Elapsed {row.elapsed_seconds}s
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
