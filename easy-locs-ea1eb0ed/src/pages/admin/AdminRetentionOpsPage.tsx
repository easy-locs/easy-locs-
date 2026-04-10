import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchRetentionOpsData } from "@/repositories/admin-ops.repository";

export default function AdminRetentionOpsPage() {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-retention-ops"],
    queryFn: async () => {
      const raw = await fetchRetentionOpsData();
      const uniqueCustomers = new Set(raw.orders.map((r: any) => r.customer_user_id).filter(Boolean));
      const completedCustomers = new Set(
        raw.orders.filter((r: any) => ["completed", "delivered"].includes(String(r.status ?? ""))).map((r: any) => r.customer_user_id).filter(Boolean)
      );
      return {
        customers: uniqueCustomers.size,
        completedCustomers: completedCustomers.size,
        favoritesUsers: new Set(raw.favorites.map((r: any) => r.user_id).filter(Boolean)).size,
        loyaltyUsers: raw.loyalty.length,
        searchUsers: new Set(raw.searches.map((r: any) => r.entity_id).filter(Boolean)).size,
        totalRevenue: raw.orders.reduce((sum: number, row: any) => sum + Number(row.total_amount ?? 0), 0),
      };
    },
    staleTime: 10000,
  });

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <header className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Retention Ops</h1>
          <p className="text-xs text-muted-foreground">Repeat usage and retention signals</p>
        </div>
      </header>
      {isLoading && [1, 2, 3].map((i) => <div key={i} className="mx-4 mt-3 h-16 rounded-2xl bg-muted animate-pulse" />)}
      {!isLoading && data && (
        <div className="grid grid-cols-2 gap-3 px-4 py-4">
          <Metric title="Customers" value={String(data.customers)} />
          <Metric title="Completed" value={String(data.completedCustomers)} />
          <Metric title="Favorites Users" value={String(data.favoritesUsers)} />
          <Metric title="Loyalty Users" value={String(data.loyaltyUsers)} />
          <Metric title="Search Users" value={String(data.searchUsers)} />
          <Metric title="Revenue" value={`${Number(data.totalRevenue).toFixed(2)} AED`} />
        </div>
      )}
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/20 bg-card p-4">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}
