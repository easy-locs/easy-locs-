import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import * as repo from "@/repositories/mobility.repository";
import { ArrowLeft, Clock, DollarSign, Package, Camera, ChevronRight, CheckCircle2, Truck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderStatusChip } from "@/components/orders/OrderStatusChip";
import { setOrderStatus } from "@/lib/orders/orderActions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useUiEngine } from "@/hooks/useUiEngine";

const STATUS_FLOW = [
  { key: "driver_assigned", label: "Assigned", action: "Start Pickup" },
  { key: "picked_up", label: "Picked Up", action: "Start Delivery" },
  { key: "on_the_way", label: "On the Way", action: "Mark Delivered" },
  { key: "delivered", label: "Delivered", action: null },
];

export default function DriverMissionDetailPage() {
  useUiEngine("driver-drivermissiondetailpage");
  const navigate = useNavigate();
  const { orderId } = useParams();

  const { data: mission, isLoading, refetch , isError } = useQuery({
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
      toast.success(`Mission updated`);
      refetch();
    } catch (err: any) { toast.error("Could not update mission"); }
  };

  const canAdvance = mission && ["driver_assigned", "picked_up", "on_the_way"].includes(mission.status);
  const currentStepIdx = mission ? STATUS_FLOW.findIndex(s => s.key === mission.status) : -1;
  const nextAction = currentStepIdx >= 0 ? STATUS_FLOW[currentStepIdx]?.action : null;

  return (
    <div className="app-mobile-page flex flex-col bg-background">
      <header className="flex items-center gap-3 px-4 pt-4 pb-3 shrink-0">
        <button onClick={() => navigate("/driver/active-missions")} className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted/60 active:scale-95 transition-transform">
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-foreground tracking-tight">Mission Detail</h1>
          <p className="text-[11px] text-muted-foreground truncate">{orderId ? `#${orderId.slice(0, 8)}` : ""}</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-4 pt-1">
        {isError && <div className="state-container"><p className="text-sm text-destructive">Something went wrong. Please try again.</p></div>}
      {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-12 rounded-2xl" />
          </div>
        )}

        {!isLoading && !mission && (
          <div className="text-center py-16">
            <Package className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-semibold text-foreground">Mission not found</p>
            <p className="text-xs text-muted-foreground mt-1">This mission may have been cancelled or completed</p>
          </div>
        )}

        {!isLoading && mission && (
          <>
            <div className="rounded-2xl border border-border/15 bg-card overflow-hidden">
              <div className="px-4 py-3 flex items-center justify-between border-b border-border/10">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-primary" />
                  <span className="text-sm font-bold text-foreground">Order #{mission.id.slice(0, 8)}</span>
                </div>
                <OrderStatusChip status={mission.status} variant="merchant" />
              </div>

              <div className="p-4 space-y-3">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground">{new Date(mission.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                </div>

                {mission.total_amount != null && (
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="text-sm font-bold text-foreground">{mission.total_amount} {mission.currency || "AED"}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 ml-auto">5% commission</span>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-border/15 bg-card p-4 space-y-3">
              <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">Route</p>
              <div className="space-y-2">
                <div className="flex items-start gap-2.5">
                  <div className="flex flex-col items-center mt-1 shrink-0">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <div className="w-px h-4 bg-border" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase">Pickup</p>
                    <p className="text-xs text-foreground break-words">{mission.pickup_address || mission.delivery_address || "Customer location"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="flex items-center justify-center shrink-0 mt-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase">Dropoff</p>
                    <p className="text-xs text-foreground break-words">{mission.dropoff_address || mission.delivery_address || "Delivery destination"}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border/15 bg-card p-4">
              <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground mb-3">Progress</p>
              <div className="flex items-center gap-1">
                {STATUS_FLOW.map((step, i) => {
                  const isCompleted = i < currentStepIdx;
                  const isCurrent = i === currentStepIdx;
                  return (
                    <div key={step.key} className="flex-1 flex flex-col items-center gap-1.5">
                      <div className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors",
                        isCompleted ? "bg-emerald-500 text-white" :
                        isCurrent ? "bg-primary text-primary-foreground" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                      </div>
                      <span className={cn(
                        "text-[10px] font-semibold text-center leading-tight",
                        isCurrent ? "text-primary" : "text-muted-foreground"
                      )}>{step.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2.5">
              {canAdvance && nextAction && (
                <button onClick={advanceMission} className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3.5 text-sm font-bold active:scale-[0.97] transition-transform shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
                  <ChevronRight className="w-4 h-4" />
                  {nextAction}
                </button>
              )}
              <button onClick={() => navigate(`/driver/proof/${mission.id}`)} className="w-full rounded-2xl bg-card border border-border/15 px-4 py-3 text-sm font-bold text-foreground active:scale-[0.97] transition-transform flex items-center justify-center gap-2">
                <Camera className="w-4 h-4 text-muted-foreground" />
                Upload Delivery Proof
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
