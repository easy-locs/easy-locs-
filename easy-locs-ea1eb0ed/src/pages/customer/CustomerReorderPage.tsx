import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { fetchReorderCandidates } from "@/repositories/customer-orders.repository";
import { toast } from "sonner";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";

export default function CustomerReorderPage() {
  useUiEngine("customer-customerreorderpage");
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ["customer-reorder", user?.id],
    queryFn: () => fetchReorderCandidates(user?.id),
    enabled: !!user?.id,
    staleTime: 10000,
  });

  const reorder = (orderId: string) => {
    toast.success("Reorder initiated");
    navigate(`/checkout?reorder=${orderId}`);
  };

  return (
    <SubPageShell title="Reorder" subtitle="1-click repeat past orders" onBack={() => navigate("/my-orders")} noContentPad>
      {isError && (
        <div className="px-4 py-4">
          <p className="text-sm text-destructive">Something went wrong. Please try again.</p>
        </div>
      )}
      {isLoading && [1, 2].map((i) => (
        <div key={i} className="mx-4 mb-3 h-16 rounded-2xl bg-muted animate-pulse" />
      ))}

      {!isLoading && rows.length === 0 && (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">No completed orders to reorder</p>
      )}

      {!isLoading && rows.length > 0 && (
        <div className="px-4 space-y-3">
          {rows.map((row: any) => (
            <div key={row.id} className="rounded-2xl border border-border/20 bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">Order #{String(row.id).slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">{Number(row.total_amount ?? 0).toFixed(2)} {row.currency ?? ""}</p>
                  <p className="text-[11px] text-muted-foreground/70">{row.created_at ? new Date(row.created_at).toLocaleString() : ""}</p>
                </div>
                <button
                  onClick={() => reorder(row.id)}
                  className="rounded-xl bg-primary text-primary-foreground px-4 py-2 text-xs font-bold active:scale-95 transition-transform"
                >
                  Reorder
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </SubPageShell>
  );
}
