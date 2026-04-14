import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { listOrderItems } from "@/lib/reorder/reorderEngine";
import { fetchOrderById } from "@/repositories/customer-orders.repository";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";
import { Loader2, ShoppingCart, AlertCircle, RotateCcw } from "lucide-react";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";

export default function ReorderPage() {
  useUiEngine("reorder");
  const navigate = useNavigate();
  const { orderId } = useParams();
  const { addItem } = useCart();
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const [itemCount, setItemCount] = useState(0);
  const [step, setStep] = useState<"fetching" | "adding" | "done" | "error">("fetching");

  useEffect(() => {
    let live = true;

    const run = async () => {
      if (!orderId) return;

      try {
        setStep("fetching");
        const order = await fetchOrderById(orderId);
        if (!order) throw new Error("not_found");

        const items = await listOrderItems(orderId);
        if (!live) return;

        setStep("adding");
        setItemCount(items.length);

        for (const item of items) {
          addItem(
            {
              id: (order as any).merchant_id,
              name: (order as any).merchant_name || "Merchant",
              image: null,
            },
            {
              menuItemId: (item as any).menu_item_id ?? item.id,
              name: (item as any).item_name || (item as any).name || "Item",
              description: (item as any).notes ?? null,
              imageUrl: null,
              unitPrice: Number((item as any).unit_price ?? (item as any).price ?? 0),
            }
          );
        }

        if (live) {
          setStep("done");
          setDone(true);
          toast.success(`${items.length} items added to cart`);
          setTimeout(() => navigate("/checkout"), 600);
        }
      } catch {
        if (live) {
          setStep("error");
          toast.error("Unable to prepare your reorder. Please try again.");
        }
      } finally {
        if (live) setLoading(false);
      }
    };

    run();
    return () => { live = false; };
  }, [orderId]);

  return (
    <SubPageShell noContentPad className="flex flex-col items-center justify-center gap-4 px-6">
      {step === "fetching" && (
        <>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-primary/10">
            <ShoppingCart className="w-7 h-7 text-primary" />
          </div>
          <div className="space-y-3 w-full max-w-xs">
            <div className="h-4 w-3/4 mx-auto rounded-full animate-pulse bg-muted" />
            <div className="h-3 w-1/2 mx-auto rounded-full animate-pulse bg-muted" />
          </div>
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mt-2" />
          <p className="text-sm text-muted-foreground">Loading your previous order…</p>
        </>
      )}

      {step === "adding" && (
        <>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-primary/10">
            <ShoppingCart className="w-7 h-7 text-primary" />
          </div>
          <Loader2 className="h-5 w-5 animate-spin text-primary mt-2" />
          <p className="text-sm font-medium">Adding {itemCount} items to cart…</p>
        </>
      )}

      {step === "done" && (
        <>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "hsl(150 60% 45% / 0.1)" }}>
            <ShoppingCart className="w-7 h-7" style={{ color: "hsl(150 60% 45%)" }} />
          </div>
          <p className="text-sm font-medium text-foreground">Cart ready — redirecting…</p>
        </>
      )}

      {step === "error" && (
        <>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "hsl(var(--destructive) / 0.1)" }}>
            <AlertCircle className="w-7 h-7 text-destructive" />
          </div>
          <p className="text-sm font-medium text-foreground">Could not prepare your reorder</p>
          <p className="text-xs text-muted-foreground text-center">The order may no longer be available or the merchant is offline.</p>
          <button
            onClick={() => { setLoading(true); setStep("fetching"); window.location.reload(); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium mt-2"
            style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
          >
            <RotateCcw className="w-4 h-4" />
            Try again
          </button>
        </>
      )}
    </SubPageShell>
  );
}
