import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { getReorderSuggestions } from "@/lib/reorder/reorderEngine";

export default function ReorderSection() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["reorder-suggestions", user?.id],
    queryFn: () => getReorderSuggestions(user!.id),
    enabled: !!user?.id,
    staleTime: 15000,
  });

  if (!user?.id) return null;
  if (!isLoading && rows.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
        Reorder Fast
      </p>

      {isLoading && [1, 2].map((i) => (
        <div key={i} className="rounded-2xl bg-muted/30 h-20 animate-pulse" />
      ))}

      {!isLoading && rows.length > 0 && (
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
          {rows.map((row: any) => (
            <button
              key={row.order.id}
              onClick={() => navigate(`/order/reorder/${row.order.id}`)}
              className="min-w-[220px] rounded-2xl border border-border/20 bg-card p-4 text-left active:scale-[0.98] transition-transform"
            >
              <p className="text-sm font-bold text-foreground">Order #{String(row.order.id).slice(0, 8)}</p>
              <p className="text-xs text-muted-foreground mt-1">{row.label || "Previous order"}</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {row.totalItems} items · {new Intl.NumberFormat(undefined, { style: "currency", currency: row.order.currency || "AED", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(row.order.total_amount ?? 0))}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
