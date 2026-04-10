/**
 * useReconAlerts — Realtime reconciliation alerts.
 * Uses central factory for channel management.
 */
import { useEffect, useState } from "react";
import { adminOpsService } from "@/services/admin-ops.service";
import { createRealtimeChannel, removeRealtimeChannel } from "@/lib/realtime";

export function useReconAlerts() {
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const data = await adminOpsService.fetchReconAlerts();
        if (!mounted) return;
        setAlerts(data as any[]);
      } catch {
        /* graceful fallback */
      }
    };

    load();

    const channel = createRealtimeChannel("recon-alerts-live");
    channel
      .on("postgres_changes", { event: "*", schema: "public", table: "recon_alerts" }, () => load())
      .subscribe();

    return () => { mounted = false; removeRealtimeChannel(channel); };
  }, []);

  return alerts;
}
