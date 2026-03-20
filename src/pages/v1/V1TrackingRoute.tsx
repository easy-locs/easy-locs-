import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { V1PrimaryAppBridge } from "@/components/v1/V1PrimaryAppBridge";
import { getV1OrderTracking } from "@/lib/v1/customerOrderFlow";
import { getV1CustomerTrackingLabel } from "@/lib/v1/v1OrderStatusView";

function TrackingBody() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const { data: order, isLoading, refetch } = useQuery({
    queryKey: ["v1-tracking-order", orderId],
    queryFn: () => getV1OrderTracking(orderId!),
    enabled: !!orderId,
    staleTime: 5_000,
    refetchInterval: 10_000,
  });

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center">
        ←
      </button>

      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">Order Tracking</h1>
        <span className="text-xs text-muted-foreground">
          {orderId ? `#${orderId.slice(0, 8)}` : ""}
        </span>
      </div>

      {isLoading && <div className="h-32 rounded-[28px] bg-muted/40 animate-pulse" />}

      {!isLoading && !order && (
        <div className="rounded-[28px] border border-border/20 bg-card p-6 text-center">
          <p className="text-muted-foreground">Order not found</p>
        </div>
      )}

      {!isLoading && order && (
        <>
          <div className="rounded-[28px] border border-border/20 bg-card p-5 space-y-2">
            <p className="text-xl font-bold text-foreground">{getV1CustomerTrackingLabel(order.status)}</p>
            <p className="text-sm text-muted-foreground">
              Total: {Number(order.total_amount ?? 0).toFixed(2)} {order.currency ?? "AED"}
            </p>
            <p className="text-sm text-muted-foreground">
              Payment: {String(order.payment_status ?? "unpaid")}
            </p>
            <p className="text-xs text-muted-foreground">
              Updated: {order.updated_at ? new Date(order.updated_at).toLocaleString() : ""}
            </p>
          </div>

          <button onClick={() => refetch()} className="w-full rounded-[24px] bg-primary text-primary-foreground px-4 py-3 font-bold">
            Refresh Tracking
          </button>
        </>
      )}
    </div>
  );
}

export default function V1TrackingRoute() {
  return (
    <V1PrimaryAppBridge module="home">
      {() => <TrackingBody />}
    </V1PrimaryAppBridge>
  );
}
