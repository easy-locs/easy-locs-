import { useQuery } from "@tanstack/react-query";
import { getOrderTimeline } from "@/lib/orders/orderTimelineEngine";

export default function OrderTimeline({ orderId }: { orderId: string }) {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["order-timeline", orderId],
    queryFn: () => getOrderTimeline(orderId),
    enabled: !!orderId,
    staleTime: 5000,
  });

  return (
    <div className="space-y-3">
      <p className="text-sm font-bold text-foreground">Order Timeline</p>

      {isLoading && [1, 2, 3].map((i) => (
        <div key={i} className="h-10 rounded-xl bg-muted animate-pulse" />
      ))}

      {!isLoading && rows.length === 0 && (
        <p className="text-xs text-muted-foreground">No timeline yet</p>
      )}

      {!isLoading && rows.length > 0 && (
        <div className="space-y-2">
          {rows.map((row, idx) => (
            <div key={`${row.key}-${idx}`} className="flex gap-3">
              <div className="w-2 h-2 mt-1.5 rounded-full bg-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{row.label}</p>
                {row.description ? (
                  <p className="text-[0.6875rem] text-muted-foreground">{row.description}</p>
                ) : null}
                <p className="text-[0.625rem] text-muted-foreground">
                  {new Date(row.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
