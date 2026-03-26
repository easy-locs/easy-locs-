import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function MerchantInventoryAlertsPage() {
  const navigate = useNavigate();
  const { merchantId = "" } = useParams();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["merchant-inventory-alerts", merchantId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("seed_products")
        .select("*")
        .eq("merchant_id", merchantId)
        .order("name", { ascending: true });

      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!merchantId,
    staleTime: 10000,
  });

  const lowStock = rows.filter((r: any) => Number(r.stock_quantity ?? 0) <= 5);
  const outOfStock = rows.filter((r: any) => Number(r.stock_quantity ?? 0) <= 0);

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
          <h1 className="text-lg font-bold text-foreground">Inventory Alerts</h1>
          <p className="text-xs text-muted-foreground">Low stock and sold out products</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 px-4 pb-4">
        <Metric title="Low Stock" value={String(lowStock.length)} />
        <Metric title="Out of Stock" value={String(outOfStock.length)} />
      </div>

      {isLoading && [1, 2, 3].map((i) => (
        <div key={i} className="mx-4 mb-3 h-20 rounded-2xl bg-muted animate-pulse" />
      ))}

      {!isLoading && rows.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No inventory data yet</p>
      )}

      {!isLoading && rows.length > 0 && (
        <div className="px-4 space-y-3">
          {rows
            .filter((row: any) => Number(row.stock_quantity ?? 0) <= 5)
            .map((row: any) => (
              <div key={row.id} className="rounded-2xl border border-border/20 bg-card p-4">
                <p className="text-sm font-bold text-foreground">{row.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Stock {Number(row.stock_quantity ?? 0)}
                </p>
                <span className={`inline-block mt-2 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                  Number(row.stock_quantity ?? 0) <= 0
                    ? "bg-destructive/10 text-destructive"
                    : "bg-amber-500/10 text-amber-500"
                }`}>
                  {Number(row.stock_quantity ?? 0) <= 0 ? "Sold Out" : "Low Stock"}
                </span>
              </div>
            ))}
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
