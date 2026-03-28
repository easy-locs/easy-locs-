import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchFirstSeedMerchant, fetchSeedProducts, toggleProductAvailability } from "@/repositories/merchant.repository";
import { toast } from "sonner";
import { formatMoneyByCountry } from "@/lib/currency-engine";

export default function MerchantMenuPage() {
  const navigate = useNavigate();
  const { merchantId } = useParams();
  const [savingId, setSavingId] = useState<string | null>(null);

  const { data: products = [], refetch } = useQuery({
    queryKey: ["merchant-menu-products", merchantId],
    queryFn: async () => {
      let mid = merchantId;
      if (!mid) {
        const data = await fetchFirstSeedMerchant();
        mid = data?.id;
      }
      if (!mid) return [];
      return fetchSeedProducts(mid);
    },
    staleTime: 30_000,
  });

  const toggleAvailabilityHandler = async (product: any) => {
    try {
      setSavingId(product.id);
      await toggleProductAvailability(product.id, !product.is_available);
      toast.success("Availability updated");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Update failed");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/merchant/dashboard")} className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted text-muted-foreground font-bold">
          ←
        </button>
        <h1 className="text-lg font-bold">Menu Management</h1>
      </div>

      <div className="space-y-2">
        {products.length === 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground">No products found</div>
        )}

        {products.map((product: any) => (
          <div key={product.id} className="rounded-2xl border border-border/20 bg-card p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{product.name}</p>
                <p className="text-xs text-muted-foreground">{product.category}</p>
                <p className="text-xs font-bold mt-1">{formatMoneyByCountry(Number(product.price), null, product.currency)}</p>
              </div>
              <button
                onClick={() => toggleAvailabilityHandler(product)}
                disabled={savingId === product.id}
                className={`rounded-full px-3 py-1 text-[11px] font-bold transition-colors ${
                  product.is_available
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {savingId === product.id
                  ? "Saving..."
                  : product.is_available
                    ? "Available"
                    : "Sold out"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
