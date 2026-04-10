import { useQuery } from "@tanstack/react-query";
import { listMerchantReviews } from "@/lib/reviews/reviewEngine";

export default function ReviewList({ merchantId }: { merchantId: string }) {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["merchant-reviews", merchantId],
    queryFn: () => listMerchantReviews(merchantId),
    enabled: !!merchantId,
    staleTime: 5000,
  });

  return (
    <div className="space-y-3">
      <p className="text-sm font-bold text-foreground">Customer Reviews</p>

      {isLoading && [1, 2].map((i) => (
        <div key={i} className="rounded-2xl bg-muted/30 h-20 animate-pulse" />
      ))}

      {!isLoading && rows.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-6">
          No reviews yet
        </p>
      )}

      {!isLoading && rows.length > 0 && (
        <div className="space-y-3">
          {rows.map((row: any) => (
            <div key={row.id} className="rounded-2xl border border-border/20 bg-card p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-amber-500">
                    {"⭐".repeat(Math.max(1, Math.min(5, Number(row.rating ?? 0))))}
                  </p>
                  {row.title && <p className="text-sm font-bold text-foreground">{row.title}</p>}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {row.created_at ? new Date(row.created_at).toLocaleDateString() : ""}
                </p>
              </div>

              {row.comment && (
                <p className="text-xs text-muted-foreground">
                  {row.comment}
                </p>
              )}

              {row.merchant_reply && (
                <div className="rounded-xl bg-muted/30 p-3 space-y-1">
                  <p className="text-[10px] font-bold text-muted-foreground">Merchant reply</p>
                  <p className="text-xs text-foreground">{row.merchant_reply}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
