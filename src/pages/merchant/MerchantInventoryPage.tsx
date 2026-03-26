import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function MerchantInventoryPage() {
  const navigate = useNavigate();
  const { merchantId = "" } = useParams();
  const [savingId, setSavingId] = useState<string | null>(null);

  const { data: rows = [], isLoading, refetch } = useQuery({
    queryKey: ["merchant-inventory-page", merchantId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("seed_products")
        .select("*")
        .eq("merchant_id", merchantId)
        .order("sort_order", { ascending: true })
        .limit(500);

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!merchantId,
    staleTime: 5000,
  });

  const patchStock = async (row: any, nextQty: number) => {
    try {
      setSavingId(row.id);
      const { error } = await (supabase as any)
        .from("seed_products")
        .update({
          stock_quantity: Math.max(0, nextQty),
          is_available: Math.max(0, nextQty) > 0,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);

      if (error) throw error;
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Could not update stock");
    } finally {
      setSavingId(null);
    }
  };

  const lowStock = rows.filter((r: any) => Number(r.stock_quantity ?? 0) <= 5).length;
  const outOfStock = rows.filter((r: any) => Number(r.stock_quantity ?? 0) <= 0).length;

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
          <h1 className="text-lg font-bold text-foreground">Inventory</h1>
          <p className="text-xs text-muted-foreground">Stock and availability control</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 px-4 pb-4">
        <Metric title="Low Stock" value={String(lowStock)} />
        <Metric title="Out of Stock" value={String(outOfStock)} />
      </div>

      {isLoading && [1, 2, 3].map((i) => (
        <div key={i} className="mx-4 mb-3 h-24 rounded-2xl bg-muted animate-pulse" />
      ))}

      {!isLoading && rows.length === 0 && (
        <div className="px-4 py-12 text-center text-sm text-muted-foreground">
          No products found
        </div>
      )}

      {!isLoading && rows.length > 0 && (
        <div className="px-4 space-y-3">
          {rows.map((row: any) => {
            const qty = Number(row.stock_quantity ?? 0);
            return (
              <div key={row.id} className="rounded-2xl border border-border/20 bg-card p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-foreground">{row.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.category || "Product"} · {Number(row.price ?? 0).toFixed(2)} AED
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Stock {qty} · {qty > 0 ? "Available" : "Sold out"}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    qty <= 0
                      ? "bg-destructive/10 text-destructive"
                      : qty <= 5
                        ? "bg-amber-500/10 text-amber-500"
                        : "bg-emerald-500/10 text-emerald-400"
                  }`}>
                    {qty <= 0 ? "Empty" : qty <= 5 ? "Low" : "Good"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => patchStock(row, qty - 1)}
                    disabled={savingId === row.id}
                    className="rounded-xl bg-muted px-3 py-2 text-xs font-bold"
                  >
                    -1
                  </button>
                  <button
                    onClick={() => patchStock(row, qty + 1)}
                    disabled={savingId === row.id}
                    className="rounded-xl bg-muted px-3 py-2 text-xs font-bold"
                  >
                    +1
                  </button>
                  <button
                    onClick={() => patchStock(row, 0)}
                    disabled={savingId === row.id}
                    className="rounded-xl bg-destructive/10 text-destructive px-3 py-2 text-xs font-bold"
                  >
                    Clear
                  </button>
                </div>
              </div>
            );
          })}
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
