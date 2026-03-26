import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function MerchantBusinessSummaryPage() {
  const navigate = useNavigate();
  const { merchantId = "" } = useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["merchant-business-summary", merchantId],
    queryFn: async () => {
      const [merchantRes, ordersRes, productsRes, promosRes] =
        await Promise.all([
          (supabase as any).from("seed_merchants").select("*").eq("id", merchantId).maybeSingle(),
          (supabase as any).from("orders").select("id,total_amount,status").eq("merchant_id", merchantId).limit(1000),
          (supabase as any).from("seed_products").select("id,is_available,stock_quantity").eq("merchant_id", merchantId).limit(2000),
          (supabase as any).from("seed_merchant_promos").select("id,is_active").eq("merchant_id", merchantId).limit(500),
        ]);

      const merchant = merchantRes?.data;
      const orderRows = ordersRes?.data ?? [];
      const productRows = productsRes?.data ?? [];
      const promoRows = promosRes?.data ?? [];

      return {
        merchant,
        totalOrders: orderRows.length,
        grossSales: orderRows.reduce((sum: number, row: any) => sum + Number(row.total_amount ?? 0), 0),
        completedOrders: orderRows.filter((row: any) => ["completed", "delivered"].includes(String(row.status ?? ""))).length,
        activeOrders: orderRows.filter((row: any) =>
          ["paid", "confirmed", "preparing", "driver_search", "driver_assigned", "picked_up", "on_the_way"].includes(String(row.status ?? ""))
        ).length,
        products: productRows.length,
        availableProducts: productRows.filter((row: any) => !!row.is_available).length,
        lowStock: productRows.filter((row: any) => Number(row.stock_quantity ?? 0) <= 5).length,
        activePromos: promoRows.filter((row: any) => !!row.is_active).length,
      };
    },
    enabled: !!merchantId,
    staleTime: 10000,
  });

  return (
    <div className="app-mobile-page bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate(`/merchant/dashboard/${merchantId}`)}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
        >
          ←
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Business Summary</h1>
          <p className="text-xs text-muted-foreground">{data?.merchant?.name || "Merchant overview"}</p>
        </div>
      </div>

      {isLoading && [1, 2, 3].map((i) => (
        <div key={i} className="mx-4 mb-3 h-16 rounded-2xl bg-muted animate-pulse" />
      ))}

      {!isLoading && data && (
        <div className="grid grid-cols-2 gap-3 px-4">
          <Metric title="Total Orders" value={String(data.totalOrders)} />
          <Metric title="Gross Sales" value={`${data.grossSales.toFixed(2)} AED`} />
          <Metric title="Completed" value={String(data.completedOrders)} />
          <Metric title="Active" value={String(data.activeOrders)} />
          <Metric title="Products" value={String(data.products)} />
          <Metric title="Available" value={String(data.availableProducts)} />
          <Metric title="Low Stock" value={String(data.lowStock)} />
          <Metric title="Active Promos" value={String(data.activePromos)} />
        </div>
      )}
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/20 bg-card p-4">
      <p className="text-[11px] text-muted-foreground">{title}</p>
      <p className="text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}
