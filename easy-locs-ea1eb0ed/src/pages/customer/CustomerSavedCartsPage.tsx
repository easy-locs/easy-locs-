import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { listSavedCarts, deleteSavedCart } from "@/lib/cart/savedCarts";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";
import { formatMoneyByCountry } from "@/lib/currency-engine";

export default function CustomerSavedCartsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addItem, clearCart } = useCart();

  const { data: rows = [], isLoading, refetch } = useQuery({
    queryKey: ["saved-carts", user?.id],
    queryFn: () => listSavedCarts(user!.id),
    enabled: !!user?.id,
    staleTime: 5000,
  });

  const restoreCart = async (row: any) => {
    try {
      clearCart();
      const items = Array.isArray(row.items_json) ? row.items_json : [];
      for (const item of items) {
        addItem(
          {
            id: row.merchant_id ?? "merchant",
            name: row.merchant_name ?? "Merchant",
            image: null,
          },
          {
            menuItemId: item.menuItemId ?? item.menu_item_id ?? null,
            name: item.name,
            description: item.notes ?? null,
            imageUrl: null,
            unitPrice: Number(item.unitPrice ?? item.unit_price ?? 0),
          }
        );
      }
      toast.success("Saved cart restored");
      navigate("/checkout");
    } catch (e: any) {
      toast.error(e.message || "Could not restore saved cart");
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteSavedCart(id);
      toast.success("Saved cart removed");
      refetch();
    } catch (e: any) {
      toast.error(e.message || "Could not delete saved cart");
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="Saved Carts" subtitle="Restore previous carts" onBack={() => navigate("/me")} />

      {isLoading && [1, 2, 3].map((i) => <SkeletonCard key={i} />)}

      {!isLoading && rows.length === 0 && (
        <EmptyState title="No saved carts" description="Save a cart during checkout to see it here" />
      )}

      {!isLoading && rows.length > 0 && (
        <div className="space-y-3">
          {rows.map((row: any) => {
            const items = Array.isArray(row.items_json) ? row.items_json : [];
            const total = items.reduce(
              (sum: number, item: any) =>
                sum + Number(item.quantity ?? 0) * Number(item.unitPrice ?? item.unit_price ?? 0),
              0
            );

            return (
              <div key={row.id} className="rounded-[28px] border border-border/20 bg-card p-4">
                <div className="text-sm font-bold">{row.label || "Saved cart"}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {row.merchant_name || "Merchant"} · {items.length} items
                </div>
                <div className="text-sm font-semibold mt-2">{formatMoneyByCountry(total, row.country, row.currency)}</div>

                <div className="grid grid-cols-2 gap-2 mt-3">
                  <button onClick={() => restoreCart(row)} className="rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold">
                    Restore
                  </button>
                  <button onClick={() => remove(row.id)} className="rounded-2xl bg-muted px-4 py-3 text-sm font-bold text-foreground">
                    Delete
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

function Header({ title, subtitle, onBack }: { title: string; subtitle: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <button onClick={onBack} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
      <div>
        <h1 className="text-lg font-bold">{title}</h1>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[28px] border border-border/20 bg-card p-6 text-center">
      <div className="text-3xl">🛒</div>
      <div className="text-base font-bold mt-3">{title}</div>
      <div className="text-sm text-muted-foreground mt-2">{description}</div>
    </div>
  );
}

function SkeletonCard() {
  return <div className="h-28 rounded-[28px] bg-muted animate-pulse" />;
}
