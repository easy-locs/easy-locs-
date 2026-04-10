import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Navigation } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderStatusChip } from "@/components/orders/OrderStatusChip";

const DRIVER_STATUSES = ["driver_search", "driver_assigned", "picked_up", "on_the_way", "delivered", "completed"];

export default function DriverMissionsPage() {
  const navigate = useNavigate();

  const { data: missions = [], isLoading } = useQuery({
    queryKey: ["driver-missions"],
    queryFn: async () => {
      const { data, error } = await supabase
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
    <div className="app-mobile-page flex flex-col bg-background">
      <header className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button onClick={() => navigate("/driver/dashboard")} className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted active:scale-95 transition-transform">
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Missions</h1>
          <p className="text-xs text-muted-foreground">Active and completed jobs</p>
        </div>
      </header>

      <div className="flex-1 px-4 pb-24 space-y-3">
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
      </div>
    </div>
  );
}
