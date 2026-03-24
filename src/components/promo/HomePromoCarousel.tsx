import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listHomePromos } from "@/lib/promo/promoEngine";

export default function HomePromoCarousel() {
  const navigate = useNavigate();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["home-promos"],
    queryFn: () => listHomePromos(8),
    staleTime: 10000,
  });

  if (!isLoading && rows.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
        Active Promotions
      </p>

      {isLoading && (
        <div className="rounded-2xl bg-muted/30 h-36 animate-pulse" />
      )}

      {!isLoading && rows.length > 0 && (
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
          {rows.map((row: any) => (
            <button
              key={row.id}
              onClick={() => navigate(`/s/${row.merchant_id}`)}
              className="min-w-[260px] rounded-2xl overflow-hidden border border-border/20 bg-card text-left active:scale-[0.98] transition-transform"
            >
              <div className="h-24 w-full bg-muted/30">
                {row.seed_merchants?.cover_image ? (
                  <img src={row.seed_merchants.cover_image} alt={row.title} className="w-full h-full object-cover" />
                ) : null}
              </div>

              <div className="p-3 space-y-1">
                <span className="inline-block text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {row.discount_type === "percent"
                    ? `${Number(row.discount_value ?? 0)}% OFF`
                    : `${Number(row.discount_value ?? 0).toFixed(0)} AED OFF`}
                </span>
                <p className="text-sm font-bold text-foreground">{row.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {row.seed_merchants?.name} · Min{" "}
                  {Number(row.minimum_order_amount ?? 0).toFixed(2)} AED
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
