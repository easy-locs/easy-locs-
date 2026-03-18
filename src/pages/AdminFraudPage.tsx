import { useEffect, useState } from "react";
import { BackCard } from "@/components/ui/back-card";
import { supabase } from "@/integrations/supabase/client";

export default function AdminFraudPage() {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("user_risk_profiles" as any)
      .select("*")
      .order("risk_score", { ascending: false })
      .then(({ data }) => setRows((data ?? []) as any[]));
  }, []);

  return (
    <div className="min-h-screen bg-background p-4">
      <BackCard title="Fraud Detection" />

      <div className="mt-4 space-y-3">
        {rows.map((r: any) => (
          <div key={r.user_id} className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground truncate">{r.user_id}</p>
            <p className="font-semibold">Risk: {r.risk_score}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {Array.isArray(r.fraud_flags) ? r.fraud_flags.join(", ") : JSON.stringify(r.fraud_flags)}
            </p>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No risk profiles yet</p>
        )}
      </div>
    </div>
  );
}
