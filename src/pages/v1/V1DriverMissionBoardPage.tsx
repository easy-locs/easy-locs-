import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { V1RequireDriver } from "@/components/v1/V1RequireDriver";
import { V1AppShell } from "@/components/v1/V1AppShell";
import { getDriverOpenMissions, advanceMissionStatus } from "@/lib/v1/v1DriverMissionCore";

function DriverMissionBoardBody({ driverUserId }: { driverUserId: string }) {
  const { data: rows = [], refetch } = useQuery({
    queryKey: ["v1-driver-open-missions", driverUserId],
    queryFn: () => getDriverOpenMissions(driverUserId),
    enabled: !!driverUserId,
    staleTime: 5_000,
    refetchInterval: 10_000,
  });

  const nextMap: Record<string, "picked_up" | "on_the_way" | "delivered"> = {
    driver_assigned: "picked_up",
    picked_up: "on_the_way",
    on_the_way: "delivered",
  };

  const onAdvance = async (row: any) => {
    const next = nextMap[String(row.status)];
    if (!next) return;

    try {
      await advanceMissionStatus({ orderId: row.id, nextStatus: next });
      toast.success(`Mission moved to ${next}`);
      refetch();
    } catch (e: any) {
      toast.error(e.message || "Could not update mission");
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <h1 className="text-lg font-bold text-foreground">Driver Missions</h1>

      {rows.length === 0 && (
        <div className="rounded-[28px] border border-border/20 bg-card p-6 text-center">
          <p className="text-muted-foreground">No active missions</p>
        </div>
      )}

      {rows.map((row: any) => (
        <div key={row.id} className="rounded-[28px] border border-border/20 bg-card p-4 space-y-2">
          <p className="font-bold text-foreground">Mission #{String(row.id).slice(0, 8)}</p>
          <p className="text-sm text-muted-foreground">Pickup: {row.pickup_label || "N/A"}</p>
          <p className="text-sm text-muted-foreground">Dropoff: {row.dropoff_label || "N/A"}</p>
          <p className="text-xs text-muted-foreground">Status: {String(row.status)}</p>

          {nextMap[String(row.status)] ? (
            <button onClick={() => onAdvance(row)} className="w-full rounded-[24px] bg-primary text-primary-foreground px-4 py-3 font-bold text-sm">
              Advance to {nextMap[String(row.status)]}
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function V1DriverMissionBoardPage() {
  return (
    <V1AppShell>
      <V1RequireDriver>{(ctx) => <DriverMissionBoardBody driverUserId={ctx.driverUserId} />}</V1RequireDriver>
    </V1AppShell>
  );
}
