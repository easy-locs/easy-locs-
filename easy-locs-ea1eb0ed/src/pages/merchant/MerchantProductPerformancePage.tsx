import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchSeedProductsByMerchant, fetchOrderItems } from "@/repositories/merchant.repository";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";

export default function MerchantProductPerformancePage() {
  useUiEngine("merchant-merchantproductperformancepage");
  const navigate = useNavigate();
  const { merchantId = "" } = useParams();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["merchant-product-performance", merchantId],
    queryFn: async () => {
      const [products, orderItems] = await Promise.all([
        fetchSeedProductsByMerchant(merchantId),
        fetchOrderItems(5000),
      ]);
      const items = orderItems ?? [];
      const rows = (products ?? []).map((product: any) => {
        const linked = items.filter((item: any) => String(item.menu_item_id ?? item.id) === String(product.id));
        const qty = linked.reduce((sum: number, row: any) => sum + Number(row.quantity ?? 0), 0);
        const revenue = linked.reduce((sum: number, row: any) => sum + Number(row.quantity ?? 0) * Number(row.unit_price ?? 0), 0);
        return { id: product.id, name: product.name, qty, revenue, available: !!product.is_available };
      });
      return rows.sort((a: any, b: any) => b.revenue - a.revenue);
    },
    enabled: !!merchantId,
    staleTime: 10000,
  });

  return (
    <SubPageShell title="Product Performance" subtitle="Top selling product snapshot" onBack={() => navigate(`/merchant/dashboard/${merchantId}`)} noContentPad>
      {isError && (
        <div className="px-4 py-4">
          <p className="text-sm text-destructive">Something went wrong. Please try again.</p>
        </div>
      )}
      {isLoading && [1, 2].map((i) => (
        <div key={i} className="mx-4 mb-3 h-16 rounded-2xl bg-muted animate-pulse" />
      ))}

      {!isLoading && data && (
        <div className="px-4 space-y-3">
          {data.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No product data yet</p>
          ) : (
            data.slice(0, 30).map((row: any) => (
              <div key={row.id} className="rounded-2xl border border-border/20 bg-card p-4">
                <p className="text-sm font-semibold text-foreground">{row.name}</p>
                <p className="text-xs text-muted-foreground">Sold {row.qty} · Revenue {Number(row.revenue).toFixed(2)} AED</p>
                <p className={`text-[0.6875rem] font-bold mt-1 ${row.available ? "text-emerald-500" : "text-muted-foreground"}`}>
                  {row.available ? "Available" : "Unavailable"}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </SubPageShell>
  );
}
