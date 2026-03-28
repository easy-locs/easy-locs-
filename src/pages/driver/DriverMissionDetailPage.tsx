import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import * as repo from "@/repositories/mobility.repository";
import { ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderStatusChip } from "@/components/orders/OrderStatusChip";
import { setOrderStatus } from "@/lib/orders/orderActions";
import { toast } from "sonner";

export default function DriverMissionDetailPage() {
  const navigate = useNavigate();
  const { orderId } = useParams();

  const { data: mission, isLoading, refetch } = useQuery({
    queryKey: ["driver-mission-detail", orderId],
    enabled: !!orderId,
    queryFn: () => repo.fetchOrderById(orderId!),
    staleTime: 10_000,
  });

  const advanceMission = async () => {
    if (!mission) return;
    const nextMap: Record<string, string> = { driver_assigned: "picked_up", picked_up: "on_the_way", on_the_way: "delivered" };
    const next = nextMap[mission.status];
    if (!next) return;
    try {
      await setOrderStatus({ orderId: mission.id, currentStatus: mission.status as any, nextStatus: next as any });
      toast.success(`Mission moved to ${next}`);
      refetch();
    } catch (err: any) { toast.error(err.message || "Could not update mission"); }
  };

  const canAdvance = mission && ["driver_assigned", "picked_up", "on_the_way"].includes(mission.status);

  return (
    <div className="app-mobile-page flex flex-col bg-background">
      <header className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button onClick={() => navigate("/driver/missions")} className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted active:scale-95 transition-transform">
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Mission Detail</h1>
          <p className="text-xs text-muted-foreground">{orderId ? `#${orderId.slice(0, 8)}` : ""}</p>
        </div>
      </header>
      <div className="flex-1 px-4 pb-24 space-y-4">
        {isLoading && <Skeleton className="h-40 rounded-2xl" />}
        {!isLoading && !mission && <div className="text-center py-16 text-sm text-muted-foreground">Mission not found</div>}
        {!isLoading && mission && (
          <>
            <div className="rounded-2xl border border-border/20 bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-foreground">Order #{mission.id.slice(0, 8)}</p>
                <OrderStatusChip status={mission.status} variant="merchant" />
              </div>
              <p className="text-xs text-muted-foreground">Pickup: Dubai placeholder</p>
              <p className="text-xs text-muted-foreground">Dropoff: Dubai placeholder</p>
              <p className="text-xs text-muted-foreground">Created: {new Date(mission.created_at).toLocaleString()}</p>
            </div>
            <div className="space-y-3">
              {canAdvance && (
                <button onClick={advanceMission} className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold active:scale-[0.97] transition-transform">
                  Advance Status
                </button>
              )}
              <button onClick={() => navigate(`/driver/proof/${mission.id}`)} className="w-full rounded-2xl bg-muted px-4 py-3 text-sm font-bold text-foreground active:scale-[0.97] transition-transform">
                Delivery Proof
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
