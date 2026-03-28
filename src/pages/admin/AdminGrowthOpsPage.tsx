import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchGrowthOpsData } from "@/repositories/admin-ops.repository";

export default function AdminGrowthOpsPage() {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-growth-ops"],
    queryFn: async () => {
      const raw = await fetchGrowthOpsData();
      const count = (key: string) => raw.events.filter((r: any) => r.event_type === key).length;
      return {
        merchants: raw.merchants.length,
        featuredMerchants: raw.merchants.filter((r: any) => !!r.is_featured).length,
        activePromos: raw.promos.filter((r: any) => !!r.is_active).length,
        favorites: raw.favorites.length,
        homeViews: count("home_view"),
        merchantViews: count("merchant_view"),
        addToCart: count("product_add_to_cart"),
        orders: count("order_created"),
      };
    },
    staleTime: 10000,
  });

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Growth Ops</h1>
          <p className="text-xs text-muted-foreground">Acquisition and conversion overview</p>
        </div>
      </div>
      {isLoading && [1, 2, 3].map((i) => <div key={i} className="mx-4 mb-3 h-16 rounded-2xl bg-muted animate-pulse" />)}
      {!isLoading && data && (
        <div className="grid grid-cols-2 gap-3 px-4">
          <Metric title="Merchants" value={String(data.merchants)} />
          <Metric title="Featured" value={String(data.featuredMerchants)} />
          <Metric title="Active Promos" value={String(data.activePromos)} />
          <Metric title="Favorites" value={String(data.favorites)} />
          <Metric title="Home Views" value={String(data.homeViews)} />
          <Metric title="Merchant Views" value={String(data.merchantViews)} />
          <Metric title="Add to Cart" value={String(data.addToCart)} />
          <Metric title="Orders" value={String(data.orders)} />
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
