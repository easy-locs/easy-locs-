/**
 * useReconAlerts — Realtime reconciliation alerts.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useReconAlerts() {
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data } = await supabase
        .from("recon_alerts" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (!mounted) return;
      setAlerts((data as any[]) ?? []);
    };

    load();

    const sub = supabase
      .channel("recon-alerts-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "recon_alerts" }, () => load())
      .subscribe();

    return () => { mounted = false; sub.unsubscribe(); };
  }, []);

  return alerts;
}
