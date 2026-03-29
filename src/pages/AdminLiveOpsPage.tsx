import { useEffect, useMemo, useState } from "react";
import { BackCard } from "@/components/ui/back-card";
import { fetchLiveOps } from "@/lib/admin/fetch-live-ops";
import { createRealtimeChannel, removeRealtimeChannel } from "@/lib/realtime";

export default function AdminLiveOpsPage() {
  const [data, setData] = useState<{
    rides: any[];
    disputes: any[];
    payouts: any[];
    zones: any[];
  }>({ rides: [], disputes: [], payouts: [], zones: [] });

  useEffect(() => {
    fetchLiveOps().then(setData);

    const channel = supabase
      .channel("admin-live-ops")
      .on("postgres_changes", { event: "*", schema: "public", table: "mobility_jobs" }, () => {
        fetchLiveOps().then(setData);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "ride_disputes" }, () => {
        fetchLiveOps().then(setData);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "driver_payouts" }, () => {
        fetchLiveOps().then(setData);
      })
      .subscribe();

    return () => { removeRealtimeChannel(channel); };
  }, []);

  const stats = useMemo(() => {
    const activeRides = data.rides.filter((r: any) =>
      ["searching", "offered", "accepted", "rider_arriving_pickup", "in_progress"].includes(r.status)
    ).length;
    const openDisputes = data.disputes.filter((d: any) => d.status === "open").length;
    const pendingPayouts = data.payouts.filter((p: any) => p.payout_status === "pending").length;
    const hotZones = data.zones.filter((z: any) => Number(z.surge_multiplier || 1) > 1.2).length;
    return { activeRides, openDisputes, pendingPayouts, hotZones };
  }, [data]);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-2xl space-y-6">
        <BackCard label="Live Operations" />

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Active jobs", value: stats.activeRides },
            { label: "Open disputes", value: stats.openDisputes },
            { label: "Pending payouts", value: stats.pendingPayouts },
            { label: "Hot zones", value: stats.hotZones },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-border bg-card p-4 text-center">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          {data.zones.map((zone: any) => (
            <div key={zone.zone_key} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">{zone.zone_key}</p>
                <p className="text-sm font-semibold">{Number(zone.surge_multiplier || 1).toFixed(2)}x</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Demand {zone.active_requests} · Supply {zone.active_drivers} · Predicted {zone.predicted_demand}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
