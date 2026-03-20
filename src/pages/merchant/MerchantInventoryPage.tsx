import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  bulkRestockMerchant,
  getInventorySnapshot,
  updateProductInventory,
} from "@/lib/inventory/inventoryEngine";

export default function MerchantInventoryPage() {
  const navigate = useNavigate();
  const { merchantId = "" } = useParams();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["merchant-inventory-page", merchantId],
    queryFn: () => getInventorySnapshot(merchantId),
    enabled: !!merchantId,
    staleTime: 5000,
  });

  const setQty = async (productId: string, nextQty: number) => {
    try {
      await updateProductInventory({ productId, stockQuantity: nextQty });
      toast.success("Inventory updated");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Inventory update failed");
    }
  };

  const toggleAvailability = async (productId: string, current: boolean) => {
    try {
      await updateProductInventory({ productId, isAvailable: !current });
      toast.success("Availability updated");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Could not update availability");
    }
  };

  const quickRestock = async () => {
    try {
      const res = await bulkRestockMerchant({ merchantId, quantity: 10 });
      const ok = res.filter((r) => r.ok).length;
      toast.success(`Restocked ${ok} products`);
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Restock failed");
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <header className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button
          onClick={() => navigate(`/merchant/dashboard/${merchantId}`)}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
        >
          ←
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Inventory</h1>
          <p className="text-xs text-muted-foreground">Stock control and availability</p>
        </div>
      </header>

      <button
        onClick={quickRestock}
        className="mx-4 rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold"
      >
        Quick Restock +10
      </button>

      {isLoading && [1, 2, 3].map((i) => (
        <div key={i} className="mx-4 mt-3 h-20 rounded-2xl bg-muted animate-pulse" />
      ))}

      {!isLoading && data && (
        <>
          <div className="grid grid-cols-2 gap-3 px-4 py-4">
            <Metric title="Total" value={String(data.totalProducts)} />
            <Metric title="Available" value={String(data.availableProducts)} />
            <Metric title="Out of Stock" value={String(data.outOfStock)} />
            <Metric title="Low Stock" value={String(data.lowStock)} />
          </div>

          <div className="px-4 pb-24 space-y-3">
            {data.rows.map((row: any) => {
              const qty = Number(row.stock_quantity ?? 0);

              return (
                <div key={row.id} className="rounded-2xl border border-border/20 bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{row.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {row.category || "product"} · {Number(row.price ?? 0).toFixed(2)} AED
                      </p>
                    </div>
                    <button
                      onClick={() => toggleAvailability(row.id, !!row.is_available)}
                      className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                        row.is_available
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {row.is_available ? "Available" : "Hidden"}
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setQty(row.id, Math.max(0, qty - 1))}
                      className="w-9 h-9 rounded-xl bg-muted text-sm font-bold"
                    >
                      -
                    </button>
                    <p className="text-sm font-bold text-foreground">
                      Stock {qty}
                    </p>
                    <button
                      onClick={() => setQty(row.id, qty + 1)}
                      className="w-9 h-9 rounded-xl bg-primary text-primary-foreground text-sm font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
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
