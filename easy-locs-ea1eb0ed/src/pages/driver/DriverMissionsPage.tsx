import { db } from "@/services/db";
import SubPageShell from "@/components/layout/SubPageShell";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Navigation } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderStatusChip } from "@/components/orders/OrderStatusChip";
import { useUiEngine } from "@/hooks/useUiEngine";

const DRIVER_STATUSES = ["driver_search", "driver_assigned", "picked_up", "on_the_way", "delivered", "completed"];

export default function DriverMissionsPage() {
  useUiEngine("driver-missions");
  const navigate = useNavigate();

  const { data: missions = [], isLoading , isError } = useQuery({
    queryKey: ["driver-missions"],
    queryFn: async () => {
      const { data, error } = await db
        .from("orders")
        .select("*")
        .in("status", DRIVER_STATUSES)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 10_000,
  });

  return (
    <SubPageShell

      title="Missions"

      onBack={() => navigate("/driver/dashboard")}

      contentClassName="space-y-3"

    >
        {isError && <div className="state-container"><p className="text-sm text-destructive">Something went wrong. Please try again.</p></div>}
      {isLoading && [1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}

        {!isLoading && missions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Navigation className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No missions available yet</p>
          </div>
        )}

        {!isLoading && missions.map((mission: any) => (
          <button
            key={mission.id}
            onClick={() => navigate(`/driver/missions/${mission.id}`)}
            className="w-full rounded-2xl border border-border/20 bg-card p-4 text-left active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Order #{mission.id.slice(0, 8)}</p>
                <p className="text-[11px] text-muted-foreground">{new Date(mission.created_at).toLocaleString()}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Dubai · ETA placeholder</p>
              </div>
              <OrderStatusChip status={mission.status} variant="merchant" />
            </div>
          </button>
        ))}
      </SubPageShell>
  );
}
