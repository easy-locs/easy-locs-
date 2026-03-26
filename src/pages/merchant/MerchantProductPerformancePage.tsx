import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function MerchantProductPerformancePage() {
  const navigate = useNavigate();
  const { merchantId = "" } = useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["merchant-product-performance", merchantId],
    queryFn: async () => {
      const [{ data: products }, { data: orderItems }] = await Promise.all([
        (supabase as any).from("seed_products").select("*").eq("merchant_id", merchantId).limit(1000),
        supabase.from("order_items").select("*").limit(5000),
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
    <div className="app-mobile-page bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => navigate(`/merchant/dashboard/${merchantId}`)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Product Performance</h1>
          <p className="text-xs text-muted-foreground">Top selling product snapshot</p>
        </div>
      </div>

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
                <p className={`text-[11px] font-bold mt-1 ${row.available ? "text-emerald-500" : "text-muted-foreground"}`}>
                  {row.available ? "Available" : "Unavailable"}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
