/**
 * useFinancialRecon — Realtime financial reconciliation rows.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useFinancialRecon() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data } = await supabase
        .from("financial_reconciliation" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (!mounted) return;
      setRows((data as any[]) ?? []);
      setLoading(false);
    };

    load();

    const sub = supabase
      .channel("financial-reconciliation-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "financial_reconciliation" }, () => load())
      .subscribe();

    return () => { mounted = false; sub.unsubscribe(); };
  }, []);

  return { rows, loading };
}
