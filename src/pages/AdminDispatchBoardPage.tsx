import { BackCard } from "@/components/ui/back-card";
import { useRealtimeDispatchBoard } from "@/hooks/useRealtimeDispatchBoard";

export default function AdminDispatchBoardPage() {
  const { rides, alerts, zones, loading } = useRealtimeDispatchBoard();

  const liveRides = rides.filter((r: any) =>
    ["searching", "assigned", "driver_arrived", "in_progress"].includes(r.status)
  );

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-2xl space-y-6">
        <BackCard />

        <div>
          <h1 className="text-lg font-bold text-foreground">Realtime dispatch board</h1>
          <p className="text-sm text-muted-foreground">Live rides, zones and platform alerts</p>
        </div>

        {loading && <p className="text-sm text-muted-foreground">Loading live board...</p>}

        {/* Alerts */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Open alerts</h2>
          {alerts.length === 0 && <p className="text-xs text-muted-foreground">No open alerts</p>}
          {alerts.map((alert: any) => (
            <div key={alert.id} className="rounded-2xl border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-sm font-semibold text-foreground">{alert.title}</p>
              <p className="text-xs text-muted-foreground">{alert.body}</p>
            </div>
          ))}
        </div>

        {/* Live rides */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Live rides ({liveRides.length})</h2>
          {liveRides.map((ride: any) => (
            <div key={ride.id} className="rounded-2xl border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground truncate">{ride.id}</p>
              <p className="text-sm text-foreground">
                {ride.status} · radius {ride.search_radius_km ?? "—"} km
              </p>
            </div>
          ))}
        </div>

        {/* Zones */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Demand zones</h2>
          {zones.map((zone: any) => (
            <div key={zone.zone_key} className="rounded-2xl border border-border bg-card p-3">
              <div className="flex items-center justify-between">
                <p className="font-medium text-foreground">{zone.zone_key}</p>
                <p className="text-sm font-semibold text-foreground">
                  {Number(zone.surge_multiplier || 1).toFixed(2)}x
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Demand {zone.active_requests} · Supply {zone.active_drivers}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
