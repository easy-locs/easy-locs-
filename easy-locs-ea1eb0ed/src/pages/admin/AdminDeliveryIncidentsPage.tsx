import { db } from "@/services/db";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

export default function AdminDeliveryIncidentsPage() {
  const navigate = useNavigate();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-delivery-incidents"],
    queryFn: async () => {
      const { data, error } = await db
        .from("orders")
        .select("*")
        .in("status", ["disputed", "cancelled"])
        .order("updated_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      return (data ?? []) as any[];
    },
    staleTime: 5000,
  });

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate("/admin")}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
        >
          ←
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Delivery Incidents</h1>
          <p className="text-xs text-muted-foreground">Cancelled and disputed order watch</p>
        </div>
      </div>

      {isLoading && [1, 2].map((i) => (
        <div key={i} className="mx-4 mb-3 h-20 rounded-2xl bg-muted animate-pulse" />
      ))}

      {!isLoading && rows.length === 0 && (
        <div className="px-4 py-12 text-center text-sm text-muted-foreground">
          No delivery incidents
        </div>
      )}

      {!isLoading && rows.length > 0 && (
        <div className="px-4 space-y-3">
          {rows.map((row: any) => (
            <div key={row.id} className="rounded-2xl border border-border/20 bg-card p-4">
              <p className="text-sm font-bold text-foreground">Order #{String(row.id).slice(0, 8)}</p>
              <p className="text-xs text-destructive font-semibold mt-1">
                Status {row.status}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Total {Number(row.total_amount ?? 0).toFixed(2)} {row.currency ?? "AED"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
