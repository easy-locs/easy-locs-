/**
 * AdminTrustGraphPage — Platform trust, safety and reliability overview.
 */
import { useEffect, useState } from "react";
import { BackCard } from "@/components/ui/back-card";
import { supabase } from "@/integrations/supabase/client";

export default function AdminTrustGraphPage() {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("user_trust_graph" as any)
      .select("*")
      .order("trust_score", { ascending: false })
      .limit(200)
      .then(({ data }: any) => setRows(data ?? []));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <BackCard />
        <div>
          <h1 className="text-xl font-bold text-foreground">Trust graph</h1>
          <p className="text-sm text-muted-foreground">Reliability, safety and trust overview across the platform</p>
        </div>

        <div className="space-y-3">
          {rows.map((row: any) => (
            <div key={row.user_id} className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs font-mono text-muted-foreground truncate">{row.user_id}</p>
              <div className="flex items-center gap-4 mt-2">
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">{row.trust_score}</p>
                  <p className="text-[10px] text-muted-foreground">Trust</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">{row.safety_score}</p>
                  <p className="text-[10px] text-muted-foreground">Safety</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">{row.reliability_score}</p>
                  <p className="text-[10px] text-muted-foreground">Reliability</p>
                </div>
              </div>
            </div>
          ))}
          {rows.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No trust profiles yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
